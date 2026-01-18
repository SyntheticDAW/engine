
//definitely use structs for fast frees and removes just not yet
export interface EffectPlugin {
    process128(arr: Float32Array<SharedArrayBuffer|ArrayBuffer>, startSample: number): void;
    effectName: string;
    effectDescription?: string;
    instance: string | undefined;
    active: boolean;
}