
import { MidiClip, NoteEvent } from "../clips/MidiClip";
import { EffectPlugin } from "../effects/effect_interface";
import { UseList_Heap } from "../performance/allocators/free_list";
import { LiveStruct, struct } from "../performance/allocators/structs";
import { AOPluginType, AudioOutputPlugin } from "./plugin_interface";




interface OscillatorTemplate {
    wavetables: Float32Array[],
    getSample(phase: number, freq: number): { sample: number, new_phase: number };
}

const Voice = struct({
    pitch: 'u8',
    velocity: 'u8',
    startTime: 'u32',
    done: 'bool',
    instance: 'u32',
    oscillatorPtr: 'u16',  // index into oscillator table
    modulatorsPtr: 'u16',   // index into modulator table
    freq: 'f32',
    phase: 'f32',
});

interface _VoiceInterface {
    pitch: number;
    velocity: number;
    startTime: number;
    done: boolean;
    instance: number;
    oscillatorPtr: number;
    modulatorsPtr: number;
    freq: number;
    phase: number;
}


// const sqpo = {
//     wavetables: [
//         new Float32Array(2048).map((_, i, arr) => (i < arr.length / 2 ? 1 : -1))
//     ],
//     getSample(phase: number, freq: number) {
//         const table = this.wavetables[0];
//         const len = table.length;
//         const index = phase * len;
//         const i1 = Math.floor(index);
//         const frac = index - i1;

//         // wrap indices safely
//         const i0 = (i1 - 1 + len) % len;
//         const i2 = i1;
//         const i3 = (i1 + 1) % len;
//         const i4 = (i1 + 2) % len;

//         // cubic Hermite interpolation
//         const y0 = table[i0], y1 = table[i2], y2 = table[i3], y3 = table[i4];
//         const c0 = y1;
//         const c1 = 0.5 * (y2 - y0);
//         const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
//         const c3 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;

//         const sample = ((c3 * frac + c2) * frac + c1) * frac + c0;

//         // advance phase externally
//         const newPhase = phase + freq / 44100;
//         const wrappedPhase = newPhase >= 1 ? newPhase - 1 : newPhase;

//         return { sample, new_phase: wrappedPhase };
//     }

// }

// Define the square oscillator with linear interpolation
const sqpo = {
    wavetables: [
        new Float32Array(2048).map((_, i, arr) => (i < arr.length / 2 ? 1 : -1))
    ],
    getSample(phase: number, freq: number) {
        const table = this.wavetables[0];
        const len = table.length;

        // convert normalized phase to table index
        let tablePhase = phase * len;

        // advance phase according to frequency (in table indices)
        tablePhase += (freq / 44100) * len;
        tablePhase %= len; // wrap around

        // cubic Hermite interpolation
        const i1 = Math.floor(tablePhase);
        const frac = tablePhase - i1;

        // wrap indices safely
        const i0 = (i1 - 1 + len) % len;
        const i2 = i1;
        const i3 = (i1 + 1) % len;
        const i4 = (i1 + 2) % len;

        const y0 = table[i0], y1 = table[i2], y2 = table[i3], y3 = table[i4];

        const c0 = y1;
        const c1 = 0.5 * (y2 - y0);
        const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
        const c3 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;

        const sample = ((c3 * frac + c2) * frac + c1) * frac + c0;

        // convert back to normalized phase for next call
        const newPhase = tablePhase / len;

        return { sample, new_phase: newPhase };
    }
};




export class Square implements AudioOutputPlugin {
    wantsMic: boolean;
    pluginName: string;
    type: AOPluginType;
    effects: EffectPlugin[];
    parameters: Record<string, any>;

    //user defined
    object_allocator: UseList_Heap;
    objects: Record<string, Uint8Array & { ptr: number }>;
    midiClips: MidiClip[];
    voiceLookup: Record<number, LiveStruct>;
    flatNotes: LiveStruct[];
    oscillators: OscillatorTemplate[];
    dv_lanes: Record<number, number>;

    constructor() {
        this.wantsMic = false;
        this.pluginName = "2hp";
        this.type = AOPluginType.JS;
        this.effects = [];
        this.object_allocator = new UseList_Heap(1024 * 1024 * 12); //12 mb mem
        this.objects = {};
        this.parameters = {};
        this.midiClips = [];
        this.voiceLookup = {};
        this.flatNotes = [];
        this.oscillators = [sqpo];
        this.dv_lanes = {};
    }

