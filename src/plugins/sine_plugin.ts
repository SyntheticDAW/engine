import { EffectPlugin } from "../effects/effect_interface";
import { h22 } from "./2h_plugin";
import { AOPluginType, AudioOutputPlugin } from "./plugin_interface";

export class SinePlugin implements AudioOutputPlugin {
    wantsMic: boolean;
    pluginName: string;
    type: AOPluginType;
    freq: number;
    amp: number;

    constructor() {
        this.wantsMic = false;
        this.pluginName = "example sine #01";
        this.type = AOPluginType.JS;
        this.freq = 440; // 430 Hz (wut)
        this.amp = 0.25; // volume
    }

    /**
     * Fill arr with 128 samples starting at the given absolute sample index
     */
    // process128(arr: Float32Array, startSample: number): void {
    //     // console.log('startSample', startSample)
    //     const sampleRate = 44100;
    //     const phaseIncrement = (2 * Math.PI * this.freq) / sampleRate;

    //     for (let i = 0; i < arr.length; i++) {
    //         // calculate absolute phase from global sample index
    //         const phase = (startSample + i) * phaseIncrement;
    //         arr[i] = Math.sin(phase) * this.amp;
    //     }
    // }

        process128(arr: Float32Array, startSample: number): void {
        // const sampleRate = 44100;
        // const phaseIncrement = (2 * Math.PI * this.freq) / sampleRate;

        for (let i = 0; i < arr.length; i++) {
    
            arr[i] = h22[i % 1024];
        }
    }
    addEffect(e: EffectPlugin): void {
        
    }

    removeEffect(e: EffectPlugin): void {
        
    }

    enableEffect(e: EffectPlugin): void {
        
    }

    disableEffect(e: EffectPlugin): void {
        
    }

    setParameter(p: string, v: any): void {
        
    }
}
