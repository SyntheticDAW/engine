import webfft from "webfft";
import { ifft } from "..";

const fs = 44100;       // sample rate
const nyquist = fs / 2;

/**
 * Normalize a Float32Array in-place to [-1, 1]
 */
function normalize(arr: Float32Array) {
    let max = 0;
    for (let i = 0; i < arr.length; i++) max = Math.max(max, Math.abs(arr[i]));
    if (max === 0) return arr;
    for (let i = 0; i < arr.length; i++) arr[i] /= max;
    return arr;
}

/**
 * Generate anti-aliased square wave wavetables
 * @param resolution Number of wavetables to generate across the harmonic range
 * @param baseFreq Fundamental frequency for table generation (default A4=440Hz)
 */
export async function generateWavetables(resolution: number, fMin = 20, fMax = 20000): Promise<Record<number, Float32Array>> {
    const N = 1024;
    const fi = new webfft(N);
    const wavetables: Record<number, Float32Array> = {};

    for (let t = 0; t < resolution; t++) {
        // logarithmic spacing of frequencies
        const f0 = fMin * Math.pow(fMax / fMin, t / (resolution - 1));

        let fftBins = new Float32Array(2 * N);

        // compute max harmonic that doesn't exceed Nyquist
        const maxHarmonic = Math.floor(nyquist / f0);
        for (let k = 1; k <= maxHarmonic; k += 2) { // only odd harmonics
            const freq = k * f0;
            const bin = Math.round(freq / fs * N);
            const magnitude = 1 / k;

            fftBins[2 * bin] = magnitude;
            fftBins[2 * bin + 1] = 0;

            if (bin !== 0) {
                fftBins[2 * (N - bin)] = magnitude;
                fftBins[2 * (N - bin) + 1] = 0;
            }
        }

        const wavetable = ifft(fftBins, fi, N);
        normalize(wavetable);
        wavetables[f0] = wavetable;
    }

    return wavetables;
}
