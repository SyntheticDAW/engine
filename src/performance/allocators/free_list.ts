import { StructDefinition } from "./structs";

export class FreeList_Heap {
    arrayBuffer: ArrayBuffer;
    view: Uint8Array;
    allocTable: Record<number, number>;
    constructor(size_bytes: number) {
        this.arrayBuffer = new ArrayBuffer(size_bytes);
        this.view = new Uint8Array(this.arrayBuffer);
        this.allocTable = {};
    }

    malloc(bytes: number): Uint8Array & { ptr: number } {
        const keys = Object.keys(this.allocTable)
            .map(k => +k)               // convert string keys to numbers
            .sort((a, b) => a - b);     // sort start addresses

        // Check if we can allocate at the very beginning
        if (keys.length === 0) {
            this.allocTable[0] = bytes;
            const region = this.view.subarray(0, bytes);
            (region as any).ptr = 0;
            return region as Uint8Array & { ptr: number };;
        }

        // Check space before the first allocation
        const firstStart = keys[0];
        if (firstStart >= bytes) {
            this.allocTable[0] = bytes;
            const region = this.view.subarray(0, bytes);
            (region as any).ptr = 0;
            return region as Uint8Array & { ptr: number };;
        }

        // Check gaps between allocations
        for (let i = 0; i < keys.length; i++) {
            const currStart = keys[i];
            const currEnd = this.allocTable[currStart]; // end of current allocation
            const nextStart = i + 1 < keys.length ? keys[i + 1] : this.view.length;

            const gapStart = currEnd;
            const gapEnd = nextStart;

            const gapSize = gapEnd - gapStart;
            if (gapSize >= bytes) {
                this.allocTable[gapStart] = gapStart + bytes;
                const region = this.view.subarray(gapStart, gapStart + bytes);
                (region as any).ptr = gapStart;
                return region as Uint8Array & { ptr: number };
            }
        }

        throw new Error("Out of memory");
    }


    free(region: Uint8Array) {
        if (!this.allocTable[(region as any).ptr]) throw new Error("double free");
        delete this.allocTable[(region as any).ptr];
    }

    new(type: StructDefinition, initial?: Record<string, number | Iterable<number>>) {
        const reg = this.malloc(type._size);
        reg.fill(0);
        return type.Make(this, initial, reg);
    }

}