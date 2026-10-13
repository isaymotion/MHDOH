// Hash router with its own position tracking, so the in-app Back and Forward
// buttons know when they can move. Each entry carries its index in history.state.
let cur = 0;
let max = 0;
let onChange = () => {};

const MAX_KEY = 'mhpt.maxIndex';
function saveMax() { try { sessionStorage.setItem(MAX_KEY, String(max)); } catch { /* ignore */ } }
function loadMax() { try { return Number(sessionStorage.getItem(MAX_KEY)) || 0; } catch { return 0; } }

export const pathNow = () => location.hash.slice(1) || '/';
export const canBack = () => cur > 0;
export const canForward = () => cur < max;
export const back = () => { if (canBack()) history.back(); };
export const forward = () => { if (canForward()) history.forward(); };

function changed() {
  saveMax();
  onChange(pathNow());
}

export function go(path) {
  if (path === pathNow()) { onChange(path); return; }
  cur += 1;
  max = cur;
  history.pushState({ i: cur }, '', '#' + path);
  changed();
}

// Replace the current entry (used for redirects, so Back does not bounce).
export function replace(path) {
  history.replaceState({ i: cur }, '', '#' + path);
  changed();
}

export function init(cb) {
  onChange = cb;
  const s = history.state;
  if (s && typeof s.i === 'number') {
    cur = s.i;
    max = Math.max(cur, loadMax());
  } else {
    history.replaceState({ i: 0 }, '');
    cur = 0;
    max = 0;
  }
  addEventListener('popstate', (e) => {
    if (e.state && typeof e.state.i === 'number') {
      cur = e.state.i;
    } else {
      // The address was edited by hand: treat it as a new entry.
      cur += 1;
      max = cur;
      history.replaceState({ i: cur }, '');
    }
    changed();
  });
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a) return;
    e.preventDefault();
    go(a.getAttribute('href').slice(1));
  });
  changed();
}
