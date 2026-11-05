// Writes the HTML pages that Chrome headless turns into the Azqm icon PNGs.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = process.argv[2];
const fonts = process.argv[3]; // assets/fonts dir
mkdirSync(out, { recursive: true });

const defs = `
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#121C4C"/><stop offset="1" stop-color="#2D1468"/></linearGradient>
<linearGradient id="p" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF3F6C"/><stop offset="1" stop-color="#FF8552"/></linearGradient>
<linearGradient id="f" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB224"/><stop offset="1" stop-color="#FFE46B"/></linearGradient>
<linearGradient id="c" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#1FD6B2"/><stop offset="1" stop-color="#2E9DFF"/></linearGradient>
<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="108" height="108">
  <rect width="108" height="108" fill="#fff"/>
  <circle cx="69" cy="28" r="7.6" fill="#000"/>
  <circle cx="75.9" cy="33.5" r="7.6" fill="#000"/>
  <circle cx="81" cy="40.9" r="7.6" fill="#000"/>
  <g stroke="#000" stroke-width="2.2">
    <line x1="54" y1="54" x2="54" y2="20"/>
    <line x1="54" y1="54" x2="80.04" y2="75.86"/>
    <line x1="54" y1="54" x2="24.56" y2="71"/>
  </g>
</mask>`;

const slices = (a, b, c) => `
<g mask="url(#m)">
  <path d="M54 54 L54 27 A27 27 0 0 1 74.68 71.36 Z" fill="${a}"/>
  <path d="M54 54 L74.68 71.36 A27 27 0 0 1 30.62 67.5 Z" fill="${b}"/>
  <path d="M54 54 L30.62 67.5 A27 27 0 0 1 54 27 Z" fill="${c}"/>
</g>`;
const crumbs = (a, b) => `<circle cx="72.6" cy="36.4" r="1.5" fill="${a}"/><circle cx="68.4" cy="31.2" r="1" fill="${b}"/>`;
const bgRect = `<rect width="108" height="108" fill="url(#bg)"/>`;
const color = slices('url(#p)', 'url(#f)', 'url(#c)') + crumbs('#FFE46B', '#FF8552');
const mono = slices('#fff', '#fff', '#fff') + crumbs('#fff', '#fff');

const svg = (viewBox, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%"><defs>${defs}</defs>${body}</svg>`;
const page = (w, h, inner, css = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:transparent}${css}</style></head><body>${inner}</body></html>`;

const full = '0 0 108 108';    // adaptive layers: 108 dp canvas
const visible = '18 18 72 72'; // what a launcher / Play shows

const jobs = {
  'icon': [1024, 1024, svg(visible, bgRect + color)],
  'icon-512': [512, 512, svg(visible, bgRect + color)],
  'favicon': [48, 48, svg(visible, bgRect + color)],
  'android-icon-background': [1024, 1024, svg(full, bgRect)],
  'android-icon-foreground': [1024, 1024, svg(full, color)],
  'android-icon-monochrome': [1024, 1024, svg(full, mono)],
  'splash-icon': [1024, 1024, svg(full, color)],
  'preview-circle': [432, 432, `<div style="width:432px;height:432px;border-radius:50%;overflow:hidden">${svg(visible, bgRect + color)}</div>`],
  'preview-mono': [432, 432, `<div style="width:432px;height:432px;border-radius:50%;overflow:hidden;background:#3B3F4A">${svg(visible, mono.replaceAll('#fff', '#D7E3FF'))}</div>`],
};

const f = (n) => pathToFileURL(join(fonts, n)).href;
const fgCss = `
@font-face{font-family:U;src:url(${f('Unbounded_700Bold.ttf')})}
@font-face{font-family:O;src:url(${f('Onest_600SemiBold.ttf')});font-weight:600}
@font-face{font-family:O;src:url(${f('Onest_700Bold.ttf')});font-weight:700}
.fg{width:1024px;height:500px;position:relative;background:linear-gradient(115deg,#0A1033 0%,#141A52 45%,#2A1163 100%);font-family:O,sans-serif;color:#fff}
.glow{position:absolute;width:520px;height:520px;left:-80px;top:-10px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,63,108,.28),rgba(255,63,108,0))}
.tile{position:absolute;left:84px;top:110px;width:280px;height:280px;border-radius:62px;overflow:hidden;box-shadow:0 24px 60px -18px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.08)}
.txt{position:absolute;left:432px;top:118px;display:flex;flex-direction:column;gap:14px}
h1{font-family:U,sans-serif;font-weight:700;font-size:92px;line-height:1;margin:0 0 10px;letter-spacing:-1px}
.tag{font-size:35px;font-weight:700;color:#FF7C95}
.sub{font-size:26px;font-weight:600;color:#C8C6EC;line-height:1.35}
.dots{display:flex;gap:10px;margin-top:6px}.dots i{width:14px;height:14px;border-radius:50%}`;
jobs['feature-graphic-1024x500'] = [1024, 500, `<div class="fg"><div class="glow"></div>
<div class="tile">${svg(visible, bgRect + color)}</div>
<div class="txt"><h1>Azqm</h1><div class="tag">Калории, макроси, витамини</div>
<div class="sub">14 хранителни режима · 1000+ храни<br>интервално хранене · анализ</div>
<div class="dots"><i style="background:#FF3F6C"></i><i style="background:#FFB224"></i><i style="background:#1FD6B2"></i></div></div></div>`, fgCss];

for (const [name, [w, h, inner, css]] of Object.entries(jobs)) {
  writeFileSync(join(out, `${name}.html`), page(w, h, inner, css));
  console.log(`${name} ${w} ${h}`);
}
