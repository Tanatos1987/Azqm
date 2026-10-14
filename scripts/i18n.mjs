// Translation catalogs for the languages other than Bulgarian and English (see src/i18n/index.tsx).
//   node scripts/i18n.mjs check          — every key has a translation in every catalog, placeholders match
//   node scripts/i18n.mjs jobs <dir>     — writes <lang>.ui.json / <lang>.foods.json with what is missing, for translating
//
// Keys are the English texts the app passes to tr(): string arguments of tr('бг', 'en') calls, Bulgarian/English pairs
// inside data tables (['Месо', 'Meat']), the diet lists (pick([...bg], [...en])) and the English portion labels of the
// food database. Food names are translated by food id in src/i18n/foods/<lang>.json.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const LOCALES = path.join(SRC, 'i18n/locales');
const FOODS = path.join(SRC, 'i18n/foods');
const MAP_DIR = path.join(ROOT, 'data-src/foodmap');
const EN_DIR = path.join(ROOT, 'data-src/foodmap-en');
const LANGS = fs.readdirSync(LOCALES).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();

const CYRILLIC = /[Ѐ-ӿ]/;
const isString = (n) => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n));

/** key (English) → { bg, where[], code } — `code` is the source line of the first use, as context for translators. */
function extractUiKeys() {
  const keys = new Map();
  const add = (en, bg, where, code) => {
    if (!en.trim()) return;
    const k = keys.get(en) ?? { bg, where: [], code: code.trim().slice(0, 200) };
    if (k.where.length < 3) k.where.push(where);
    keys.set(en, k);
  };
  const files = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f) && !f.includes('.generated.')) files.push(p);
    }
  })(SRC);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const src = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const lines = text.split('\n');
    const lineOf = (n) => src.getLineAndCharacterOfPosition(n.getStart()).line;
    const where = (n) => `${path.relative(ROOT, file)}:${lineOf(n) + 1}`;
    const code = (n) => lines[lineOf(n)];
    (function visit(n) {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const [a, b] = n.arguments;
        if (n.expression.text === 'tr' && isString(a) && isString(b)) add(b.text, a.text, where(n), code(n));
        if (n.expression.text === 'pick' && a && b && ts.isArrayLiteralExpression(a) && ts.isArrayLiteralExpression(b)) {
          b.elements.forEach((e, i) => isString(e) && add(e.text, isString(a.elements[i]) ? a.elements[i].text : '', where(e), code(e)));
        }
      }
      // Data tables: a Bulgarian string followed by its English counterpart, e.g. ['meat', 'Месо', 'Meat', '🥩'].
      if (ts.isArrayLiteralExpression(n)) {
        const el = n.elements;
        for (let i = 0; i + 1 < el.length; i++) {
          if (isString(el[i]) && isString(el[i + 1]) && CYRILLIC.test(el[i].text) && !CYRILLIC.test(el[i + 1].text)) {
            add(el[i + 1].text, el[i].text, where(el[i]), code(el[i]));
          }
        }
      }
      ts.forEachChild(n, visit);
    })(src);
  }
  // Household portions of the food database ("1 slice", "1 cup (250 ml)").
  for (const [, food] of foodEntries()) {
    food.portions.forEach((p) => p.en && add(p.en, p.bg, `data-src/foodmap-en (${food.id})`, `household portion of the food "${food.en}"`));
  }
  return keys;
}

/** id → { id, bg, en, portions: [{ bg, en }] } from the food mapping files. */
function foodEntries() {
  const out = new Map();
  for (const file of fs.readdirSync(MAP_DIR).filter((f) => f.endsWith('.json')).sort()) {
    const list = JSON.parse(fs.readFileSync(path.join(MAP_DIR, file), 'utf8'));
    const enFile = path.join(EN_DIR, file);
    const en = fs.existsSync(enFile) ? JSON.parse(fs.readFileSync(enFile, 'utf8')) : {};
    for (const e of list) {
      const t = en[e.id] ?? {};
      out.set(e.id, {
        id: e.id,
        bg: e.name,
        en: t.name ?? '',
        portions: (e.portions ?? []).map(([label], i) => ({ bg: label, en: t.portions?.[i] ?? '' })),
      });
    }
  }
  return out;
}

