export function gainClamped(f32Array: Float32Array, gain: number): void {
    for (let i = 0; i < f32Array.length; i++) {
        f32Array[i] *= gain;
        f32Array[i] = Math.max(-1, Math.min(1, f32Array[i]));
    }
}

export function gainDecibels(f32Array: Float32Array, gainDb: number): void {
    const linearGain = Math.pow(10, gainDb / 20);
    gainClamped(f32Array, linearGain);
}

export function rmsGetDecibels(f32Array: Float32Array): number {
    let sumSquares = 0;
    for (let i = 0; i < f32Array.length; i++) {
        sumSquares += f32Array[i] * f32Array[i]; 
    }
    const rms = Math.sqrt(sumSquares / f32Array.length); 
    const minVal = 1e-12; // avoid log(0)
    return 20 * Math.log10(Math.max(rms, minVal));
}