    note_processed(lane: number, inst: number): boolean {
        if (typeof this.dv_lanes[lane] == "undefined") {
            this.dv_lanes[lane] = 0
            return false;
        }

        return inst <= this.dv_lanes[lane];
    }

    createObject(name: string, bytes: number): Uint8Array & { ptr: number } {
        const region = this.object_allocator.malloc(bytes);
        this.objects[name] = region;
        return region
    }

    computeFlatNotes(): void {
        this.flatNotes = this.midiClips.flatMap(c => c.notes);
    }

    addMidiClip(c: MidiClip): void {
        this.midiClips.push(c);
        this.computeFlatNotes();
    }
    /**
     * 
     * @param name the regions name
     * @param u8a  u8a must be the same length as the original buf
     */
    setObject(name: string, u8a: Uint8Array) {
        this.objects[name].set(u8a, 0)
    }

    accessObject(name: string) {
        return this.objects[name]
    }

    freeObject(name: string) {
        this.object_allocator.free(this.objects[name])
        return delete this.objects[name]
    }

    /**
     * Fill arr with 128 samples starting at the given absolute sample index
     */
    _process128(arr: Float32Array, startSample: number): void {

        for (let i = 0; i < this.flatNotes.length; i++) {
            if (startSample >= this.flatNotes[i].startTime) {
                if (this.flatNotes[i].setsOn && !this.note_processed(this.flatNotes[i].lane, this.flatNotes[i].instance)) {
                    this.voiceLookup[this.flatNotes[i].instance] = this.object_allocator.new(Voice, {
                        pitch: this.flatNotes[i].pitch,
                        freq: 440 * 2 ** ((this.flatNotes[i].pitch - 69) / 12),
                        velocity: this.flatNotes[i].velocity,
                        startTime: this.flatNotes[i].startTime,
                        done: 0, //false
                        instance: this.flatNotes[i].instance,
                        phase: 0,
                        oscillatorPtr: 0,
                    })
                    console.log('made voice')
                    this.dv_lanes[this.flatNotes[i].lane] = this.flatNotes[i].instance;
                }
                if (!this.flatNotes[i].setsOn) {
                    // console.log('destroying voice')
                    // console.log('processed?', this.note_processed(this.flatNotes[i].lane, this.flatNotes[i].instance))

                    const v = this.voiceLookup[this.flatNotes[i].target];
                    if (v) {
                        v.freq = 0;
                        v.destroy();
                        delete this.voiceLookup[this.flatNotes[i].target];
                    }
                    // const lane = this.flatNotes[i].lane;

                    // console.log('destroying voice, lane', lane, 'target instance', this.flatNotes[i].target, 'off instance', this.flatNotes[i].instance)
                    // const v = this.voiceLookup[this.flatNotes[i].target];
                    // this.voiceLookup[this.flatNotes[i].target].freq = 0;
                    // if (v) v.destroy()  // if using heap-allocated object
                    // delete this.voiceLookup[this.flatNotes[i].target];
                    // this.dv_lanes[lane] = this.flatNotes[i].instance;

                }
            }
        }

        // const len = h2.length;
        for (let i = 0; i < 128; i++) {
            arr[i] = 0; // clear buffer for mixing multiple voices

            for (const [ii, _v] of Object.entries(this.voiceLookup)) {
                const v = _v as any as _VoiceInterface;


                const { sample, new_phase } = this.oscillators[v.oscillatorPtr].getSample(v.phase, v.freq);

                arr[i] += (sample * v.velocity) / 127;

                v.phase = new_phase;
            }
        }
    }

    process128(arr: Float32Array, startSample: number): void {
        this._process128(arr, startSample);
        for (let i = 0; i < this.effects.length; i++) {
            this.effects[i].process128(arr, startSample);
        }
    }
    addEffect(e: EffectPlugin): void {
        e.instance = crypto.randomUUID();
        this.effects.push(e);
    }
    removeEffect(e: EffectPlugin): void {
        this.effects = this.effects.filter(ef => ef.instance != e.instance)
    }

    enableEffect(e: EffectPlugin): void {
        const te = this.effects.find(ef => ef.instance == e.instance);
        if (!te) throw new Error("effect not found");
        te.active = true;
    }

    disableEffect(e: EffectPlugin): void {
        const te = this.effects.find(ef => ef.instance == e.instance);
        if (!te) throw new Error("effect not found");
        te.active = false;
    }

    setParameter(p: string, v: any): void {
        this.parameters[p] = v;
    }
}
