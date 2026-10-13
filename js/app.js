import { store, getTheme, setTheme } from './store.js';
import * as router from './router.js';

const D = {};
const DAY = 86400000;
const INTERVALS = [0, 1, 3, 7, 14]; // Leitner boxes 1 to 5, in days
const main = document.getElementById('main');

// ---------- helpers ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const docShort = (id) => (D.docById[id] ? D.docById[id].short : 'Cross-document');
const topicLabel = (id) => (D.topicById[id] ? D.topicById[id].label : id);
const sectionLabel = (id) => { const s = D.sec[id]; return s ? `${docShort(s.doc)} ${s.ref}` : id; };
const slot = (n, f) => store.slot(n, f);

function cites(ids) {
  return `<p class="cites"><span class="cites-l">Source:</span> ${ids.map((id) => `<a class="chip" href="#/explore/${esc(id)}">${esc(sectionLabel(id))}</a>`).join(' ')}</p>`;
}

function bar(value, label) {
  return `<div class="bar" role="img" aria-label="${esc(label)}"><span style="width:${Math.max(0, Math.min(100, value))}%"></span></div>`;
}

// ---------- routing ----------
const routes = [
  [/^\/$/, viewHome],
  [/^\/learn$/, viewLearn],
  [/^\/learn\/([\w-]+)$/, viewLesson],
  [/^\/explore$/, viewExplore],
  [/^\/explore\/([\w-]+)$/, viewSection],
  [/^\/glossary$/, viewGlossary],
  [/^\/quiz$/, viewQuizSetup],
  [/^\/quiz\/start\/(.+)$/, (m) => startQuiz(decodeURIComponent(m[1]), 10, true)],
  [/^\/quiz\/run$/, viewQuizRun],
  [/^\/flash$/, viewFlashSetup],
  [/^\/flash\/run$/, viewFlashRun],
  [/^\/scenarios$/, viewScenarios],
  [/^\/scenarios\/([\w-]+)$/, viewScenario],
  [/^\/paths$/, viewPaths],
  [/^\/paths\/([\w-]+)$/, viewPath],
  [/^\/tools$/, viewTools],
  [/^\/tools\/checklist$/, viewChecklist],
  [/^\/tools\/actionplan$/, viewActionPlan],
  [/^\/tools\/compare$/, viewCompare],
  [/^\/progress$/, viewProgress],
  [/^\/about$/, viewAbout],
];

