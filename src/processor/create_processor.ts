const processorCode = `
class SABWaveProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.blockSize = 128;
    this.queueLength = options.processorOptions.queueLength || 4;
    this.sampleBuffer = null;
    this.readIndex = 0;
    this.paused = false;
    this.globalSampleIndex = 0;
    this.counterView = null;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (data.type === 'waveBuffer' && data.buffer instanceof SharedArrayBuffer) {
        this.sampleBuffer = new Float32Array(data.buffer);
      } else if (data.type === 'pause') {
        this.paused = true;
        if (this.sampleBuffer) this.sampleBuffer.fill(0);
      } else if (data.type === 'unpause') {
        this.paused = false;
      } else if (data.type === 'scrub' && typeof data.sampleIndex === 'number') {
        this.globalSampleIndex = data.sampleIndex;
        this.readIndex = Math.floor(this.globalSampleIndex / this.blockSize);
        if (this.sampleBuffer) this.sampleBuffer.fill(0);
      } else if (data.type === 'sampleCounter' && data.buffer instanceof SharedArrayBuffer) {
        this.counterView = new Uint32Array(data.buffer);
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const channel = output[0];

    if (this.paused || !this.sampleBuffer) {
      channel.fill(0);
      return true;
    }

    const blockOffset = (this.readIndex % this.queueLength) * this.blockSize;
    for (let i = 0; i < this.blockSize; i++) {
      channel[i] = this.sampleBuffer[blockOffset + i];
    }

    this.port.postMessage({ type: 'requestBuffer', blockIndex: this.readIndex });

    this.readIndex++;
    this.globalSampleIndex += this.blockSize;

    if (this.counterView) {
      this.counterView[0] = this.globalSampleIndex;
    }

    return true;
  }
}

registerProcessor('SABWaveProcessor', SABWaveProcessor);
`;


export function createWorkletBlob(): string {
  const blob = new Blob([processorCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

/**
 * creates a shared array buffer for samples
 * @param latency - call it smoothing for the user - 2 is low smoothing but low latency, 4 is very smooth but slightly higher latency
 */
export function createSampleSAB(latency: 2 | 3 | 4) {
  return new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * 128 * latency);
}

export function createSampleView(sab: SharedArrayBuffer) {
  return new Float32Array(sab);
}

type RequestCallback = (blockIndex: number) => void;

export class WorkletHelper {
  node!: AudioWorkletNode;
  audioCtx: AudioContext;
  sampleBuffer: Float32Array | null = null;
  sampleCounter: Uint32Array;
  queueLength: number;
  blockSize: number = 128;
  onRequest: RequestCallback = () => {};

  constructor(queueLength: number = 4, existingAudioCtx?: AudioContext) {
    this.queueLength = queueLength;
    this.audioCtx = existingAudioCtx || new AudioContext({ sampleRate: 44100 });

    // Create counter SAB
    const counterSAB = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);
    this.sampleCounter = new Uint32Array(counterSAB);
  }

  // Async initialization to load worklet and create node
  async init() {
    const workletURL = createWorkletBlob(); // blob URL from your processor code
    await this.audioCtx.audioWorklet.addModule(workletURL);

    this.node = new AudioWorkletNode(this.audioCtx, 'SABWaveProcessor', {
      processorOptions: { queueLength: this.queueLength },
    });

    // Send counter SAB to processor
    this.node.port.postMessage({ type: 'sampleCounter', buffer: this.sampleCounter.buffer });

    // Handle block requests
    this.node.port.onmessage = (event) => {
      if (event.data.type === 'requestBuffer') {
        const blockIndex = event.data.blockIndex % this.queueLength;
        this.onRequest(blockIndex);
      }
    };
  }

  setSAB(sab: SharedArrayBuffer) {
    this.sampleBuffer = new Float32Array(sab);
    this.node?.port.postMessage({ type: 'waveBuffer', buffer: sab });
  }

  pause() {
    this.node?.port.postMessage({ type: 'pause' });
  }

  unpause() {
    this.node?.port.postMessage({ type: 'unpause' });
  }

  scrub(sampleIndex: number) {
    this.node?.port.postMessage({ type: 'scrub', sampleIndex });
    this.sampleCounter[0] = sampleIndex;
  }

  connect(dest?: AudioNode) {
    if (dest) this.node?.connect(dest);
    else this.node?.connect(this.audioCtx.destination);
  }

  disconnect() {
    this.node?.disconnect();
  }

  async start() {
    if (this.audioCtx.state !== 'running') await this.audioCtx.resume();
  }

  getCurrentSampleIndex(): number {
    return this.sampleCounter[0];
  }
}


