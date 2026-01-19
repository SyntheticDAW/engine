import { UseList_Heap } from "../performance/allocators/free_list";
import { LiveStruct, struct, StructDefinition } from "../performance/allocators/structs";

export const NoteEvent = struct({
    instance: 'u8',
    pitch: 'u8',
    velocity: 'u8',
    setsOn: 'bool',
    live: 'bool',
    startTime: 'u32'
})


interface NoteEventInterface {
    pitch: number,
    velocity: number,
    setsOn: number,
    live: number,
    startTime: number,
    active: number,
}

export class MidiClip {
    notes: any;
    heap: UseList_Heap | undefined;
    sample_start: number;
    sample_end: number;
    ni: number;
    constructor() {
        this.notes = [];
        this.heap = undefined;
        this.sample_start = 0;
        this.sample_end = 0;
        this.ni = 0;

    }

    setHeap(h: UseList_Heap) {
        this.heap = h;
    }

    addNoteEvent(note: NoteEventInterface) {
        if (!this.heap) throw new Error("needs heap to allocate notes");
        const tn = this.heap.new(NoteEvent, {
            instance: ++this.ni,
            ...note
        })
        let i = this.notes.length;
        while (i > 0 && this.notes[i - 1].startTime > tn.startTime) i--;
        this.notes.splice(i, 0, tn);
    }

    removeAndFreeNote(note: LiveStruct) {
        for (let i = 0; i < this.notes.length; i++) {
            if (this.notes[i].instance === (note as any).instance) {
                this.notes.splice(i, 1);
                this.notes[i].destroy();
                return true; 
            }
        }
        return false; 
    }
}