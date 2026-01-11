export { struct } from "./performance/allocators/structs";
export { Track } from "./classes/workspace/track";
export { Workspace } from "./classes/workspace/workspace";
export { sumBlocksMutate } from "./mutations/sum_mutate";
import { UseList_Heap } from "./performance/allocators/free_list";
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


export const Allocators = {
    UseList_Heap,
}

