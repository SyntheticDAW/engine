import webfft from "webfft";
import { ifft } from "..";

const fs = 44100;       // target sample rate
const oversample = 4;   // 4x oversampling
const fsOS = fs * oversample; // oversampled sample rate
const nyquist = fsOS / 2;

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
 * Simple FIR downsample filter (low-pass)
 * Cutoff at target Nyquist (fs/2)
 */
function lowpassAndDownsample(signal: Float32Array<any>, factor: number): Float32Array {
    const cutoff = 0.5 / factor; // normalized cutoff for oversample
    const N = 16; // simple FIR length, can increase for sharper filter
    const coeffs = new Float32Array(N + 1);
    for (let n = 0; n <= N; n++) {
        if (n === N / 2) {
            coeffs[n] = 2 * cutoff;
        } else {
            const x = Math.PI * (n - N / 2);
            coeffs[n] = Math.sin(2 * cutoff * x) / x;
        }
        // apply Hamming window
        // coeffs[n] *= 0.54 - 0.46 * Math.cos((2 * Math.PI * n) / N);
    }

    const outLen = Math.floor(signal.length / factor);
    const out = new Float32Array(outLen);

    for (let i = 0; i < outLen; i++) {
        let acc = 0;
        for (let n = 0; n <= N; n++) {
            const idx = i * factor + n - N / 2;
            if (idx >= 0 && idx < signal.length) acc += signal[idx] * coeffs[n];
        }
        out[i] = acc;
    }

    return out;
}

/**
 * Generate anti-aliased square wave wavetables using oversampling
 */
// export async function generateWavetables(
//     resolution: number,
//     fMin = 20,
//     fMax = 20000,
//     oversample = 4,       // oversampling factor
//     fs = 44100            // target sample rate
// ): Promise<Record<number, Float32Array>> {
//     const N = 1024 * oversample;      // FFT size
//     const nyquist = fs * 0.5;
//     const fsOS = fs * oversample;    // oversampled rate
//     const fi = new webfft(N);        // FFT object
//     const wavetables: Record<number, Float32Array> = {};

//     for (let t = 0; t < resolution; t++) {
//         const f0 = fMin * Math.pow(fMax / fMin, t / (resolution - 1));

//         const fftBins = new Float32Array(2 * N); // interleaved real/imag

//         // generate harmonics up to Nyquist
//         const maxHarmonic = Math.floor(nyquist / f0);
//         for (let k = 1; k <= maxHarmonic; k += 2) {  // odd harmonics for saw/square
//             const freq = k * f0;
//             const bin = Math.round(freq / fsOS * N);
//             const magnitude = 1 / k;

//             fftBins[2 * bin] = magnitude;      // real
//             fftBins[2 * bin + 1] = 0;          // imag

//             if (bin !== 0) {                   // symmetric conjugate
//                 fftBins[2 * (N - bin)] = magnitude;
//                 fftBins[2 * (N - bin) + 1] = 0;
//             }
//         }

//         // IFFT to time domain at oversampled rate
//         const wavetableOS: Float32Array = ifft(fftBins, fi, N);

//         // downsample simply by picking every oversample-th sample
//         const wavetable = new Float32Array(N / oversample);
//         for (let i = 0; i < wavetable.length; i++) {
//             wavetable[i] = wavetableOS[i * oversample];
//         }

//         // normalize
//         let max = 0;
//         for (let i = 0; i < wavetable.length; i++) max = Math.max(max, Math.abs(wavetable[i]));
//         if (max > 0) {
//             for (let i = 0; i < wavetable.length; i++) wavetable[i] /= max;
//         }

//         wavetables[f0] = wavetable;
//     }

//     return wavetables;
// }

/**
 * Generate square-wave wavetables using additive synthesis
 * @param resolution - number of wavetables to generate
 * @param fMin - lowest fundamental frequency
 * @param fMax - highest fundamental frequency
 * @param harmonics - number of odd harmonics to include
 * @param fs - sample rate
 */
export async function generateWavetables(
    resolution: number,
    fMin = 55,
    fMax = 1760,
    sampleRate = 44100
): Promise<Record<number, Float32Array>> {
    const N = 1024;
    const wavetables: Record<number, Float32Array> = {};

    for (let t = 0; t < resolution; t++) {
        const f0 = fMin * Math.pow(fMax / fMin, t / (resolution - 1));
        const nyquist = sampleRate / 2;

        // max allowed odd harmonic without exceeding Nyquist
        const maxHarmonic = Math.floor(nyquist / f0);
        const harmonics = Math.min(maxHarmonic, 15); // cap at 15 if you like

        const waveform = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            const phase = i / N;
            let sample = 0;
            for (let n = 1; n <= harmonics * 2; n += 2) {
                sample += Math.sin(2 * Math.PI * n * f0 * phase / sampleRate * N) / n;
            }
            waveform[i] = (4 / Math.PI) * sample;
        }

        // normalize
        let max = 0;
        for (let i = 0; i < N; i++) max = Math.max(max, Math.abs(waveform[i]));
        if (max > 0) {
            for (let i = 0; i < N; i++) waveform[i] /= max;
        }

        wavetables[Math.round(f0)] = waveform;
    }

    return wavetables;
}



export async function m4en(): Promise<Record<number, Float32Array>> {
    const resolution = 128; // 128 MIDI notes
    const midiWavetables: Record<number, Float32Array<any>> = {};

    for (let note = 0; note < resolution; note++) {
        // MIDI note -> frequency (A4 = 440 Hz)
        const f0 = 440 * Math.pow(2, (note - 69) / 12);

        const N = 1024 * oversample;
        const fi = new webfft(N);
        const fftBins = new Float32Array(2 * N);

        const maxHarmonic = Math.floor(nyquist / f0);
        for (let k = 1; k <= maxHarmonic; k += 2) {
            const freq = k * f0;
            const bin = Math.round(freq / fsOS * N);
            const magnitude = 1 / k;

            fftBins[2 * bin] = magnitude;
            fftBins[2 * bin + 1] = 0;

            if (bin !== 0) {
                fftBins[2 * (N - bin)] = magnitude;
                fftBins[2 * (N - bin) + 1] = 0;
            }
        }

        // IFFT to time domain at oversampled rate
        let wavetable: Float32Array = ifft(fftBins, fi, N);

        // low-pass + downsample to target fs
        wavetable = lowpassAndDownsample(wavetable, oversample);

        normalize(wavetable);
        midiWavetables[note] = wavetable;
    }

    return midiWavetables;
}