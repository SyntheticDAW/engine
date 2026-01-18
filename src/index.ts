export { struct } from "./performance/allocators/structs";
export { Track } from "./classes/workspace/track";
export { Workspace } from "./classes/workspace/workspace";
export { sumBlocksMutate } from "./mutations/sum_mutate";
export { WasmSummer } from "./mutations/wasm_summer";
import { UseList_Heap } from "./performance/allocators/free_list";
import { Plugin2H } from "./plugins/2h_plugin";
import { SinePlugin } from "./plugins/sine_plugin";
export { allocf, hann_ready, loadHann } from "./wasm/hann_api";

export { createSampleSAB, createSampleView, createWorkletBlob, WorkletHelper } from "./processor/create_processor";

export { hex2str, str2hex } from "./util/hex_str";

export { playFloat32Array as playSamples } from "./util/play";

export { hexToPacked, packedToHex, packRGBA, unpackRGBA } from "./color/colors";

export { sumBlocks, sumTracks } from "./mutations/sum";

export { gainClamped, gainDecibels, rmsGetDecibels } from "./mutations/gain_basic";

export { sampleToSeconds } from "./util/seconds_from_sample";

export const ExamplePlugins = {
    Sine: SinePlugin,
    Plugin2H
}


export const Allocators = {
    UseList_Heap,
}



