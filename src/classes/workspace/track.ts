import { AudioOutputPlugin } from "../../plugins/plugin_interface";

let trackID: number = -1;
export class Track {
    id: number;
    plugin: AudioOutputPlugin;
    active: boolean;
    buffer: Float32Array;
    constructor(plugin: AudioOutputPlugin) {
        this.id = ++trackID;
        this.plugin = plugin;
        this.buffer = new Float32Array(128);
        this.active = true;
    }

    
    process128(startSample: number) {
        return this.plugin.process128(this.buffer, startSample);
    }
    
}