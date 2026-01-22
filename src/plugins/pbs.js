// PolyBLEP square (single cycle) with cubic interpolation
export class PolyBLEPSquare {
    constructor(freq = 440, tableSize = 1024, oversample = 4) {
        this.phase = 0;
        this.freq = freq;
        this.tableSize = tableSize;
        this.oversample = oversample;
        this.table = new Float32Array(tableSize);

        // Generate 1 cycle of PolyBLEP square
        const dt = 1 / (tableSize * oversample);
        let phase = 0;

        for (let i = 0; i < tableSize; i++) {
            let s = phase < 0.5 ? 1.0 : -1.0;
            s -= this.polyblep(phase, dt);
            s += this.polyblep((phase + 0.5) % 1.0, dt);
            this.table[i] = s;

            phase += 1 / tableSize;
            if (phase >= 1.0) phase -= 1.0;
        }
    }

    polyblep(t, dt) {
        if (t < dt) {
            const x = t / dt;
            return x + x - x * x - 1.0;
        } else if (t > 1.0 - dt) {
            const x = (t - 1.0) / dt;
            return x * x + x + x + 1.0;
        } else {
            return 0;
        }
    }

    // Cubic interpolation helper
    cubicInterp(y0, y1, y2, y3, frac) {
        const c0 = y1;
        const c1 = 0.5 * (y2 - y0);
        const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
        const c3 = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
        return ((c3 * frac + c2) * frac + c1) * frac + c0;
    }

    // Play this wavetable at any frequency
    nextSample(freq, sampleRate) {
        const phaseInc = freq / sampleRate * this.tableSize;
        const idx = this.phase;
        const i1 = Math.floor(idx);
        const frac = idx - i1;

        // wrap indices for cubic
        const i0 = (i1 - 1 + this.tableSize) % this.tableSize;
        const i2 = (i1 + 1) % this.tableSize;
        const i3 = (i1 + 2) % this.tableSize;

        const sample = this.cubicInterp(
            this.table[i0],
            this.table[i1],
            this.table[i2],
            this.table[i3],
            frac
        );

        this.phase += phaseInc;
        if (this.phase >= this.tableSize) this.phase -= this.tableSize;

        return sample;
    }
}