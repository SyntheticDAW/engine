import webfft from "webfft";
import { loadHann } from "../wasm/hann_api";
import { Hann, ifft } from "..";

const fs = 44100;        // sample rate
const N = 1024;           // FFT size
const numTables = 11;     // number of wavetables
const nyquist = fs / 2;

function normalize(arr: Float32Array) {
    let max = 0;
    for (let i = 0; i < arr.length; i++) max = Math.max(max, Math.abs(arr[i]));
    if (max === 0) return arr;
    for (let i = 0; i < arr.length; i++) arr[i] /= max;
    return arr;
}

export function generateWavetables(): Promise<Float32Array[]> {
    return new Promise(async (resolve) => {
        await loadHann();
        const fi = new webfft(N);
        let wavetables: Float32Array[] = [];

        const block = Hann.makeBlock(N);
        Hann.hann(block as any);

        for (let t = 0; t < numTables; t++) {
            const maxOddHarmonic = Math.max(1, 11 - t);
            let fftBins = new Float32Array(2 * N); // zeros

            for (let k = 1; k <= maxOddHarmonic; k++) {
                const harmonic = 2 * k - 1;
                const freq = harmonic * 440;
                if (freq > nyquist) break;

                const bin = Math.round(freq / fs * N);
                const magnitude = 1 / harmonic;

                fftBins[2 * bin] = magnitude;
                fftBins[2 * bin + 1] = 0;

                if (bin !== 0) {
                    fftBins[2 * (N - bin)] = magnitude;
                    fftBins[2 * (N - bin) + 1] = 0;
                }
            }

            let wavetable = ifft(fftBins, fi, N);

            // Apply Hann window
            for (let i = 0; i < N; i++) wavetable[i] *= block[i];

            normalize(wavetable);

            wavetables.push(wavetable);
        }

        Hann.freeBlock(block as any);

        resolve(wavetables); // resolve once all tables are ready
    });
}
