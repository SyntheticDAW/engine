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


        this.current_sample = 0;
        this.tracks = [];
    }

    async init() {
        await this.mainWorklet.init();
        this.mainWorklet.onRequest = (blockIndex) => {
            console.log('summing')
            // console.log('blockIndex', blockIndex)
            const b2f = blockIndex % this.queue_length;
            // const b2f = blockIndex % this.queue_length;
            // const srcStart = blockIndex * 128;

            const bufs = [];
            for (let i = 0; i < this.tracks.length; i++) {
                this.tracks[i].plugin.process128(this.tracks[i].buffer, this.current_sample)
                if (this.tracks[i].active) bufs.push(this.tracks[i].buffer);
            }

            // let carrier = new Float32Array(128);


            const start = b2f * 128;

            sumBlocksMutate(
                bufs,
                0,
                128,
                this.sample_view.subarray(start, start+128),
            );

            // this.sample_view.set(
            //     carrier,
            //     start
            // )
            this.current_sample += 128;

        };
        this.mainWorklet.setSAB(this.sample_sab);

    }

    async start() {
        await this.mainWorklet.connect();
        await this.mainWorklet.start();
        await this.mainWorklet.unpause()

    }

    pause() {
        this.mainWorklet.pause()
    }

    unpause() {
        this.mainWorklet.unpause()
    }

    setLatency(latency: 1 | 2 | 3) {
        this.queue_length = latency + 1 as 2 | 3 | 4;
    }

    addTrack(t: Track) {
        this.tracks.push(t)
    }

    scrub(sample: number) {
        this.current_sample = sample;
        this.mainWorklet.scrub(this.current_sample);
    }
}