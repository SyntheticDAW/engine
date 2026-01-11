(async function() {
  const blockSize = 128;
  const queueLength = 4; // 4 blocks → 512 samples total
  const sampleRate = 44100;

  // Worklet helper
  const helper = new synth.WorkletHelper(queueLength);
  await helper.init();

  // Create SAB and attach
  const sab = synth.createSampleSAB(queueLength);
  helper.setSAB(sab);
  const sampleBuffer = synth.createSampleView(sab);

  // Track absolute sample position
  let startSample = 0;

  // Example generator object
  const pr = {
    get128Samples: function(start) {
      const arr = new Float32Array(blockSize);
      for (let i = 0; i < blockSize; i++) {
        const t = (start + i) / sampleRate;
        arr[i] = Math.sin(2 * Math.PI * 440 * t) * 0.25; // 440Hz sine
      }
      return arr;
    }
  };

  // onRequest fills the requested block
  helper.onRequest = function(blockIndex) {
    const blockToFill = blockIndex % queueLength;

    // Copy generated samples into the SAB block
    sampleBuffer.set(
      pr.get128Samples(startSample),
      blockToFill * blockSize
    );

    startSample += blockSize; // advance global sample index
  };

  // Connect to output
  helper.connect();
  await helper.start();
  helper.unpause();

})();
