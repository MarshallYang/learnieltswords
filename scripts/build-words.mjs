#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, '../src/data/words.json');

const STOP = new Set(`a an the and or but if as of to in on at by for with from into onto upon
is are was were be been being am do does did doing done have has had having
i you he she it we they me him her us them my your his its our their
this that these those who whom whose which what where when why how
not no nor so too very just also only both each every either neither
can could will would shall should may might must need dare
about above after again against all almost along already always among
any anyone anything anywhere because before behind below between beyond
during enough even ever every everywhere few first further get got
here how however into itself just like many more most much never next
off once other others our out over own same such than then there therefore
though through thus under until up upon via well what when where
whether while who whom why with within without yes yet you your yours
www etc com org http https pdf hrs hmm huh yeah`.split(/\s+/));

function norm(w) {
  return String(w || '').trim().toLowerCase().replace(/[^a-z\-']/g, '');
}

function cleanTrans(t) {
  if (!t) return '';
  let s = Array.isArray(t) ? t.join('；') : String(t);
  s = s.split(/【记忆】|【同义】|【反义】|【考点】/)[0];
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 160) s = s.slice(0, 157) + '…';
  return s;
}

function extractPos(meaning) {
  const m = meaning.match(/\b(n|v|vt|vi|adj|adv|prep|conj|pron|num|int|aux)\.?\b/i);
  if (!m) return undefined;
  const map = { n: 'n.', v: 'v.', vt: 'vt.', vi: 'vi.', adj: 'adj.', adv: 'adv.', prep: 'prep.', conj: 'conj.', pron: 'pron.', num: 'num.', int: 'int.', aux: 'aux.' };
  return map[m[1].toLowerCase()] || (m[0].endsWith('.') ? m[0] : m[0] + '.');
}

function cleanPhone(p) {
  if (!p) return undefined;
  let s = String(p).trim();
  if (!s) return undefined;
  if (!s.startsWith('/') && !s.startsWith('[')) s = '/' + s.replace(/^\[|\]$/g, '') + '/';
  return s;
}

const map = new Map();

function upsert(word, { meaningZh, phonetic, pos, exampleEn, source }) {
  const w = norm(word);
  if (!w || w.length < 2 || w.length > 28 || STOP.has(w)) return;
  if (/^\d+$/.test(w)) return;
  const meaning = cleanTrans(meaningZh);
  if (!meaning) return;

  if (!map.has(w)) {
    map.set(w, {
      word: w,
      meaningZh: meaning,
      phonetic: cleanPhone(phonetic),
      pos: pos || extractPos(meaning),
      exampleEn: exampleEn || undefined,
      sources: new Set([source]),
    });
  } else {
    const e = map.get(w);
    e.sources.add(source);
    if (meaning.length > e.meaningZh.length) e.meaningZh = meaning;
    if (!e.phonetic && phonetic) e.phonetic = cleanPhone(phonetic);
    if (!e.pos) e.pos = pos || extractPos(meaning);
    if (!e.exampleEn && exampleEn) e.exampleEn = exampleEn;
  }
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

for (const row of loadJson('/tmp/bible.json')) {
  upsert(row.name, { meaningZh: row.trans, phonetic: row.usphone || row.ukphone, source: 'bible' });
}
for (const row of loadJson('/tmp/duck.json')) {
  upsert(row.name, { meaningZh: row.trans, phonetic: row.ukphone || row.usphone, source: 'duck' });
}
for (const row of loadJson('/tmp/king807.json')) {
  upsert(row.name, { meaningZh: row.trans, phonetic: row.ukphone || row.usphone, source: 'king807' });
}

{
  const text = fs.readFileSync('/tmp/ielts3600.csv', 'utf8');
  const lines = text.split(/\r?\n/).slice(1);
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = line.match(/^([^,]+),(.*),(\d+),([^,]*),(.*)$/);
    if (m) upsert(m[1], { meaningZh: m[2], phonetic: m[5], source: 'csv3600' });
  }
}

for (const row of loadJson('/tmp/cet6.json')) {
  upsert(row.name, { meaningZh: row.trans, phonetic: row.ukphone || row.usphone, source: 'cet6' });
}
for (const row of loadJson('/tmp/xdf7000.json')) {
  upsert(row.name, { meaningZh: row.trans, phonetic: row.ukphone || row.usphone, source: 'xdf' });
}
for (const row of loadJson('/tmp/toeflzh.json')) {
  upsert(row.name, { meaningZh: row.trans, phonetic: row.ukphone || row.usphone, source: 'toeflzh' });
}

try {
  for (const row of loadJson('/tmp/toefl.json')) {
    const existing = map.get(norm(row.word));
    const ex = row.example_sentence;
    if (existing && ex && !existing.exampleEn) {
      existing.exampleEn = ex.length > 200 ? ex.slice(0, 197) + '…' : ex;
      existing.sources.add('toefl');
    }
  }
} catch {}

function pickTier(e) {
  const s = e.sources;
  const inCet = s.has('cet6');
  const inIeltsCore = s.has('bible') || s.has('duck') || s.has('king807') || s.has('csv3600');
  const inAdv = s.has('xdf') || s.has('toeflzh');

  // foundation: CET6 words that are also common, or CET6-only short words
  if (inCet && !inAdv) return 'foundation';
  if (inCet && inIeltsCore && e.word.length <= 7) return 'foundation';

  // advanced: appear only in XDF/TOEFL, or longer academic forms
  if (inAdv && !inIeltsCore && !inCet) return 'advanced';
  if (inAdv && e.word.length >= 11 && !inCet) return 'advanced';

  // everything else from IELTS lists = core
  if (inIeltsCore) return 'core';
  if (inAdv) return 'advanced';
  if (inCet) return 'foundation';
  return 'core';
}

let words = [...map.values()].map((e) => ({
  word: e.word,
  phonetic: e.phonetic || undefined,
  meaningZh: e.meaningZh,
  pos: e.pos || undefined,
  exampleEn: e.exampleEn || undefined,
  tier: pickTier(e),
  _srcCount: e.sources.size,
}));

// Prefer words that appear in more sources; cap 7500 with balanced tiers
words.sort((a, b) => b._srcCount - a._srcCount || a.word.localeCompare(b.word));

const TARGET = 7500;
const quotas = { foundation: 2200, core: 3800, advanced: 1500 };
const buckets = { foundation: [], core: [], advanced: [] };
for (const w of words) buckets[w.tier].push(w);

const selected = [];
for (const tier of ['foundation', 'core', 'advanced']) {
  selected.push(...buckets[tier].slice(0, quotas[tier]));
}
// fill remainder from leftovers by source count
if (selected.length < TARGET) {
  const taken = new Set(selected.map((w) => w.word));
  for (const w of words) {
    if (selected.length >= TARGET) break;
    if (!taken.has(w.word)) {
      selected.push(w);
      taken.add(w.word);
    }
  }
}

const final = selected
  .sort((a, b) => a.word.localeCompare(b.word))
  .map(({ _srcCount, ...w }, i) => ({ id: i + 1, ...w }));

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(final));

const counts = { foundation: 0, core: 0, advanced: 0 };
for (const w of final) counts[w.tier]++;
console.log(JSON.stringify({
  total: final.length,
  ...counts,
  withPhonetic: final.filter((w) => w.phonetic).length,
  withExample: final.filter((w) => w.exampleEn).length,
}, null, 2));
