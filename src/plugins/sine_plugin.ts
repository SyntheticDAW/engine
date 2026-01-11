import { AOPluginType, AudioOutputPlugin } from "./plugin_interface";

export class SinePlugin implements AudioOutputPlugin {
    wantsMic: boolean;
    pluginName: string;
    type: AOPluginType;
    phase: number;
    constructor() {
        this.wantsMic = false;
        this.pluginName = "example sine #01";
        this.type = AOPluginType.JS;
        this.phase = 0;
    }
    process128(arr: Float32Array): void {
        const sampleRate = 44100;       // adjust if your AudioContext uses a different rate
        const freq = 430;                // 430 Hz
        const amp = 0.25;                // volume
        // Keep track of a phase offset so the sine wave is continuous
        if (this.phase === undefined) this.phase = 0;

        const phaseIncrement = (2 * Math.PI * freq) / sampleRate;

        for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.sin(this.phase) * amp;
            this.phase += phaseIncrement;
            // Wrap phase to prevent it from growing indefinitely
            if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
        }
    }

}