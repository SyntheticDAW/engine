export enum PluginType {
    JS,
    WASM,
}

export interface Plugin {
    process128(arr: Float32Array<SharedArrayBuffer|ArrayBuffer>): void;
    
    plugin_name: string;
    type: PluginType;
}