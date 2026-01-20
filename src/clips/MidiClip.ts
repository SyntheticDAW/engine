import { UseList_Heap } from "../performance/allocators/free_list";
import { LiveStruct, struct } from "../performance/allocators/structs";

export const NoteEvent = struct({
    instance: 'u32',
    pitch: 'u8',
    velocity: 'u8',
    setsOn: 'bool',
    live: 'bool',
    startTime: 'u32'
});

interface NoteEventInterface {
    pitch: number,
    velocity: number,
    setsOn?: number,
    live?: number,
    startTime: number,
    active?: number,
    instance?: number;
}

export class MidiClip {
    notes: LiveStruct[];
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

    addNoteOn(note: NoteEventInterface): LiveStruct {
        if (!this.heap) throw new Error("needs heap to allocate notes");
        const tn = this.heap.new(NoteEvent, {
            ...note,
            instance: ++this.ni,
            setsOn: 1,
            live: 1
        });
        let i = this.notes.length;
        while (i > 0 && this.notes[i - 1].startTime > tn.startTime) i--;
        this.notes.splice(i, 0, tn);
        return tn;
    }

    addNoteOff(atSample: number, note: LiveStruct): LiveStruct {
        if (!this.heap) throw new Error("needs heap to allocate notes");

        const tn = this.heap.new(NoteEvent, {
            instance: note.instance,
            pitch: note.pitch as number,
            velocity: note.velocity as number,
            setsOn: 0,
            live: note.live as number,
            startTime: atSample
        });

        let i = this.notes.length;
        while (i > 0 && this.notes[i - 1].startTime > tn.startTime) i--;
        this.notes.splice(i, 0, tn);

        return tn;
    }

    removeAndFreeNote(note: LiveStruct) {
        for (let i = 0; i < this.notes.length; i++) {
            if (this.notes[i].instance === note.instance) {
                const n = this.notes.splice(i, 1)[0];
                n.destroy();
                return true;
            }
        }
        return false;
    }
}
