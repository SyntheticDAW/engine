export function sampleToSeconds(si: number, sr: number): number {
    return si / sr
}
export function secondsToSample(s: number, sr: number): number {
    return Math.round(s * sr)
}
