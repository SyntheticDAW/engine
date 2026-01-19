import { struct } from "../performance/allocators/structs";

export const NoteEvent = struct({
    instance: 'u8',
    pitch: 'u8',
    velocity: 'u8',
    setsOn: 'bool',
    live: 'bool',
    startTime: 'u32'
})

class MidiClip {
    notes: any;
    constructor() {
        this.notes = [];
    }
}