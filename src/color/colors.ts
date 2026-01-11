export function hexToPacked(hex: string): number {
  hex = hex.replace(/^#/, '');
  let r = parseInt(hex.slice(0, 2), 16);
  let g = parseInt(hex.slice(2, 4), 16);
  let b = parseInt(hex.slice(4, 6), 16);
  let a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255;
  return (a << 24) | (b << 16) | (g << 8) | r;
}

export function packedToHex(packed: number): string {
  const r = (packed & 0xFF).toString(16).padStart(2, '0');
  const g = ((packed >>> 8) & 0xFF).toString(16).padStart(2, '0');
  const b = ((packed >>> 16) & 0xFF).toString(16).padStart(2, '0');
  const a = ((packed >>> 24) & 0xFF).toString(16).padStart(2, '0');
  return `#${r}${g}${b}${a}`;
}

export function packRGBA(r: number, g: number, b: number, a = 255): number {
  return ((a & 0xFF) << 24) | ((b & 0xFF) << 16) | ((g & 0xFF) << 8) | (r & 0xFF);
}

export function unpackRGBA(packed: number) {
  return [
    packed & 0xFF,
    (packed >>> 8) & 0xFF,
    (packed >>> 16) & 0xFF,
    (packed >>> 24) & 0xFF
  ]
}
