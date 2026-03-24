import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

// Create an SVG icon matching the blue controller + clock design
const createIconSVG = (size) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea"/>
      <stop offset="100%" style="stop-color:#764ba2"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <!-- Controller body -->
  <g transform="translate(256,270)" fill="none" stroke="white" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">
    <!-- Controller outline -->
    <path d="M-60,-20 C-60,-70 -50,-90 0,-90 C50,-90 60,-70 60,-20" fill="none"/>
    <path d="M-60,-20 C-90,-10 -130,10 -140,50 C-150,90 -120,110 -90,100 C-60,90 -50,60 -40,30 L-30,10" fill="none"/>
    <path d="M60,-20 C90,-10 130,10 140,50 C150,90 120,110 90,100 C60,90 50,60 40,30 L30,10" fill="none"/>
    <!-- D-pad -->
    <line x1="-100" y1="30" x2="-100" y2="10"/>
    <line x1="-110" y1="20" x2="-90" y2="20"/>
    <!-- Buttons -->
    <circle cx="100" cy="15" r="4" fill="white"/>
    <circle cx="110" cy="25" r="4" fill="white"/>
  </g>
  <!-- Clock face -->
  <circle cx="256" cy="240" r="75" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="10"/>
  <!-- Clock hour marks -->
  ${[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
    const angle = (i * 30 - 90) * Math.PI / 180;
    const r1 = 62, r2 = 68;
    const x1 = 256 + r1 * Math.cos(angle);
    const y1 = 240 + r1 * Math.sin(angle);
    const x2 = 256 + r2 * Math.cos(angle);
    const y2 = 240 + r2 * Math.sin(angle);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
  }).join('\n  ')}
  <!-- Clock hands - showing ~10:10 -->
  <!-- Hour hand -->
  <line x1="256" y1="240" x2="238" y2="200" stroke="white" stroke-width="8" stroke-linecap="round"/>
  <!-- Minute hand -->
  <line x1="256" y1="240" x2="274" y2="195" stroke="white" stroke-width="6" stroke-linecap="round"/>
  <!-- Center dot -->
  <circle cx="256" cy="240" r="5" fill="white"/>
  <!-- App name -->
  <text x="256" y="380" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="48" fill="white" opacity="0.95">FlexTime</text>
</svg>`;
};

// Generate icons at different sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  mkdirSync(join(publicDir, 'icons'), { recursive: true });

  for (const size of sizes) {
    const svg = createIconSVG(size);
    const buffer = Buffer.from(svg);
    await sharp(buffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, 'icons', `icon-${size}x${size}.png`));
    console.log(`Generated icon-${size}x${size}.png`);
  }

  // Generate apple-touch-icon (180x180)
  const appleSvg = createIconSVG(180);
  await sharp(Buffer.from(appleSvg))
    .resize(180, 180)
    .png()
    .toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // Generate favicon as PNG (32x32)
  const faviconSvg = createIconSVG(32);
  await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png()
    .toFile(join(publicDir, 'favicon.png'));
  console.log('Generated favicon.png');

  // Generate maskable icon (512 with padding)
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea"/>
        <stop offset="100%" style="stop-color:#764ba2"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg)"/>
    <!-- Clock face - centered, with safe zone padding -->
    <circle cx="256" cy="230" r="85" fill="rgba(255,255,255,0.15)" stroke="white" stroke-width="10"/>
    ${[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
      const angle = (i * 30 - 90) * Math.PI / 180;
      const r1 = 70, r2 = 78;
      const x1 = 256 + r1 * Math.cos(angle);
      const y1 = 230 + r1 * Math.sin(angle);
      const x2 = 256 + r2 * Math.cos(angle);
      const y2 = 230 + r2 * Math.sin(angle);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
    }).join('\n    ')}
    <line x1="256" y1="230" x2="238" y2="190" stroke="white" stroke-width="8" stroke-linecap="round"/>
    <line x1="256" y1="230" x2="274" y2="185" stroke="white" stroke-width="6" stroke-linecap="round"/>
    <circle cx="256" cy="230" r="5" fill="white"/>
    <!-- Controller hints -->
    <g transform="translate(256,260)" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" opacity="0.8">
      <path d="M-50,-10 C-75,0 -95,20 -100,45 C-105,70 -85,80 -65,70"/>
      <path d="M50,-10 C75,0 95,20 100,45 C105,70 85,80 65,70"/>
    </g>
    <text x="256" y="380" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="44" fill="white" opacity="0.95">FlexTime</text>
  </svg>`;
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'icons', 'maskable-icon-512x512.png'));
  console.log('Generated maskable-icon-512x512.png');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
