import { EffectPlugin } from "../effects/effect_interface";

export enum AOPluginType {
    JS,
    WASM,
}


export interface AudioOutputPlugin {
    process128(arr: Float32Array<SharedArrayBuffer|ArrayBuffer>, startSample: number): void;
    micSAB?: Float32Array<SharedArrayBuffer>;
    wantsMic: boolean;
    pluginName: string;
    type: AOPluginType;
    addEffect(e: EffectPlugin): void;
    enableEffect(e: EffectPlugin): void;
    disableEffect(e: EffectPlugin): void;
    removeEffect(e: EffectPlugin): void;
    setParameter(p: string, v: any): void;
}