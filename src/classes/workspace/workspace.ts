import { sumBlocksMutate } from "../../mutations/sum_mutate";
import { createSampleSAB, createSampleView, WorkletHelper } from "../../processor/create_processor";
import { Track } from "./track";

export class Workspace {
    mainWorklet: WorkletHelper;
    queue_length: 2 | 3 | 4;
    sample_sab: SharedArrayBuffer;
    counter_sab: SharedArrayBuffer;
    sample_view: Float32Array;
    current_sample: number;
    tracks: Track[];

    constructor(latency: 1 | 2 | 3) {
        this.queue_length = latency + 1 as 2 | 3 | 4;
        this.mainWorklet = new WorkletHelper(this.queue_length);
        this.sample_sab = createSampleSAB(this.queue_length);
        this.sample_view = createSampleView(this.sample_sab);
        this.counter_sab = new SharedArrayBuffer(4);

        this.mainWorklet.setSAB(this.sample_sab);
        this.current_sample = 0;
        this.tracks = [];
    }

    async init() {
        await this.mainWorklet.init();
        this.mainWorklet.onRequest = (blockIndex) => {
            const b2f = blockIndex % this.queue_length;
            
            const bufs = [];
            for (let i = 0; i < this.tracks.length; i++) {
                if (this.tracks[i].active) bufs.push(this.tracks[i].buffer)
            }

            const start = blockIndex * 128
            sumBlocksMutate(bufs, start, 128, this.sample_view.subarray(start, start + 128))
        }
    }

    setLatency(latency: 1 | 2 | 3) {
        this.queue_length = latency + 1 as 2 | 3 | 4;
    }

    scrub(sample: number) {
        this.current_sample = sample;
        this.mainWorklet.scrub(this.current_sample);
    }
}