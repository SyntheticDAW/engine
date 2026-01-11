type BlockSize = 128 | 256 | 384 | 512;

const blockBuffers: Record<BlockSize, Float32Array> = {
  128: new Float32Array(128),
  256: new Float32Array(256),
  384: new Float32Array(384),
  512: new Float32Array(512),
};

export function sumBlocks(tracks: Float32Array[], start: number, blockSize: BlockSize): Float32Array {
  if (!(blockSize in blockBuffers)) throw new Error(`Invalid block size: ${blockSize}`);

  const temp = blockBuffers[blockSize];
  if (temp.length !== blockSize) throw new Error(`Buffer length mismatch`);

  temp.fill(0);

  for (const track of tracks) {
    for (let i = 0; i < blockSize; i++) {
      const sampleIndex = start + i;
      if (sampleIndex < track.length) temp[i] += track[sampleIndex];
    }
  }

  for (let i = 0; i < blockSize; i++) {
    const s = temp[i];
    temp[i] = s > 1 ? 1 : s < -1 ? -1 : s;
  }

  return temp;
}

export function sumTracks(tracks: Float32Array[], blockSize: 128 | 256 | 384 | 512): Float32Array {
  if (tracks.length === 0) return new Float32Array(0);

  // Find the maximum length among tracks
  const maxLength = Math.max(...tracks.map(t => t.length));
  const numBlocks = Math.ceil(maxLength / blockSize);
  const summed = new Float32Array(maxLength);

  for (let b = 0; b < numBlocks; b++) {
    const start = b * blockSize;

    // sumBlock clamps values automatically
    const blockSum = sumBlocks(tracks, start, blockSize);

    // Copy block into the summed array
    for (let i = 0; i < blockSum.length && start + i < maxLength; i++) {
      summed[start + i] = blockSum[i];
    }
  }

  return summed;
}
