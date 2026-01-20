export { struct } from "./performance/allocators/structs";
export { Track } from "./classes/workspace/track";
export { Workspace } from "./classes/workspace/workspace";
export { sumBlocksMutate } from "./mutations/sum_mutate";
export { WasmSummer } from "./mutations/wasm_summer";
import { MidiClip } from "./clips/MidiClip";
import { UseList_Heap } from "./performance/allocators/free_list";
import { Plugin2H } from "./plugins/2h_plugin";
import { SinePlugin } from "./plugins/sine_plugin";
import { Square } from "./plugins/square_pluck";
import { hann, hann_ready, loadHann, makeBlock } from "./wasm/hann_api";
export { makeBlock, hann_ready, loadHann, hann } from "./wasm/hann_api";

export { createSampleSAB, createSampleView, createWorkletBlob, WorkletHelper } from "./processor/create_processor";

export { hex2str, str2hex } from "./util/hex_str";

export { playFloat32Array as playSamples } from "./util/play";

export { hexToPacked, packedToHex, packRGBA, unpackRGBA } from "./color/colors";

export { sumBlocks, sumTracks } from "./mutations/sum";

export { gainClamped, gainDecibels, rmsGetDecibels } from "./mutations/gain_basic";

export { sampleToSeconds } from "./util/seconds_from_sample";

export const ExamplePlugins = {
    Sine: SinePlugin,
    Plugin2H,
    Square
}


export const Allocators = {
    UseList_Heap,
}

export const Hann = {
    ready: hann_ready,
    hann: hann,
    init: loadHann,
    makeBlock,
    freeBlock: (b: Float64Array & { free(): void }): void => {
        b.free();
    }
}

export const ClipSources = {
    MidiClip
}