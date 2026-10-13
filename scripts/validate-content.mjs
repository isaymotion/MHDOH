// Validates every data file: required fields, citations that resolve, quiz answers in range.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const load = (f) => JSON.parse(readFileSync(join(root, f), 'utf8'));
const errors = [];
const err = (m) => errors.push(m);

const meta = load('meta.json');
const sections = load('sections.json');
const glossary = load('glossary.json');
const questions = load('questions.json');
const lessons = load('lessons.json');
const flashcards = load('flashcards.json');
const scenarios = load('scenarios.json');
const paths = load('paths.json');
const checklist = load('checklist.json');
const comparison = load('comparison.json');

const docIds = new Set(meta.documents.map((d) => d.id));
const topicIds = new Set(meta.topics.map((t) => t.id));
const agencyIds = new Set(meta.agencies.map((a) => a.id));
const sectionIds = new Set();
for (const s of sections) {
  if (sectionIds.has(s.id)) err(`duplicate section id ${s.id}`);
  sectionIds.add(s.id);
  if (!docIds.has(s.doc)) err(`section ${s.id}: unknown doc ${s.doc}`);
  for (const t of s.topics || []) if (!topicIds.has(t)) err(`section ${s.id}: unknown topic ${t}`);
  for (const a of s.agencies || []) if (!agencyIds.has(a)) err(`section ${s.id}: unknown agency ${a}`);
  if (!s.summary) err(`section ${s.id}: missing summary`);
}

function cites(where, cite) {
  if (!Array.isArray(cite) || cite.length === 0) return err(`${where}: no citation`);
  for (const c of cite) if (!sectionIds.has(c)) err(`${where}: unknown citation ${c}`);
}

glossary.forEach((g) => cites(`glossary ${g.term}`, g.cite));
const qIds = new Set();
for (const q of questions) {
  if (qIds.has(q.id)) err(`duplicate question ${q.id}`);
  qIds.add(q.id);
  if (!Array.isArray(q.options) || q.options.length !== 4) err(`${q.id}: needs 4 options`);
  if (!(q.answer >= 0 && q.answer < (q.options || []).length)) err(`${q.id}: answer out of range`);
  if (!q.explain) err(`${q.id}: missing explanation`);
  if (q.topic && !topicIds.has(q.topic)) err(`${q.id}: unknown topic ${q.topic}`);
  cites(q.id, q.cite);
}
const lessonIds = new Set();
for (const m of lessons) for (const l of m.lessons) { lessonIds.add(l.id); cites(l.id, l.cite); }
for (const f of flashcards) cites(f.id, f.cite);
const scIds = new Set();
for (const s of scenarios) {
  scIds.add(s.id);
  for (const [i, st] of s.steps.entries()) {
    cites(`${s.id} step ${i + 1}`, st.cite);
    const right = st.options.filter((o) => o.correct).length;
    if (right !== 1) err(`${s.id} step ${i + 1}: needs exactly one correct option`);
    for (const o of st.options) if (!o.feedback) err(`${s.id} step ${i + 1}: option missing feedback`);
  }
}
for (const g of checklist.groups) for (const it of g.items) cites(it.id, it.cite);
for (const a of checklist.actionPlanSections) cites(a.id, a.cite);
comparison.forEach((r) => cites(`compare ${r.aspect}`, r.cite));
const tools = new Set(['checklist', 'actionplan', 'compare']);
for (const p of paths) for (const st of p.steps) {
  const w = `path ${p.id}`;
  if (st.type === 'lesson' && !lessonIds.has(st.ref)) err(`${w}: lesson ${st.ref}`);
  if (st.type === 'section' && !sectionIds.has(st.ref)) err(`${w}: section ${st.ref}`);
  if (st.type === 'scenario' && !scIds.has(st.ref)) err(`${w}: scenario ${st.ref}`);
  if (st.type === 'tool' && !tools.has(st.ref)) err(`${w}: tool ${st.ref}`);
  if (st.type === 'quiz' && st.ref !== 'all') {
    const [k, v] = st.ref.split(':');
    if (!(k === 'topic' ? topicIds.has(v) : docIds.has(v))) err(`${w}: quiz ${st.ref}`);
    const n = questions.filter((q) => (k === 'topic' ? q.topic === v : q.doc === v)).length;
    if (n === 0) err(`${w}: quiz ${st.ref} has no questions`);
  }
}
console.log(`sections ${sections.length}, glossary ${glossary.length}, questions ${questions.length}, flashcards ${flashcards.length}, scenarios ${scenarios.length}, paths ${paths.length}`);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('Content OK');
