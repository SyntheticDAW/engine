let hannInstance: WebAssembly.WebAssemblyInstantiatedSource | undefined = undefined;

let resolve_hann: ((value?: unknown) => void) | undefined;

export let hann_ready = new Promise((resolve, reject) => {
    resolve_hann = resolve;
});


export async function loadHann() {
    hannInstance = await WebAssembly.instantiateStreaming(fetch("./hann.wasm"));
    resolve_hann?.()
}

export function makeBlock(n: number) {
    const ptr = (hannInstance!.instance.exports as any).alloc_f32(n);
    const view = new Float32Array((hannInstance?.instance.exports.memory as any).buffer, ptr, n);
    (view as any).ptr = ptr;
    (view as any).free = function () {
        (hannInstance!.instance.exports as any).free_f32(ptr, n);
    }
    return view;
}

export function hann(block: Float32Array & { free(): void; ptr: number }): Float32Array {
    (hannInstance!.instance.exports as any).hann(block.ptr, block.length);
    return block;
}