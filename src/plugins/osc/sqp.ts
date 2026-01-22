import { PolyBLEPSquare } from "../pbs";

export const sqpo = {
    table: new PolyBLEPSquare(440, 2048, 4).table, // just the table
    tableSize: 2048,

    getSample(phase: number, freq: number, sampleRate = 44100) {
        // compute table index for this phase/frequency
        const idx = (phase * this.tableSize) % this.tableSize;
        const i0 = Math.floor(idx);
        const frac = idx - i0;

        // cubic interpolation
        const i1 = (i0 + 1) % this.tableSize;
        const i2 = (i0 + 2) % this.tableSize;
        const i_1 = (i0 - 1 + this.tableSize) % this.tableSize;

        const y0 = this.table[i_1];
        const y1 = this.table[i0];
        const y2 = this.table[i1];
        const y3 = this.table[i2];

        const c0 = y1;
        const c1 = 0.5 * (y2 - y0);
        const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
        const c3 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;

        const sample = ((c3 * frac + c2) * frac + c1) * frac + c0;

        // advance phase externally
        phase += freq / sampleRate;
        if (phase >= 1) phase -= 1;

        return { sample, new_phase: phase };
    }
};