/** Names used in placeholders: "{n} {n|entry|entries} for {diet}" → ["diet", "n"]. A translation may use a name more often. */
function placeholders(s) {
  return [...new Set([...s.matchAll(/\{(\w+)(?:\|[^{}]*)?\}/g)].map((m) => m[1]))].sort();
}

function pluralForms(s) {
  return [...s.matchAll(/\{\w+\|([^{}]*)\}/g)].map((m) => m[1].split('|').length);
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
}

function check() {
  const keys = extractUiKeys();
  const foods = foodEntries();
  let problems = 0;
  for (const lang of LANGS) {
    const ui = readJson(path.join(LOCALES, `${lang}.json`));
    const names = readJson(path.join(FOODS, `${lang}.json`));
    const missing = [...keys.keys()].filter((k) => typeof ui[k] !== 'string' || !ui[k].trim());
    const unused = Object.keys(ui).filter((k) => !keys.has(k));
    const badPlaceholders = [...keys.keys()].filter((k) => typeof ui[k] === 'string' && placeholders(ui[k]).join() !== placeholders(k).join());
    const wantForms = lang === 'ru' ? 3 : 2;
    const badPlurals = [...keys.keys()].filter((k) => typeof ui[k] === 'string' && pluralForms(ui[k]).some((n) => n !== wantForms));
    const missingFoods = [...foods.keys()].filter((id) => typeof names[id] !== 'string' || !names[id].trim());
    const unknownFoods = Object.keys(names).filter((id) => !foods.has(id));
    console.log(
      `${lang}: ${keys.size - missing.length}/${keys.size} texts, ${foods.size - missingFoods.length}/${foods.size} foods` +
        (unused.length ? `, ${unused.length} unused` : '') +
        (unknownFoods.length ? `, ${unknownFoods.length} unknown food ids` : ''),
    );
    const list = (title, items) => items.length && console.log(`  ${title}:\n${items.slice(0, 15).map((s) => `    ${JSON.stringify(s)}`).join('\n')}${items.length > 15 ? `\n    … ${items.length - 15} more` : ''}`);
    list('missing', missing);
    list('placeholders differ from English', badPlaceholders);
    list(`plural needs ${wantForms} forms`, badPlurals);
    list('missing foods', missingFoods);
    problems += missing.length + badPlaceholders.length + badPlurals.length + missingFoods.length;
  }
  if (problems) {
    console.error(`\n${problems} translation problems. Missing texts show in English. Run \`node scripts/i18n.mjs jobs <dir>\` for lists to translate.`);
    process.exit(1);
  }
}

function jobs(dir) {
  if (!dir) throw new Error('usage: node scripts/i18n.mjs jobs <dir>');
  fs.mkdirSync(dir, { recursive: true });
  const keys = extractUiKeys();
  const foods = foodEntries();
  for (const lang of LANGS) {
    const ui = readJson(path.join(LOCALES, `${lang}.json`));
    const names = readJson(path.join(FOODS, `${lang}.json`));
    const uiJob = [...keys].filter(([k]) => typeof ui[k] !== 'string').map(([en, { bg, where, code }]) => ({ en, bg, where, code }));
    const foodJob = [...foods.values()].filter((f) => typeof names[f.id] !== 'string').map(({ id, en, bg }) => ({ id, en, bg }));
    fs.writeFileSync(path.join(dir, `${lang}.ui.json`), JSON.stringify(uiJob, null, 1));
    fs.writeFileSync(path.join(dir, `${lang}.foods.json`), JSON.stringify(foodJob, null, 1));
    console.log(`${lang}: ${uiJob.length} texts, ${foodJob.length} foods → ${dir}`);
  }
}

const [cmd = 'check', arg] = process.argv.slice(2);
if (cmd === 'check') check();
else if (cmd === 'jobs') jobs(arg);
else throw new Error(`unknown command ${cmd}`);
