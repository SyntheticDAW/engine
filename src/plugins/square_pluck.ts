
import { ifft } from "..";
import { MidiClip, NoteEvent } from "../clips/MidiClip";
import { EffectPlugin } from "../effects/effect_interface";
import { UseList_Heap } from "../performance/allocators/free_list";
import { LiveStruct, struct } from "../performance/allocators/structs";
import { generateWavetables } from "./gensquares";
import { sqpo } from "./osc/sqp";
import { PolyBLEPSquare } from "./pbs";
import { AOPluginType, AudioOutputPlugin } from "./plugin_interface";




// interface OscillatorTemplate {
//     wavetables: Record<number,Float32Array>,
//     getSample(phase: number, freq: number): { sample: number, new_phase: number };
// // }
// type OscillatorTemplate = any;
interface OscillatorTemplate {
    [key: string]: any;
    id: number;
}

const Voice = struct({
    pitch: 'u8',
    velocity: 'u8',
    startTime: 'u32',
    done: 'bool',
    instance: 'u32',
    oscillatorsPtr: 'u16',
    modulatorsPtr: 'u16',
    freq: 'f32',
    phase: 'f32',
    done_modulators: 'u32',
    lpf_z1: 'f32',
    oscPhases: 'f32[64]'
});


interface _VoiceInterface {
    pitch: number;
    velocity: number;
    startTime: number;
    done: boolean;
    instance: number;
    oscillatorsPtr: number;
    modulatorsPtr: number;
    freq: number;
    phase: number;
    lpf_z1: number;
    done_modulators: number;
    oscPhases: Float32Array;
}

interface Modulator {
    done: boolean;
    call(voice: any, sampleIndex: number, noteStart: number): {
        multiplier?: number; // for amplitude effects
        freqOffset?: number; // for pitch/detune effects
    };
    [key: string]: any;
}


class CustomPluckADSR implements Modulator {
    done = false;

    attack = 0.3 * 44100;      // 0.3s
    decay = 0.2 * 44100;       // 0.2s
    sustain = 0.0;               // target level after decay
    release = 0.08 * 44100;     // 0.2s

    releaseStartSample = -1;
    releaseStartMultiplier = 0;

    call(voice: any, sample: number, noteStart: number): { multiplier?: number } {
        const age = sample - noteStart;
        let mult = 0;

        // -------------------------
        // NOTE ON (Attack/Decay/Sustain)
        // -------------------------
        if (!voice.done) {
            if (age < this.attack) {
                // linear or whatever you already had
                mult = age / this.attack;
            } else if (age < this.attack + this.decay) {
                const t = (age - this.attack) / this.decay;
                mult = this.sustain + (1 - this.sustain) * (1 - t); // linear decay
            } else {
                if (this.sustain === 0) {
                    // special case: go straight to release
                    voice.done = true;
                    mult = 0;
                } else {
                    mult = this.sustain;
                }
            }
            return { multiplier: mult };
        }

        // -------------------------
        // RELEASE (exponential)
        // -------------------------
        if (this.releaseStartSample === -1) {
            this.releaseStartSample = sample;
            this.releaseStartMultiplier = Math.max(mult, 0.001); // start from current amplitude
        }

        const rAge = sample - this.releaseStartSample;
        if (rAge < this.release) {
            const t = rAge / this.release;
            // exponential fade: starts at releaseStartMultiplier, decays quickly then slows
            mult = this.releaseStartMultiplier * Math.pow(0.01, t);
            return { multiplier: mult };
        }

        // -------------------------
        // FINISHED
        // -------------------------
        if (!this.done) {
            this.done = true;
            voice.done_modulators++;
        }

        return { multiplier: 0 };
    }

}


class DetuneModulator implements Modulator {
    done = false;

    freq = 5;      // LFO frequency in Hz
    depth = 0.3;   // detune amount in semitones (~30 cents)
    sampleRate = 44100;
    phase = 0;

