import { readFileSync } from 'fs';
import sharp from 'sharp';

const SVG_PATH = 'public/icon.svg';

const TARGETS: { size: number; out: string }[] = [
  { size: 192, out: 'public/icon-192.png' },
  { size: 512, out: 'public/icon-512.png' },
  { size: 180, out: 'public/apple-touch-icon.png' },
];

async function main() {
  const svgBuffer = readFileSync(SVG_PATH);
  for (const { size, out } of TARGETS) {
    await sharp(svgBuffer).resize(size, size).png().toFile(out);
    console.log(`wrote ${out} (${size}x${size})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
