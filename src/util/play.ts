
export function playFloat32Array(samples: Float32Array<ArrayBuffer>, sampleRate: number = 44100): void {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

  const buffer = audioCtx.createBuffer(1, samples.length, sampleRate);

  buffer.copyToChannel(samples, 0, 0);

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);

  source.start();
}