function render(path) {
  const clean = path.split('?')[0];
  let view = null;
  for (const [re, fn] of routes) {
    const m = clean.match(re);
    if (m) { view = () => fn(m); break; }
  }
  main.innerHTML = '';
  if (view) view(); else viewNotFound();
  updateChrome(clean);
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

function updateChrome(path) {
  document.getElementById('btn-back').disabled = !router.canBack();
  document.getElementById('btn-fwd').disabled = !router.canForward();
  const top = '/' + (path.split('/')[1] || '');
  document.querySelectorAll('#nav a').forEach((a) => {
    const on = a.getAttribute('href').slice(1) === top;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const titles = { '/': 'Home', '/learn': 'Learn', '/explore': 'Explorer', '/glossary': 'Glossary', '/quiz': 'Quiz', '/flash': 'Flashcards', '/scenarios': 'Scenarios', '/paths': 'Paths', '/tools': 'Tools', '/progress': 'Progress', '/about': 'About' };
  document.title = `${titles[top] || 'Not found'} · ${D.meta ? D.meta.app.name : 'MH Policy Trainer'}`;
}

function viewNotFound() {
  main.innerHTML = `<h1>Page not found</h1><p>That page does not exist. <a href="#/">Go home</a>.</p>`;
}

// ---------- progress helpers ----------
const lessonsDone = () => slot('lessons', {});
const qStats = () => slot('qstats', {});
const cardState = () => slot('cards', {});
const scoreState = () => slot('scenarios', {});

function isWeak(id) { const s = qStats()[id]; return !!s && s.wrong > s.right; }

function overall() {
  const lessons = D.flatLessons.length;
  const ld = D.flatLessons.filter((l) => lessonsDone()[l.id]).length;
  let seen = 0, right = 0, wrong = 0;
  for (const s of Object.values(qStats())) { seen += 1; right += s.right; wrong += s.wrong; }
  const cs = cardState();
  const cardsSeen = Object.keys(cs).length;
  const mastered = Object.values(cs).filter((c) => c.box >= 5).length;
  const sc = Object.keys(scoreState()).length;
  return { lessons, ld, seen, right, wrong, cardsSeen, mastered, sc };
}

function dueCards(deck) {
  const now = Date.now();
  const cs = cardState();
  return D.flashcards.filter((f) => (deck === 'all' || f.doc === deck)).filter((f) => !cs[f.id] || cs[f.id].due <= now);
}

// ---------- home ----------
function viewHome() {
  const o = overall();
  const due = dueCards('all').length;
  main.innerHTML = `
    <section class="hero">
      <h1>${esc(D.meta.app.name)}</h1>
      <p class="lead">${esc(D.meta.app.tagline)}</p>
      <p class="row">
        <a class="btn primary" href="#/learn">Start learning</a>
        <a class="btn" href="#/quiz">Take a quiz</a>
        <a class="btn" href="#/flash">Flashcards (${due} due)</a>
      </p>
    </section>
    <section>
      <h2>Your progress</h2>
      <div class="stats">
        <div class="stat"><b>${o.ld}/${o.lessons}</b><span>lessons done</span></div>
        <div class="stat"><b>${o.seen}/${D.questions.length}</b><span>questions tried</span></div>
        <div class="stat"><b>${o.mastered}/${D.flashcards.length}</b><span>cards mastered</span></div>
        <div class="stat"><b>${o.sc}/${D.scenarios.length}</b><span>scenarios played</span></div>
      </div>
      <p><a href="#/progress">Open the dashboard</a></p>
    </section>
    <section>
      <h2>The three documents</h2>
      <div class="grid">
        ${D.meta.documents.map((d) => `
          <article class="card">
            <h3>${esc(d.short)}</h3>
            <p class="muted">${esc(d.type)} · ${esc(d.year)}</p>
            <p>${esc(d.blurb)}</p>
            <p class="small muted">${esc(d.sourceNote)}</p>
            <p><a href="#/explore?doc=${esc(d.id)}">Explore sections</a></p>
          </article>`).join('')}
      </div>
    </section>
    <section>
      <h2>Ways to study</h2>
      <div class="grid">
        ${[
          ['#/learn', 'Learn', 'Four short modules, one for each document and one that compares them.'],
          ['#/explore', 'Section explorer', 'Search and filter every summarized provision by document, topic and agency.'],
          ['#/scenarios', 'Scenarios', 'Three practice cases where you choose what to do.'],
          ['#/paths', 'Learning paths', 'A suggested route for your role.'],
          ['#/tools', 'Tools', 'LGU readiness checklist, action plan builder and a side-by-side comparison.'],
          ['#/glossary', 'Glossary', 'Key terms with sources.'],
        ].map(([h, t, d]) => `<a class="card link" href="${h}"><h3>${t}</h3><p>${d}</p></a>`).join('')}
      </div>
    </section>
    <p class="notice">${esc(D.meta.disclaimer)}</p>`;
}

// ---------- learn ----------
function viewLearn() {
  main.innerHTML = `<h1>Learn</h1>
    <p class="lead">Short lessons built from the three documents. Every lesson lists its sources.</p>
    ${D.lessons.map((m) => {
      const done = m.lessons.filter((l) => lessonsDone()[l.id]).length;
      return `<section class="card"><h2>${esc(m.title)}</h2><p>${esc(m.intro)}</p>
        ${bar(pct(done, m.lessons.length), `${done} of ${m.lessons.length} lessons done`)}
        <ol class="lessons">${m.lessons.map((l) => `<li><a href="#/learn/${l.id}">${esc(l.title)}</a>${lessonsDone()[l.id] ? ' <span class="tick" aria-label="done">✓</span>' : ''}</li>`).join('')}</ol></section>`;
    }).join('')}`;
}

function viewLesson(m) {
  const idx = D.flatLessons.findIndex((l) => l.id === m[1]);
  if (idx < 0) return viewNotFound();
  const l = D.flatLessons[idx];
  const prev = D.flatLessons[idx - 1];
  const next = D.flatLessons[idx + 1];
  const done = !!lessonsDone()[l.id];
  main.innerHTML = `
    <p class="crumb"><a href="#/learn">Learn</a> / ${esc(l.module.title)}</p>
    <h1>${esc(l.title)}</h1>
    ${l.body.map((p) => `<p>${esc(p)}</p>`).join('')}
    <div class="card"><h3>Key points</h3><ul>${l.keyPoints.map((k) => `<li>${esc(k)}</li>`).join('')}</ul></div>
    ${cites(l.cite)}
    <p class="row">
      <button class="btn ${done ? '' : 'primary'}" id="done">${done ? 'Marked done (undo)' : 'Mark as done'}</button>
      <a class="btn" href="#/quiz/start/${l.module.doc === 'all' ? 'all' : 'doc:' + l.module.doc}">Quiz me on this</a>
    </p>
    <nav class="pager">
      ${prev ? `<a href="#/learn/${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a href="#/learn/${next.id}">${esc(next.title)} →</a>` : '<span></span>'}
    </nav>`;
  document.getElementById('done').onclick = () => {
    const s = lessonsDone();
    if (s[l.id]) delete s[l.id]; else s[l.id] = Date.now();
    store.save();
    viewLesson(m);
  };
}

// ---------- explorer ----------
const exp = { q: '', doc: '', topic: '', agency: '' };

function searchSections() {
  const q = exp.q.trim().toLowerCase();
  return D.sections.filter((s) => {
    if (exp.doc && s.doc !== exp.doc) return false;
    if (exp.topic && !(s.topics || []).includes(exp.topic)) return false;
    if (exp.agency && !(s.agencies || []).includes(exp.agency)) return false;
    if (!q) return true;
    const hay = `${s.ref} ${s.title} ${s.summary} ${(s.points || []).join(' ')}`.toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  });
}

function viewExplore() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  if (params.get('doc')) { exp.doc = params.get('doc'); }
  const opt = (arr, cur, all) => `<option value="">${all}</option>` + arr.map((x) => `<option value="${esc(x.id)}" ${cur === x.id ? 'selected' : ''}>${esc(x.label || x.short)}</option>`).join('');
  main.innerHTML = `<h1>Section explorer</h1>
    <p class="lead">Search every summarized provision. Summaries are paraphrases; check the official text before relying on a detail.</p>
    <div class="filters">
      <label>Search <input id="q" type="search" value="${esc(exp.q)}" placeholder="e.g. restraint, quarterly, PhilHealth"></label>
      <label>Document <select id="fdoc">${opt(D.meta.documents, exp.doc, 'All documents')}</select></label>
      <label>Topic <select id="ftopic">${opt(D.meta.topics, exp.topic, 'All topics')}</select></label>
      <label>Agency <select id="fagency">${opt(D.meta.agencies, exp.agency, 'All agencies')}</select></label>
      <button class="btn" id="fclear" type="button">Clear</button>
    </div>
    <p id="count" class="muted" aria-live="polite"></p>
    <div id="results"></div>`;
  const draw = () => {
    const rows = searchSections();
    document.getElementById('count').textContent = `${rows.length} of ${D.sections.length} sections`;
    document.getElementById('results').innerHTML = rows.length
      ? rows.map((s) => `<a class="row-card" href="#/explore/${s.id}"><span class="tag">${esc(docShort(s.doc))}</span><b>${esc(s.ref)}</b> <span>${esc(s.title)}</span><br><span class="muted small">${esc(s.summary)}</span></a>`).join('')
      : '<p>No sections match. Try fewer words or clear the filters.</p>';
  };
  const bind = (id, key) => { document.getElementById(id).addEventListener('input', (e) => { exp[key] = e.target.value; draw(); }); };
  bind('q', 'q'); bind('fdoc', 'doc'); bind('ftopic', 'topic'); bind('fagency', 'agency');
  document.getElementById('fclear').onclick = () => { exp.q = exp.doc = exp.topic = exp.agency = ''; viewExplore(); };
  draw();
}

function viewSection(m) {
  const s = D.sec[m[1]];
  if (!s) return viewNotFound();
  const idx = D.sections.indexOf(s);
  const sibs = D.sections.filter((x) => x.doc === s.doc);
  const si = sibs.indexOf(s);
  const related = D.sections.filter((x) => x.doc !== s.doc && (x.topics || []).some((t) => (s.topics || []).includes(t))).slice(0, 6);
  const nq = D.questions.filter((q) => q.cite.includes(s.id)).length;
  const doc = D.docById[s.doc];
  main.innerHTML = `
    <p class="crumb"><a href="#/explore">Explorer</a> / <a href="#/explore?doc=${s.doc}">${esc(doc.short)}</a></p>
    <h1><span class="tag">${esc(doc.short)}</span> ${esc(s.ref)}: ${esc(s.title)}</h1>
    <p class="lead">${esc(s.summary)}</p>
    ${s.points && s.points.length ? `<ul class="points">${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}
    <p>${(s.topics || []).map((t) => `<span class="chip static">${esc(topicLabel(t))}</span>`).join(' ')}
       ${(s.agencies || []).map((a) => `<span class="chip static alt">${esc(D.agencyById[a].label)}</span>`).join(' ')}</p>
    ${nq ? `<p><a class="btn" href="#/quiz/start/${encodeURIComponent('sec:' + s.id)}">Practise this section (${nq} question${nq > 1 ? 's' : ''})</a></p>` : ''}
    ${related.length ? `<h2>Related in other documents</h2>${related.map((x) => `<a class="row-card" href="#/explore/${x.id}"><span class="tag">${esc(docShort(x.doc))}</span><b>${esc(x.ref)}</b> ${esc(x.title)}</a>`).join('')}` : ''}
    <nav class="pager">
      ${sibs[si - 1] ? `<a href="#/explore/${sibs[si - 1].id}">← ${esc(sibs[si - 1].ref)}</a>` : '<span></span>'}
      ${sibs[si + 1] ? `<a href="#/explore/${sibs[si + 1].id}">${esc(sibs[si + 1].ref)} →</a>` : '<span></span>'}
    </nav>
    <p class="small muted">${esc(doc.sourceNote)}</p>`;
  void idx;
}

// ---------- glossary ----------
function viewGlossary() {
  main.innerHTML = `<h1>Glossary</h1>
    <label class="block">Filter <input id="gq" type="search" placeholder="Type a term"></label>
    <dl id="gl"></dl>`;
  const draw = (q) => {
    const rows = D.glossary.filter((g) => !q || (g.term + ' ' + g.def).toLowerCase().includes(q.toLowerCase()));
    document.getElementById('gl').innerHTML = rows.map((g) => `<div class="gl"><dt>${esc(g.term)}</dt><dd>${esc(g.def)}${cites(g.cite)}</dd></div>`).join('') || '<p>No matching terms.</p>';
  };
  document.getElementById('gq').addEventListener('input', (e) => draw(e.target.value));
  draw('');
}

// ---------- quiz ----------
let quiz = null;

function scopeLabel(scope) {
  const [k, v] = scope.split(':');
  if (scope === 'all') return 'All topics';
  if (scope === 'weak') return 'Weak spots';
  if (k === 'doc') return docShort(v) === 'Cross-document' ? 'Cross-document' : docShort(v);
  if (k === 'topic') return topicLabel(v);
  if (k === 'sec') return sectionLabel(v);
  return scope;
}

function pool(scope) {
  const [k, v] = scope.split(':');
  return D.questions.filter((q) => scope === 'all' || (k === 'doc' && q.doc === v) || (k === 'topic' && q.topic === v) || (k === 'sec' && q.cite.includes(v)) || (k === 'weak' && isWeak(q.id)));
}

function viewQuizSetup() {
  const docs = [...new Set(D.questions.map((q) => q.doc))];
  const topics = D.meta.topics.filter((t) => D.questions.some((q) => q.topic === t.id));
  const weak = pool('weak').length;
  main.innerHTML = `<h1>Quiz</h1>
    <p class="lead">${D.questions.length} multiple-choice questions, each with an explanation and a source.</p>
    <form id="qf" class="card form">
      <label>Questions from
        <select id="scope">
          <option value="all">Everything (${D.questions.length})</option>
          <optgroup label="By document">${docs.map((d) => `<option value="doc:${d}">${esc(d === 'compare' ? 'Cross-document comparison' : docShort(d))} (${pool('doc:' + d).length})</option>`).join('')}</optgroup>
          <optgroup label="By topic">${topics.map((t) => `<option value="topic:${t.id}">${esc(t.label)} (${pool('topic:' + t.id).length})</option>`).join('')}</optgroup>
          ${weak ? `<optgroup label="Review"><option value="weak">My weak spots (${weak})</option></optgroup>` : ''}
        </select></label>
      <label>How many
        <select id="count"><option value="10">10</option><option value="20">20</option><option value="999">All in the set</option></select></label>
      <button class="btn primary" type="submit">Start quiz</button>
    </form>`;
  document.getElementById('qf').onsubmit = (e) => {
    e.preventDefault();
    startQuiz(document.getElementById('scope').value, Number(document.getElementById('count').value));
  };
}

function startQuiz(scope, count, viaLink = false) {
  const qs = shuffle(pool(scope)).slice(0, count);
  if (!qs.length) { main.innerHTML = '<h1>Quiz</h1><p>No questions in that set yet. <a href="#/quiz">Choose another set</a>.</p>'; return; }
  quiz = { scope, i: 0, picked: null, results: [], items: qs.map((q) => ({ q, order: shuffle([0, 1, 2, 3]) })) };
  // From a /quiz/start link, replace that entry so Back does not restart a new quiz.
  if (viaLink) router.replace('/quiz/run'); else router.go('/quiz/run');
}

function viewQuizRun() {
  if (!quiz) { router.replace('/quiz'); return; }
  if (quiz.i >= quiz.items.length) return quizResult();
  const { q, order } = quiz.items[quiz.i];
  const answered = quiz.picked !== null;
  main.innerHTML = `
    <p class="crumb">${esc(scopeLabel(quiz.scope))} · question ${quiz.i + 1} of ${quiz.items.length}</p>
    ${bar(pct(quiz.i, quiz.items.length), 'quiz progress')}
    <h1 class="q">${esc(q.q)}</h1>
    <div class="opts" role="group" aria-label="Answer choices">
      ${order.map((oi, pos) => {
        let cls = 'opt';
        if (answered) {
          if (oi === q.answer) cls += ' right';
          else if (oi === quiz.picked) cls += ' wrong';
        }
        return `<button class="${cls}" data-oi="${oi}" ${answered ? 'disabled' : ''}><span class="k">${'ABCD'[pos]}</span>${esc(q.options[oi])}</button>`;
      }).join('')}
    </div>
    ${answered ? `<div class="feedback ${quiz.picked === q.answer ? 'ok' : 'bad'}" role="status">
        <b>${quiz.picked === q.answer ? 'Correct.' : 'Not quite.'}</b> ${esc(q.explain)}${cites(q.cite)}
        <p><button class="btn primary" id="next">${quiz.i + 1 < quiz.items.length ? 'Next question' : 'See results'}</button></p></div>` : ''}`;
  main.querySelectorAll('.opt').forEach((b) => {
    b.onclick = () => {
      quiz.picked = Number(b.dataset.oi);
      const ok = quiz.picked === q.answer;
      quiz.results.push({ q, ok });
      const st = qStats();
      const e = st[q.id] || { right: 0, wrong: 0 };
      if (ok) e.right += 1; else e.wrong += 1;
      e.last = Date.now();
      st[q.id] = e;
      store.save();
      viewQuizRun();
    };
  });
  const next = document.getElementById('next');
  if (next) next.onclick = () => { quiz.i += 1; quiz.picked = null; viewQuizRun(); };
}

function quizResult() {
  const ok = quiz.results.filter((r) => r.ok).length;
  const total = quiz.results.length;
  const missed = quiz.results.filter((r) => !r.ok);
  const hist = slot('quizHistory', []);
  hist.push({ t: Date.now(), scope: quiz.scope, ok, total });
  if (hist.length > 50) hist.shift();
  store.save();
  main.innerHTML = `<h1>Result: ${ok} of ${total} (${pct(ok, total)}%)</h1>
    ${bar(pct(ok, total), 'score')}
    ${missed.length ? `<h2>Review what you missed</h2>${missed.map((r) => `<div class="card"><p><b>${esc(r.q.q)}</b></p><p>Correct answer: ${esc(r.q.options[r.q.answer])}</p><p class="muted">${esc(r.q.explain)}</p>${cites(r.q.cite)}</div>`).join('')}` : '<p>No misses. Well done.</p>'}
    <p class="row"><a class="btn primary" href="#/quiz/start/${encodeURIComponent(quiz.scope)}">Another round</a><a class="btn" href="#/quiz">Choose a different set</a></p>`;
  quiz = null;
}

// ---------- flashcards ----------
let flash = null;

function viewFlashSetup() {
  const cs = cardState();
  const decks = [['all', 'All cards'], ...D.meta.documents.map((d) => [d.id, d.short])];
  main.innerHTML = `<h1>Flashcards</h1>
    <p class="lead">Spaced repetition with five boxes. A card you know moves up and returns later (after 1, 3, 7 and 14 days). A card you miss goes back to box 1.</p>
    <div class="grid">${decks.map(([id, label]) => {
      const cards = D.flashcards.filter((f) => id === 'all' || f.doc === id);
      const due = dueCards(id).length;
      const mastered = cards.filter((f) => cs[f.id] && cs[f.id].box >= 5).length;
      return `<div class="card"><h3>${esc(label)}</h3><p>${cards.length} cards · ${due} due · ${mastered} mastered</p>
        <button class="btn primary" data-deck="${id}" ${due ? '' : 'disabled'}>Study ${due ? Math.min(due, 20) : ''}</button></div>`;
    }).join('')}</div>`;
  main.querySelectorAll('[data-deck]').forEach((b) => {
    b.onclick = () => {
      const q = shuffle(dueCards(b.dataset.deck)).slice(0, 20);
      flash = { queue: q, shown: false, total: q.length, got: 0, again: 0 };
      router.go('/flash/run');
    };
  });
}

function viewFlashRun() {
  if (!flash) { router.replace('/flash'); return; }
  if (!flash.queue.length) {
    main.innerHTML = `<h1>Session complete</h1><p>${flash.got} marked known, ${flash.again} to see again.</p>
      <p class="row"><a class="btn primary" href="#/flash">Back to decks</a><a class="btn" href="#/progress">Progress</a></p>`;
    flash = null;
    return;
  }
  const c = flash.queue[0];
  main.innerHTML = `
    <p class="crumb">${flash.queue.length} left in this session</p>
    <div class="flash">
      <p class="small muted">${esc(docShort(c.doc))}</p>
      <h1 class="q">${esc(c.front)}</h1>
      ${flash.shown ? `<div class="answer"><p>${esc(c.back)}</p>${cites(c.cite)}</div>
        <p class="row"><button class="btn" id="again">Again</button><button class="btn primary" id="known">Got it</button></p>`
        : '<p><button class="btn primary" id="show">Show answer</button></p>'}
    </div>`;
  const grade = (known) => {
    const cs = cardState();
    const e = cs[c.id] || { box: 1 };
    if (known) { e.box = Math.min(5, e.box + 1); flash.got += 1; } else { e.box = 1; flash.again += 1; }
    e.due = Date.now() + INTERVALS[e.box - 1] * DAY;
    if (!known) e.due = Date.now();
    cs[c.id] = e;
    store.save();
    flash.queue.shift();
    if (!known) flash.queue.push(c);
    flash.shown = false;
    viewFlashRun();
  };
  const show = document.getElementById('show');
  if (show) show.onclick = () => { flash.shown = true; viewFlashRun(); };
  if (flash.shown) {
    document.getElementById('known').onclick = () => grade(true);
    document.getElementById('again').onclick = () => grade(false);
  }
}

// ---------- scenarios ----------
let scen = null;

function viewScenarios() {
  main.innerHTML = `<h1>Scenarios</h1><p class="lead">Practise decisions in realistic cases. Each choice gets feedback and a source.</p>
    <div class="grid">${D.scenarios.map((s) => {
      const best = scoreState()[s.id];
      return `<a class="card link" href="#/scenarios/${s.id}"><h3>${esc(s.title)}</h3><p class="muted">${esc(s.level)} · ${esc(docShort(s.doc))}</p><p>${esc(s.setup)}</p>${best ? `<p class="small">Best score: ${best.best}/${best.total}</p>` : ''}</a>`;
    }).join('')}</div>`;
}

function viewScenario(m) {
  const s = D.scenarios.find((x) => x.id === m[1]);
  if (!s) return viewNotFound();
  if (!scen || scen.id !== s.id) scen = { id: s.id, i: -1, picked: null, score: 0 };
  drawScenario(s);
}

function drawScenario(s) {
  if (scen.i === -1) {
    main.innerHTML = `<p class="crumb"><a href="#/scenarios">Scenarios</a></p><h1>${esc(s.title)}</h1><div class="card"><p>${esc(s.setup)}</p></div>
      <p class="muted">${s.steps.length} decisions. Choose the best response at each step.</p>
      <p><button class="btn primary" id="begin">Begin</button></p>`;
    document.getElementById('begin').onclick = () => { scen.i = 0; drawScenario(s); };
    return;
  }
  if (scen.i >= s.steps.length) {
    const prev = scoreState()[s.id];
    scoreState()[s.id] = { best: Math.max(scen.score, prev ? prev.best : 0), total: s.steps.length, last: Date.now() };
    store.save();
    main.innerHTML = `<h1>${esc(s.title)}: finished</h1><p class="lead">You chose the best response ${scen.score} of ${s.steps.length} times.</p>
      <p class="row"><button class="btn primary" id="again">Play again</button><a class="btn" href="#/scenarios">All scenarios</a></p>`;
    document.getElementById('again').onclick = () => { scen = { id: s.id, i: 0, picked: null, score: 0 }; drawScenario(s); };
    return;
  }
  const st = s.steps[scen.i];
  const answered = scen.picked !== null;
  main.innerHTML = `<p class="crumb"><a href="#/scenarios">Scenarios</a> / ${esc(s.title)} · step ${scen.i + 1} of ${s.steps.length}</p>
    <div class="card muted-card"><p>${esc(s.setup)}</p></div>
    <h2>${esc(st.prompt)}</h2>
    <div class="opts">${st.options.map((o, k) => {
      let cls = 'opt';
      if (answered) { if (o.correct) cls += ' right'; else if (k === scen.picked) cls += ' wrong'; }
      return `<button class="${cls}" data-k="${k}" ${answered ? 'disabled' : ''}>${esc(o.text)}</button>`;
    }).join('')}</div>
    ${answered ? `<div class="feedback ${st.options[scen.picked].correct ? 'ok' : 'bad'}" role="status"><b>${st.options[scen.picked].correct ? 'Good choice.' : 'Think again.'}</b> ${esc(st.options[scen.picked].feedback)}
      ${!st.options[scen.picked].correct ? `<p><b>Best response:</b> ${esc(st.options.find((o) => o.correct).text)}</p>` : ''}${cites(st.cite)}
      <p><button class="btn primary" id="next">${scen.i + 1 < s.steps.length ? 'Next step' : 'Finish'}</button></p></div>` : ''}`;
  main.querySelectorAll('.opt').forEach((b) => {
    b.onclick = () => {
      scen.picked = Number(b.dataset.k);
      if (st.options[scen.picked].correct) scen.score += 1;
      drawScenario(s);
    };
  });
  const next = document.getElementById('next');
  if (next) next.onclick = () => { scen.i += 1; scen.picked = null; drawScenario(s); };
}

// ---------- paths ----------
function stepHref(st) {
  switch (st.type) {
    case 'lesson': return `#/learn/${st.ref}`;
    case 'section': return `#/explore/${st.ref}`;
    case 'scenario': return `#/scenarios/${st.ref}`;
    case 'tool': return `#/tools/${st.ref}`;
    case 'flashcards': return '#/flash';
    case 'quiz': return `#/quiz/start/${encodeURIComponent(st.ref)}`;
    default: return '#/';
  }
}

function viewPaths() {
  main.innerHTML = `<h1>Learning paths</h1><p class="lead">Pick the role closest to yours for a suggested order of lessons, readings, practice and tools.</p>
    <div class="grid">${D.paths.map((p) => {
      const done = Object.keys(slot('paths', {})[p.id] || {}).length;
      return `<a class="card link" href="#/paths/${p.id}"><h3>${esc(p.role)}</h3><p>${esc(p.blurb)}</p><p class="small muted">${done}/${p.steps.length} steps ticked</p></a>`;
    }).join('')}</div>`;
}

function viewPath(m) {
  const p = D.paths.find((x) => x.id === m[1]);
  if (!p) return viewNotFound();
  const ticks = slot('paths', {});
  const mine = ticks[p.id] || (ticks[p.id] = {});
  main.innerHTML = `<p class="crumb"><a href="#/paths">Paths</a></p><h1>${esc(p.role)}</h1><p class="lead">${esc(p.blurb)}</p>
    ${bar(pct(Object.keys(mine).length, p.steps.length), 'path progress')}
    <ol class="steps">${p.steps.map((st, i) => `<li><label class="tickbox"><input type="checkbox" data-i="${i}" ${mine[i] ? 'checked' : ''}> <span class="sr">Done</span></label>
      <a href="${stepHref(st)}">${esc(st.label)}</a></li>`).join('')}</ol>`;
  main.querySelectorAll('input[data-i]').forEach((c) => {
    c.onchange = () => { if (c.checked) mine[c.dataset.i] = 1; else delete mine[c.dataset.i]; store.save(); viewPath(m); };
  });
}

// ---------- tools ----------
function viewTools() {
  main.innerHTML = `<h1>Tools</h1><div class="grid">
    <a class="card link" href="#/tools/checklist"><h3>LGU readiness checklist</h3><p>Check your municipality or city against the duties in the Act and AO 2025-0028.</p></a>
    <a class="card link" href="#/tools/actionplan"><h3>Action plan builder</h3><p>Draft a CBMH Action Plan along the Annex D outline and export it.</p></a>
    <a class="card link" href="#/tools/compare"><h3>Compare the documents</h3><p>See the Act and both orders side by side.</p></a></div>`;
}

function viewChecklist() {
  const c = D.checklist;
  const st = slot('checklist', {});
  const all = c.groups.flatMap((g) => g.items);
  const done = all.filter((i) => st[i.id]).length;
  main.innerHTML = `<p class="crumb"><a href="#/tools">Tools</a></p><h1>${esc(c.title)}</h1><p class="muted">${esc(c.note)}</p>
    <p><b>${done} of ${all.length} ready (${pct(done, all.length)}%)</b></p>${bar(pct(done, all.length), 'readiness')}
    ${c.groups.map((g) => `<fieldset class="card"><legend>${esc(g.label)} (${g.items.filter((i) => st[i.id]).length}/${g.items.length})</legend>
      ${g.items.map((i) => `<div class="check"><label><input type="checkbox" data-id="${i.id}" ${st[i.id] ? 'checked' : ''}> ${esc(i.text)}</label>${cites(i.cite)}</div>`).join('')}</fieldset>`).join('')}
    <p><button class="btn" id="reset">Clear checklist</button></p>`;
  main.querySelectorAll('input[data-id]').forEach((i) => {
    i.onchange = () => { if (i.checked) st[i.dataset.id] = 1; else delete st[i.dataset.id]; store.save(); const y = window.scrollY; viewChecklist(); window.scrollTo(0, y); };
  });
  document.getElementById('reset').onclick = () => { if (confirm('Clear all checklist ticks?')) { store.get().checklist = {}; store.save(); viewChecklist(); } };
}

function planMarkdown() {
  const plan = slot('plan', {});
  const name = plan._name || '[LGU name]';
  const out = [`# CBMH Action Plan: ${name}`, '', `_Drafted with ${D.meta.app.name}, following the Annex D outline of DOH AO 2025-0028. A study aid, not an official document._`, ''];
  D.checklist.actionPlanSections.forEach((s, i) => {
    out.push(`## ${i + 1}. ${s.label}`, '', plan[s.id] && plan[s.id].trim() ? plan[s.id].trim() : `_${s.hint}_`, '');
  });
  return out.join('\n');
}

function viewActionPlan() {
  const plan = slot('plan', {});
  main.innerHTML = `<p class="crumb"><a href="#/tools">Tools</a></p><h1>Action plan builder</h1>
    <p class="muted">Follows the Annex D outline. Your text is saved in this browser only.</p>
    <label class="block">LGU name <input id="pname" value="${esc(plan._name || '')}"></label>
    ${D.checklist.actionPlanSections.map((s, i) => `<label class="block"><b>${i + 1}. ${esc(s.label)}</b><span class="small muted"> ${esc(s.hint)}</span>
      <textarea data-id="${s.id}" rows="4">${esc(plan[s.id] || '')}</textarea></label>${cites(s.cite)}`).join('')}
    <p class="row"><button class="btn primary" id="copy">Copy as Markdown</button><button class="btn" id="dl">Download .md</button><button class="btn" id="print">Print</button></p>
    <p id="msg" class="small muted" aria-live="polite"></p>`;
  document.getElementById('pname').oninput = (e) => { plan._name = e.target.value; store.save(); };
  main.querySelectorAll('textarea').forEach((t) => { t.oninput = () => { plan[t.dataset.id] = t.value; store.save(); }; });
  const msg = (t) => { document.getElementById('msg').textContent = t; };
  document.getElementById('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(planMarkdown()); msg('Copied.'); } catch { msg('Copy was blocked by the browser. Use Download instead.'); }
  };
  document.getElementById('dl').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([planMarkdown()], { type: 'text/markdown' }));
    a.download = 'cbmh-action-plan.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  document.getElementById('print').onclick = () => window.print();
}

function viewCompare() {
  main.innerHTML = `<p class="crumb"><a href="#/tools">Tools</a></p><h1>Compare the documents</h1>
    <p class="muted">Cells paraphrase the documents. Open the sources to check detail.</p>
    <div class="compare">
      <div class="crow head"><div>Topic</div><div>RA 11036</div><div>AO 2016-0039</div><div>AO 2025-0028</div></div>
      ${D.comparison.map((r) => `<div class="crow"><div class="asp"><b>${esc(r.aspect)}</b></div>
        <div data-label="RA 11036">${esc(r.ra)}</div><div data-label="AO 2016-0039">${esc(r.a16)}</div><div data-label="AO 2025-0028">${esc(r.a25)}</div>
        <div class="src">${cites(r.cite)}</div></div>`).join('')}
    </div>`;
}

// ---------- progress ----------
function viewProgress() {
  const o = overall();
  const byTopic = {};
  for (const q of D.questions) {
    const s = qStats()[q.id];
    const t = (byTopic[q.topic] ||= { right: 0, wrong: 0, n: 0 });
    t.n += 1;
    if (s) { t.right += s.right; t.wrong += s.wrong; }
  }
  const cs = cardState();
  const boxes = [0, 0, 0, 0, 0, 0];
  D.flashcards.forEach((f) => { boxes[cs[f.id] ? cs[f.id].box : 0] += 1; });
  const hist = slot('quizHistory', []).slice(-5).reverse();
  main.innerHTML = `<h1>Progress</h1>
    ${store.isPersistent() ? '' : '<p class="notice">Your browser is blocking storage, so progress will be lost when you close this page.</p>'}
    <div class="stats">
      <div class="stat"><b>${o.ld}/${o.lessons}</b><span>lessons</span></div>
      <div class="stat"><b>${pct(o.right, o.right + o.wrong)}%</b><span>answers correct</span></div>
      <div class="stat"><b>${o.cardsSeen}/${D.flashcards.length}</b><span>cards started</span></div>
      <div class="stat"><b>${o.sc}/${D.scenarios.length}</b><span>scenarios</span></div>
    </div>
    <h2>Accuracy by topic</h2>
    ${Object.entries(byTopic).map(([t, v]) => { const tot = v.right + v.wrong; return `<div class="trow"><span>${esc(topicLabel(t))}</span>${bar(pct(v.right, tot), `${topicLabel(t)} accuracy`)}<span class="small muted">${tot ? pct(v.right, tot) + '%' : 'not tried'}</span></div>`; }).join('')}
    <h2>Flashcard boxes</h2>
    <p>${['New', 'Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5'].map((l, i) => `<span class="chip static">${l}: ${boxes[i]}</span>`).join(' ')}</p>
    <h2>Recent quizzes</h2>
    ${hist.length ? `<ul>${hist.map((h) => `<li>${new Date(h.t).toLocaleDateString()}: ${esc(scopeLabel(h.scope))}, ${h.ok}/${h.total}</li>`).join('')}</ul>` : '<p>No quizzes yet.</p>'}
    <h2>Your data</h2>
    <p class="row"><button class="btn" id="exp">Export progress</button><label class="btn">Import <input id="imp" type="file" accept="application/json" hidden></label><button class="btn danger" id="rst">Reset everything</button></p>
    <p class="small muted">Progress is stored only in this browser. Nothing is sent anywhere.</p>`;
  document.getElementById('exp').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(store.get(), null, 2)], { type: 'application/json' }));
    a.download = 'mh-policy-trainer-progress.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  document.getElementById('imp').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { store.replace(JSON.parse(await f.text())); viewProgress(); } catch { alert('That file could not be read as progress data.'); }
  };
  document.getElementById('rst').onclick = () => { if (confirm('Erase all progress, checklist ticks and your action plan draft?')) { store.reset(); viewProgress(); } };
}

