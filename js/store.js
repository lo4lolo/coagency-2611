// 데이터 저장소. Firebase 설정이 있으면 Firestore, 없으면 브라우저 안(localStorage) 데모 모드.
// 문서: event(설정·진행 단계), group/{1~5}(분임 자리·카드·공감·한 문장)
import { FIREBASE_CONFIG, EVENT_ID } from './config.js';

const params = new URLSearchParams(location.search);
export const EID = (params.get('event') || EVENT_ID).replace(/[^\w-]/g, '');
export const mode = FIREBASE_CONFIG.apiKey && params.get('demo') !== '1' ? 'firebase' : 'local';
export const DEL = Object.freeze({ __del: true });

const isObj = v => v && typeof v === 'object' && !Array.isArray(v) && v !== DEL;
export function deepMerge(target, patch) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === DEL) delete target[k];
    else if (isObj(v)) target[k] = deepMerge(isObj(target[k]) ? target[k] : {}, v);
    else target[k] = v;
  }
  return target;
}

let statusCb = () => {};
export function onStatus(cb) { statusCb = cb; }

// ── Firestore ──
let fs, db;
async function fsInit() {
  const V = '10.14.1';
  const app = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
  const a = app.initializeApp(FIREBASE_CONFIG);
  try { db = fs.initializeFirestore(a, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
  catch { db = fs.getFirestore(a); }
}
function ref(path) {
  const [kind, n] = path.split('/');
  if (kind === 'event') return fs.doc(db, 'events', EID);
  return fs.doc(db, 'events', EID, 'groups', String(n));
}
function toFs(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === DEL ? fs.deleteField() : isObj(v) ? toFs(v) : v;
  return out;
}

// ── 데모 모드(같은 브라우저의 탭끼리 실시간 동기화) ──
const subs = new Map();
const KEY = p => `ca:${EID}:${p}`;
const bc = 'BroadcastChannel' in window ? new BroadcastChannel(`ca:${EID}`) : null;
function lload(p) { try { return JSON.parse(localStorage.getItem(KEY(p)) || '{}'); } catch { return {}; } }
function lemit(p) { const d = lload(p); subs.get(p)?.forEach(cb => cb(structuredClone(d))); }
function lsave(p, d) { localStorage.setItem(KEY(p), JSON.stringify(d)); lemit(p); bc?.postMessage(p); }
if (bc) bc.onmessage = e => lemit(e.data);

// ── 공통 API ──
let ready;
export function init() { ready ||= mode === 'firebase' ? fsInit() : Promise.resolve(); return ready; }

/** 실시간 구독. 반환값은 해제 함수 */
export function watch(path, cb) {
  if (mode === 'local') {
    if (!subs.has(path)) subs.set(path, new Set());
    subs.get(path).add(cb);
    queueMicrotask(() => cb(lload(path)));
    return () => subs.get(path)?.delete(cb);
  }
  let off = () => {}, dead = false;
  init().then(() => {
    if (dead) return;
    off = fs.onSnapshot(ref(path), { includeMetadataChanges: true },
      snap => { statusCb(snap.metadata.fromCache ? 'cache' : 'online'); cb(snap.data() || {}); },
      err => { console.error(path, err); statusCb('error'); });
  });
  return () => { dead = true; off(); };
}

/** 깊은 병합 저장. 값에 DEL 을 주면 그 필드를 지움 */
export async function patch(path, obj) {
  if (mode === 'local') { lsave(path, deepMerge(lload(path), obj)); return; }
  await init();
  try { await fs.setDoc(ref(path), toFs(obj), { merge: true }); }
  catch (e) { console.error(e); statusCb('error'); throw e; }
}

/** 문서 전체 바꾸기(초기화용) */
export async function replace(path, obj) {
  if (mode === 'local') { lsave(path, obj); return; }
  await init();
  await fs.setDoc(ref(path), obj);
}

/**
 * 여러 문서를 한꺼번에 읽고 고치기(선착순 자리 잡기용).
 * fn(읽은 문서들) 은 { 경로: 고칠 내용 } 을 돌려주거나, 안 되면 Error 를 던집니다.
 * Firebase 에서는 트랜잭션이라 두 사람이 동시에 마지막 자리를 눌러도 한 사람만 들어갑니다.
 */
export async function transact(paths, fn) {
  if (mode === 'local') {
    const out = fn(paths.map(lload));
    for (const [p, obj] of Object.entries(out)) lsave(p, deepMerge(lload(p), obj));
    return;
  }
  await init();
  await fs.runTransaction(db, async tx => {
    const snaps = await Promise.all(paths.map(p => tx.get(ref(p))));
    const out = fn(snaps.map(s => s.data() || {}));
    for (const [p, obj] of Object.entries(out)) tx.set(ref(p), toFs(obj), { merge: true });
  });
}
