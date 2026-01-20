import { UseList_Heap } from "../performance/allocators/free_list";
import { LiveStruct, struct } from "../performance/allocators/structs";

export const NoteEvent = struct({
    instance: 'u32',
    pitch: 'u8',
    velocity: 'u8',
    setsOn: 'bool',
    target: 'u32', //ued in noteoff events
    lane: 'u8', //will bump to u16 eventually, controls whhich midi clip its in
    startTime: 'u32'
});

let  globalLane = 0;

interface NoteEventInterface {
    pitch: number,
    velocity: number,
    setsOn?: number,
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
    lane: number;

    constructor() {
        this.notes = [];
        this.heap = undefined;
        this.sample_start = 0;
        this.sample_end = 0;
        this.ni = 0;
        this.lane = ++globalLane;
    }

    setHeap(h: UseList_Heap) {
        this.heap = h;
    }

    addNoteOn(note: NoteEventInterface): LiveStruct {
        if (!this.heap) throw new Error("needs heap to allocate notes");
        const tn = this.heap.new(NoteEvent, {
            ...note,
            lane: this.lane,
            instance: ++this.ni,
            setsOn: 1,
        });
        let i = this.notes.length;
        while (i > 0 && this.notes[i - 1].startTime > tn.startTime) i--;
        this.notes.splice(i, 0, tn);
        return tn;
    }

    addNoteOff(atSample: number, note: LiveStruct): LiveStruct {
        if (!this.heap) throw new Error("needs heap to allocate notes");

        const tn = this.heap.new(NoteEvent, {
            lane: this.lane,
            target: note.instance,
            instance: ++this.ni,
            pitch: note.pitch as number,
            velocity: note.velocity as number,
            setsOn: 0,
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
