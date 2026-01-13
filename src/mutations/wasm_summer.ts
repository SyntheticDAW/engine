// wasmSummerBrowserUint8.ts
const bin: Uint8Array = new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,2,15,1,3,101,110,118,6,109,101,109,111,114,121,2,0,0,3,2,1,0,7,22,2,9,115,117,109,66,108,111,99,107,115,0,0,6,109,101,109,111,114,121,2,0,10,99,1,97,1,2,127,3,64,32,0,65,32,73,4,64,32,0,65,4,116,34,1,65,128,8,106,32,1,253,0,4,0,32,1,253,0,4,128,4,253,228,1,253,12,0,0,128,63,0,0,128,63,0,0,128,63,0,0,128,63,253,232,1,253,12,0,0,128,191,0,0,128,191,0,0,128,191,0,0,128,191,253,233,1,253,11,4,0,32,0,65,1,106,33,0,12,1,11,11,11]);
export class WasmSummer {
  private readonly BLOCK_SIZE = 128;
  private readonly BLOCK0 = 0;
  private readonly BLOCK1 = this.BLOCK0 + this.BLOCK_SIZE;
  private readonly BLOCK2 = this.BLOCK1 + this.BLOCK_SIZE;

  private f32: Float32Array;
  private instance!: WebAssembly.Instance;

  /** Preallocated reference to output block */
  public output: Float32Array;

  /** Private constructor */
  private constructor(memory: WebAssembly.Memory, instance: WebAssembly.Instance) {
    this.f32 = new Float32Array(memory.buffer);
    this.output = this.f32.subarray(this.BLOCK2, this.BLOCK2 + this.BLOCK_SIZE);
    this.instance = instance;
  }

  /**
   * Compile and instantiate the WASM module in one step
   * @param wasmBytes Uint8Array of the compiled WASM
   */
  static async create(): Promise<WasmSummer> {
    // 1. Compile the WASM module
    const module = await WebAssembly.compile(bin.buffer as ArrayBuffer);

    // 2. Create memory for the instance
    const memory = new WebAssembly.Memory({ initial: 1 }); // 64 KiB

    // 3. Instantiate the module with imported memory
    const instance = await WebAssembly.instantiate(module, { env: { memory } });

    // 4. Return the ready instance
    return new WasmSummer(memory, instance);
  }

  /**
   * Sum two input arrays into the preallocated output block
   */
  sum(inputA: Float32Array, inputB: Float32Array) {
    if (inputA.length !== this.BLOCK_SIZE || inputB.length !== this.BLOCK_SIZE) {
      throw new Error(`Input arrays must have length ${this.BLOCK_SIZE}`);
    }

    // Copy inputs into WASM memory
    this.f32.set(inputA, this.BLOCK0);
    this.f32.set(inputB, this.BLOCK1);

    // Call the WASM sum function
    (this.instance.exports.sumBlocks as Function)();
  }
}
