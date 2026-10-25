// 주소(#/…)에 따라 화면을 고릅니다.
//   #/          처음 화면(역할 고르기)
//   #/join      참여자: 주제 고르기(선착순)       #/g/3   3분임 참여자 대화판
//   #/f/3       3분임 진행자 진행판(PIN)        #/all   모든 분임 보기·공감
//   #/main      큰 화면(프로젝터)                 #/admin 운영 콘솔(PIN)   #/print  QR 포스터
import { init, mode, onStatus } from './store.js';
import { disposer, esc } from './common.js';
import home from './views/home.js';
import join from './views/join.js';
import all from './views/all.js';
import participant from './views/participant.js';
import facil from './views/facil.js';
import mainscreen from './views/mainscreen.js';
import admin from './views/admin.js';
import print from './views/print.js';

const VIEWS = { '': home, join, all, g: participant, f: facil, main: mainscreen, admin, print };
const root = document.getElementById('app');
let d = disposer();

function route() {
  d.run();
  d = disposer();
  const [name = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/');
  const view = VIEWS[name] || home;
  document.body.dataset.view = VIEWS[name] ? name || 'home' : 'home';
  document.title = 'AI와 함께 생각하며 배우기';
  scrollTo(0, 0);
  try { view(root, arg, d); }
  catch (e) { console.error(e); root.innerHTML = `<main class="gate"><div class="card"><h1>화면을 열지 못했습니다</h1><p>${esc(e.message)}</p></div></main>`; }
}

const badge = document.getElementById('net');
onStatus(s => {
  badge.hidden = s === 'online';
  badge.textContent = s === 'error' ? '연결 오류 · 새로고침해 주세요' : '연결 확인 중…';
});
if (mode === 'local') document.getElementById('demo').hidden = false;

init().then(() => { addEventListener('hashchange', route); route(); })
  .catch(e => { console.error(e); root.innerHTML = `<main class="gate"><div class="card"><h1>연결하지 못했습니다</h1><p>네트워크를 확인하고 새로고침해 주세요.</p><p class="small muted">${esc(e.message)}</p></div></main>`; });
