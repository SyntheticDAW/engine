export enum AOPluginType {
    JS,
    WASM,
}

export interface AudioOutputPlugin {
    process128(arr: Float32Array<SharedArrayBuffer|ArrayBuffer>): void;
    micSAB?: Float32Array<SharedArrayBuffer>;
    wantsMic: boolean;
    pluginName: string;
    type: AOPluginType;
}