// ---------- about ----------
function viewAbout() {
  main.innerHTML = `<h1>About</h1>
    <p class="notice">${esc(D.meta.disclaimer)}</p>
    <h2>Sources and cautions</h2>
    <ul>${D.meta.documents.map((d) => `<li><b>${esc(d.title)}</b>. ${esc(d.dateNote)}. ${esc(d.sourceNote)}</li>`).join('')}</ul>
    <ul>
      <li>Summaries and quiz answers were written from the source texts and have not been reviewed by a lawyer or policy expert. A qualified reviewer should check them before the app is used for formal training.</li>
      <li>Where a scan was hard to read, details such as dates and annex layouts may be wrong.</li>
    </ul>
    <h2>If someone is in crisis</h2><p>${esc(D.meta.crisisNote)}</p>
    <h2>Version</h2><p>App ${esc(D.meta.app.name)}, content version ${esc(D.meta.app.contentVersion)} (${esc(D.meta.app.contentDate)}). English only. Works offline once loaded.</p>
    <p id="install-slot"></p>`;
  showInstall();
}

let deferredInstall = null;
function showInstall() {
  const el = document.getElementById('install-slot');
  if (!el || !deferredInstall) return;
  el.innerHTML = '<button class="btn primary" id="install">Install this app</button>';
  document.getElementById('install').onclick = async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; el.innerHTML = ''; };
}
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; showInstall(); });

