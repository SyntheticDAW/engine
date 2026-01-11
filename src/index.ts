import { SinePlugin } from "./plugins/sine_plugin";

export { createSampleSAB, createSampleView, createWorkletBlob, WorkletHelper } from "./processor/create_processor";

export { hex2str, str2hex } from "./util/hex_str";

export { playFloat32Array as playSamples } from "./util/play";

export { hexToPacked, packedToHex, packRGBA, unpackRGBA } from "./color/colors";

export { sumBlocks, sumTracks } from "./mutations/sum";

export { gainClamped, gainDecibels, rmsGetDecibels } from "./mutations/gain_basic";

export { sampleToSeconds } from "./util/seconds_from_sample";

export const ExamplePlugins = {
    Sine: SinePlugin,
}
