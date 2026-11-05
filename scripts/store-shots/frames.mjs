// Google Play advert frames, style "Night glow" (chosen 2026-11-05): writes one HTML page per frame; Chrome headless
// turns them into 1080×1920 PNGs (see PROJECT_NOTES.md).
//   node scripts/store-shots/frames.mjs <raw screenshots dir> <pages dir> <fonts dir>
// Raw screenshots come from store-screenshots.yml (1080×2400, <lang>-<n>-<screen>.png).
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [raw, out, fonts] = process.argv.slice(2).map((p) => resolve(p));
mkdirSync(out, { recursive: true });
const url = (p) => pathToFileURL(p).href;

// crop = the part of the screenshot that is enlarged next to the phone, as fractions of the screenshot
// (x1, x2, y1, y2); top = where it sits, in % of the frame width
const FRAMES = [
  { shot: '0-today-fasting', crop: [0.44, 0.97, 0.272, 0.485], top: 100,
    en: ['Every calorie. Every macro.', 'Your whole day at one glance'],
    bg: ['Всяка калория. Всеки макрос.', 'Целият ден с един поглед'] },
  { shot: '2-add', crop: [0.044, 0.963, 0.325, 0.45], top: 108,
    en: ['1000+ foods, one tap to log', 'Search, barcode or your own dishes'],
    bg: ['1000+ храни с едно докосване', 'Търсене, баркод или ваши ястия'] },
  { shot: '3-analysis', crop: [0.04, 0.96, 0.42, 0.6], top: 112,
    en: ['See how your week really went', 'Averages, vitamins and minerals'],
    bg: ['Вижте как върви седмицата', 'Средни стойности, витамини и минерали'] },
  { shot: '4-fasting', crop: [0.03, 0.97, 0.552, 0.637], top: 128,
    en: ['Fasting 16:8, timed for you', 'From 12:12 to 20:4, with water'],
    bg: ['Пост 16:8 с таймер', 'От 12:12 до 20:4, с вода и електролити'] },
  { shot: '5-progress', crop: [0.04, 0.96, 0.66, 0.83], top: 122,
    en: ['Watch the scale go down', 'Weight trend and forecast · Pro'],
    bg: ['Гледайте как теглото слиза', 'Тренд и прогноза · Pro'] },
  { shot: '6-diets', crop: { en: [0.04, 0.96, 0.213, 0.372], bg: [0.04, 0.96, 0.44, 0.645] }, top: { en: 96, bg: 112 },
    en: ['14 diets. Yours is here.', 'Keto, Mediterranean, Zone and more'],
    bg: ['14 диети. Вашата е тук.', 'Кето, Узунов, средиземноморска…'] },
  { shot: '7-themes', crop: [0.03, 0.97, 0.348, 0.545], top: 104,
    en: ['10 themes to make it yours', '2 free, 8 with Pro · no ads'],
    bg: ['10 теми по ваш вкус', '2 безплатни, 8 с Pro · без реклами'] },
];

const css = `
@font-face{font-family:U;src:url(${url(join(fonts, 'Unbounded_800ExtraBold.ttf'))})}
@font-face{font-family:O;font-weight:600;src:url(${url(join(fonts, 'Onest_600SemiBold.ttf'))})}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#0B1236}
.f{position:relative;width:1080px;height:1920px;overflow:hidden;--u:10.8px;
  background:radial-gradient(circle at 85% 12%,rgba(255,63,108,.55),transparent 42%),radial-gradient(circle at 5% 92%,rgba(31,214,178,.40),transparent 48%),linear-gradient(165deg,#0B1236 0%,#1C1250 55%,#2A1163 100%)}
.txt{position:absolute;top:calc(9*var(--u));left:calc(8*var(--u));right:calc(8*var(--u));display:flex;flex-direction:column;gap:calc(2.6*var(--u))}
.hl{font-family:U,sans-serif;color:#fff;font-size:calc(8.2*var(--u));line-height:1.08;letter-spacing:-.02em;text-wrap:balance}
.sub{font-family:O,sans-serif;font-weight:600;color:#CFCBF0;font-size:calc(4.4*var(--u))}
.phone{position:absolute;left:calc(17*var(--u));top:calc(60*var(--u));width:calc(62*var(--u));border-radius:calc(7*var(--u));border:calc(1.5*var(--u)) solid #05050B;background:#05050B;overflow:hidden;
  transform:rotate(-5deg);box-shadow:0 calc(5*var(--u)) calc(12*var(--u)) rgba(0,0,0,.55),0 0 calc(14*var(--u)) rgba(255,63,108,.28)}
.phone img{display:block;width:100%;border-radius:calc(5.5*var(--u))}
.crop{position:absolute;right:calc(4*var(--u));width:calc(60*var(--u));overflow:hidden;border-radius:calc(3.5*var(--u));border:calc(.9*var(--u)) solid #FF5C7F;
  transform:rotate(3deg);box-shadow:0 calc(4*var(--u)) calc(9*var(--u)) rgba(0,0,0,.6);background:#111}
.crop img{position:absolute;max-width:none}`;

const list = [];
for (const lang of ['en', 'bg']) {
  FRAMES.forEach((f, i) => {
    const img = join(raw, `${lang}-${f.shot}.png`);
    const [x1, x2, y1, y2] = Array.isArray(f.crop) ? f.crop : f.crop[lang];
    const top = typeof f.top === 'number' ? f.top : f.top[lang];
    const [hl, sub] = f[lang];
    const w = x2 - x1, h = y2 - y1;
    const aspect = (w * 1080) / (h * 2400);
    const cropImg = `width:${100 / w}%;left:${(-100 * x1) / w}%;top:${(-100 * y1) / h}%`;
    const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="f">
  <div class="txt"><div class="hl">${hl}</div><div class="sub">${sub}</div></div>
  <div class="phone"><img src="${url(img)}"></div>
  <div class="crop" style="top:calc(${top}*var(--u));aspect-ratio:${aspect.toFixed(4)}"><img src="${url(img)}" style="${cropImg}"></div>
</div></body></html>`;
    const name = `${lang}-${i + 1}`;
    writeFileSync(join(out, `${name}.html`), html);
    list.push(name);
  });
}
console.log(list.join('\n'));