// ---------- theme ----------
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const b = document.getElementById('btn-theme');
  b.textContent = t === 'dark' ? '☀' : '☾';
  b.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = t === 'dark' ? '#0b1f1d' : '#0f766e';
}

// ---------- boot ----------
async function boot() {
  const names = ['meta', 'sections', 'glossary', 'questions', 'lessons', 'flashcards', 'scenarios', 'paths', 'checklist', 'comparison'];
  try {
    const res = await Promise.all(names.map((n) => fetch(`data/${n}.json`).then((r) => { if (!r.ok) throw new Error(n); return r.json(); })));
    names.forEach((n, i) => { D[n] = res[i]; });
  } catch (e) {
    main.innerHTML = `<h1>Could not load the content</h1><p>The data files failed to load (${esc(e.message)}). Serve this folder over HTTP, for example <code>python3 -m http.server</code>, instead of opening index.html directly.</p>`;
    return;
  }
  D.sec = Object.fromEntries(D.sections.map((s) => [s.id, s]));
  D.docById = Object.fromEntries(D.meta.documents.map((d) => [d.id, d]));
  D.topicById = Object.fromEntries(D.meta.topics.map((t) => [t.id, t]));
  D.agencyById = Object.fromEntries(D.meta.agencies.map((a) => [a.id, a]));
  D.flatLessons = D.lessons.flatMap((m) => m.lessons.map((l) => ({ ...l, module: m })));

  document.getElementById('btn-back').onclick = router.back;
  document.getElementById('btn-fwd').onclick = router.forward;
  document.getElementById('btn-theme').onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };
  document.getElementById('foot-note').textContent = D.meta.disclaimer;
  router.init(render);
}

applyTheme(document.documentElement.dataset.theme || 'light');
boot();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
