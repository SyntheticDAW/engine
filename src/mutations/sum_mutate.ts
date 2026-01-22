export function sumBlocksMutate(
    tracks: Float32Array[],
    start: number,
    blockSize: number,
    output: Float32Array 
) {
    if (output.length < blockSize) throw new Error("Output buffer too small"); //potentially comment out

    for (let i = 0; i < blockSize; i++) output[i] = 0;

    for (const track of tracks) {
        for (let i = 0; i < blockSize; i++) {
            const sampleIndex = start + i;
            if (sampleIndex < track.length) output[i] += track[sampleIndex];
        }
    }

    for (let i = 0; i < blockSize; i++) {
        const s = output[i];
        output[i] = s > 1 ? 1 : s < -1 ? -1 : s;
    }
}


export function sumBlocksMutateTan(
    tracks: Float32Array[],
    start: number,
    blockSize: number,
    output: Float32Array 
) {
    if (output.length < blockSize) throw new Error("Output buffer too small"); //potentially comment out

    for (let i = 0; i < blockSize; i++) output[i] = 0;

    for (const track of tracks) {
        for (let i = 0; i < blockSize; i++) {
            const sampleIndex = start + i;
            if (sampleIndex < track.length) output[i] += track[sampleIndex];
        }
    }

    for (let i = 0; i < blockSize; i++) {
        const s = output[i];
        output[i] = s > 1 ? 1 : s < -1 ? -1 : s;
    }
}
