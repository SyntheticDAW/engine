
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
// }
type OscillatorTemplate = any;

const Voice = struct({
    pitch: 'u8',
    velocity: 'u8',
    startTime: 'u32',
    done: 'bool',
    instance: 'u32',
    oscillatorPtr: 'u16',
    modulatorsPtr: 'u16',
    freq: 'f32',
    phase: 'f32',
    done_modulators: 'u32',
    lpf_z1: 'f32',
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
    lpf_z1: number;
    done_modulators: number;
}

interface Modulator {
    done: boolean;
    call(voice: any, sample: number, noteStart: number): number;
    [key: string]: any;
}

// class DoRandomSModulator implements Modulator {
//     done = false;
//     gain: number;
//     duration: number;      // how long to apply after note ends, in samples
//     appliedSamples: number;

//     constructor(durationS: number = 1, sampleRate: number = 44100) {
//         this.duration = durationS * sampleRate;
//         this.appliedSamples = 0;
//         this.gain = 0.5 + Math.random(); // random gain 0.5–1.5
//     }

//     call(voice: any, sample: number, noteStart: number): number {
//         // Only start applying once the voice is finished
//         // if (!voice.done) return sample;

        
//         if (this.appliedSamples < this.duration) {
//             this.appliedSamples++;
//             return 0.5 + Math.random();
//         } else {
//             if (!this.done) {
//                 // increment voice counter once
//                 voice.done_modulators = (voice.done_modulators || 0) + 1;
//                 this.done = true;
//             }
//             return sample;
//         }
//     }
// }

class DoRandomSModulator implements Modulator {
    done = false;

    // hard-coded ADSR (samples @ 44.1kHz)
    attack  = 200;    // ~4.5ms
    decay   = 2000;   // ~45ms
    sustain = 0.6;
    release = 3000;   // ~68ms

    // internal state (owned by modulator)
    releaseStartSample = -1;

    call(voice: any, sample: number, noteStart: number): number {
        const age = sample - noteStart;

        // -------------------------
        // NOTE ON (A/D/S)
        // -------------------------
        if (!voice.done) {
            // attack
            if (age < this.attack) {
                return age / this.attack;
            }

            // decay
            if (age < this.attack + this.decay) {
                const t = (age - this.attack) / this.decay;
                return 1 - t * (1 - this.sustain);
            }

            // sustain
            return this.sustain;
        }

        // -------------------------
        // RELEASE
        // -------------------------
        if (this.releaseStartSample === -1) {
            this.releaseStartSample = sample;
        }

        const rAge = sample - this.releaseStartSample;

        if (rAge < this.release) {
            return this.sustain * (1 - rAge / this.release);
        }

        // -------------------------
        // FINISHED
        // -------------------------
        if (!this.done) {
            this.done = true;
            voice.done_modulators++;
        }

        return 0;
    }
}



function createPluckADSR(attackS: number, decayS: number, sustain: number, releaseS: number) {
    return function (ageSamples: number, noteReleased = false, releaseStart = 0) {
        if (!noteReleased) {
            // Attack phase — make it almost instantaneous
            if (ageSamples < attackS) return 1.0; // jump to full immediately

            // Decay phase — drop quickly to a low sustain (pluck)
            else if (ageSamples < attackS + decayS) {
                const t = (ageSamples - attackS) / decayS;
                return 1.0 * (1 - t) + sustain * t; // linear decay
            }

            // Pluck sustain — very short, can even be zero
            else return sustain;
        } else {
            // Release phase — quick drop
            const releasePos = ageSamples - releaseStart;
            return Math.max(0, sustain * (1 - releasePos / releaseS));
        }
    };
}

// Example usage for a percussive square pluck
const sampleRate = 44100;
const attackS = 1;        // 1 sample = instantaneous
const decayS = 1000;      // ~23ms decay
const sustain = 0.0;      // drop to zero immediately for pluck
const releaseS = 2000;    // ~45ms release

const pluckADSR = createPluckADSR(attackS, decayS, sustain, releaseS);


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
    oscillators: any[];
    dv_lanes: Record<number, number>;
    modulators: Record<number, Modulator[]>;

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
        this.dv_lanes = {};
        this.modulators = { '0': [new DoRandomSModulator()] };
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
                        oscillatorPtr: 0,
                    });
                    this.dv_lanes[note.lane] = note.instance;
                    console.log('made voice');
                } else if (!note.setsOn) {
                    const v = this.voiceLookup[note.target] ?? undefined;
                    // if (v) {
                    //     v.freq = 0;
                    //     v.destroy();
                    //     delete this.voiceLookup[note.target];
                    // }


                    if (v) v.done = true;

                }

                const v = this.voiceLookup[note.target] ?? undefined;
                if (v && !v.destroyed && v.done && v.done_modulators >= this.modulators[v.modulatorsPtr].length) {
                    v.freq = 0;
                    v.destroy();
                    delete this.voiceLookup[note.target];
                }

                // const v = this.voiceLookup[note.target];

                // if (!note.setsOn && !v) {
                //     console.warn("Voice not found for note.target:", note.target, note);
                //     continue; // skip
                // }

                // // Check all expected fields
                // if (typeof v.done === "undefined") console.warn("v.done is undefined", v);
                // if (typeof v.done_modulators === "undefined") console.warn("v.done_modulators is undefined", v);
                // if (typeof this.modulators[v.modulatorsPtr] === "undefined") {
                //     console.warn("Modulators missing for modulatorsPtr", v.modulatorsPtr, v);
                // }

            }
        }

        for (let i = 0; i < 128; i++) {
            let sum = 0;

            for (const _v of Object.values(this.voiceLookup)) {
                const v = _v as any as _VoiceInterface;

                const { sample, new_phase } =
                    this.oscillators[v.oscillatorPtr].getSample(v.phase, v.freq);

                v.phase = new_phase;

                sum += ((sample * v.velocity) / 127)
                const moda = this.modulators[v.modulatorsPtr] ?? [];
                for (let mi = 0; mi < moda.length; mi++) {
                    const modulator = moda[mi]
                    const tmc = modulator.call(v, startSample + i, v.startTime);
                    // console.log(sum)
                    if (!modulator.done) sum *= tmc
                    // console.log(sum)
                }
            }

            arr[i] = sum; // <<--- write the mixed sample to the output buffer
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