    call(voice: any, sample: number, noteStart: number): { freqOffset?: number } {
        // Increment LFO phase
        const increment = (2 * Math.PI * this.freq) / this.sampleRate;
        this.phase += increment;
        if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;

        // Sine LFO for smooth detune
        const detuneAmount = Math.sin(this.phase) * this.depth;

        // Return as a frequency offset in semitones
        return { freqOffset: detuneAmount };
    }
}

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
    dv_lanes: Record<number, number>;

    oscillators: OscillatorTemplate[];
    oscillator_lookup: Record<number, number[]>;

    modulators: Modulator[];
    modulator_lookup: Record<number, number[]>;
    osc_phases: Float32Array;

    constructor(wavetables: Record<number, Float32Array>) {
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
        // sqpo.wavetables = wavetables
        this.oscillators = [sqpo];
        this.oscillator_lookup = { '0': [0] }
        this.dv_lanes = {};
        this.modulators = [new CustomPluckADSR(), new DetuneModulator()]
        this.modulator_lookup = { '0': [0, 1] };
        this.osc_phases = new Float32Array(256);
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
    private debugCounter = 0; // add this to your class

    _process128(arr: Float32Array, startSample: number): void {
        const debugInterval = 44100; // print roughly every 1 second at 44.1kHz

        // --- Update voices from MIDI notes ---
        for (let i = 0; i < this.flatNotes.length; i++) {
            const note = this.flatNotes[i];

            if (startSample >= note.startTime) {
                if (note.setsOn && !this.note_processed(note.lane, note.instance)) {
                    this.voiceLookup[note.instance] = this.object_allocator.new(Voice, {
                        pitch: note.pitch,
                        freq: 440 * 2 ** ((note.pitch - 69) / 12),
                        velocity: note.velocity,
                        startTime: note.startTime,
                        done: 0,
                        instance: note.instance,
                        phase: 0,
                        oscillatorsPtr: 0,
                        oscPhases: new Float32Array(64),
                    });
                    this.dv_lanes[note.lane] = note.instance;
                    console.log(`[Sample ${startSample}] MADE VOICE: instance=${note.instance} pitch=${note.pitch}`);
                } else if (!note.setsOn && !this.note_processed(note.lane, note.instance)) {
                    const v = this.voiceLookup[note.target] ?? undefined;
                    if (v) {
                        v.done = true;
                        console.log(`[Sample ${startSample}] NOTE OFF: instance=${note.target} pitch=${note.pitch}`);
                    }
                }

                const v = this.voiceLookup[note.target] ?? undefined;
                if (v && !v.destroyed && v.done && v.done_modulators >= this.modulators[v.modulatorsPtr].length) {
                    console.log(`[Sample ${startSample}] DESTROYING VOICE: instance=${note.target}`);
                    v.freq = 0;
                    v.destroy();
                    delete this.voiceLookup[note.target];
                }
            }
        }

        for (let i = 0; i < 128; i++) {
            let sum = 0;

            for (const _v of Object.values(this.voiceLookup)) {
                const v = _v as any as _VoiceInterface;

                const oscillator_indices = this.oscillator_lookup[v.oscillatorsPtr] || [];
                let voiceSum = 0;

                for (let oi = 0; oi < oscillator_indices.length; oi++) {
                    const oscIdx = oscillator_indices[oi];
                    const osc = this.oscillators[oscIdx];

                    let phase = v.oscPhases[oi] ?? 0;

                    const modIndices = this.modulator_lookup[osc.id] || [];
                    const mods = modIndices.map(mi => this.modulators[mi]);

                    let freq = v.freq;
                    let amp = 1;

                    for (const mod of mods) {
                        const { multiplier, freqOffset } = mod.call(v, startSample + i, (startSample + i) - v.startTime);
                        if (multiplier !== undefined) amp *= multiplier;
                        if (amp == 0) {
                            console.log('amp is 0')
                        }
                        if (freqOffset !== undefined) freq *= 2 ** (freqOffset / 12);
                    }



                    const { sample, new_phase } = osc.getSample(phase, freq);
                    v.oscPhases[oi] = new_phase;

                    voiceSum += sample * amp;
                }

                sum += (voiceSum * v.velocity / 127);


                // sparse debug: print only every debugInterval samples
                // if ((this.debugCounter + i) % debugInterval*200 === 0) {
                //     console.log(`[Sample ${startSample + i}] Voice ${v.instance} voiceSum=${voiceSum.toFixed(3)} sum=${sum.toFixed(3)} done=${v.done}`);
                // }
            }

            arr[i] = sum;
        }

        this.debugCounter += 128;
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
