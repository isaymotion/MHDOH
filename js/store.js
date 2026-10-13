// Progress storage. localStorage can be missing or throw (private windows, blocked
// site data), so every access is wrapped and the app falls back to memory.
const KEY = 'mhpt.v1';
let persistent = true;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    persistent = false;
    return {};
  }
}

let state = read();

export const store = {
  get: () => state,
  slot(name, fallback) {
    if (state[name] === undefined) state[name] = fallback;
    return state[name];
  },
  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      persistent = false;
    }
  },
  replace(next) {
    state = next && typeof next === 'object' ? next : {};
    this.save();
  },
  reset() {
    state = {};
    this.save();
  },
  isPersistent: () => persistent,
};

export function getTheme() {
  try { return localStorage.getItem('mhpt.theme'); } catch { return null; }
}
export function setTheme(t) {
  try { localStorage.setItem('mhpt.theme', t); } catch { /* keep in memory only */ }
}
