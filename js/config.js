// ─────────────────────────────────────────────────────────────
//  운영자가 고치는 파일은 이 파일 하나입니다. (문구·질문은 js/content.js)
// ─────────────────────────────────────────────────────────────

// 1) Firebase 웹앱 설정. apiKey 를 비우거나 주소에 ?demo=1 을 붙이면 '데모 모드'(이 브라우저 안에서만 저장).
//    이 값은 공개되어도 되는 식별 정보입니다. 접근 제어는 firestore.rules 가 맡습니다.
// 프로젝트: coagency-2611 (2026-10-25 4loloty@gmail.com 계정으로 생성, Firestore asia-northeast3)
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAmevdKqRskUHs8B2M6r1l_KgiYT4BGjkk',
  authDomain: 'coagency-2611.firebaseapp.com',
  projectId: 'coagency-2611',
  storageBucket: 'coagency-2611.firebasestorage.app',
  messagingSenderId: '377605175723',
  appId: '1:377605175723:web:d0c0e992d1008384d07aee',
};

// 2) 데이터 묶음 이름. 리허설은 주소에 ?event=rehearsal 을 붙이면 본 수업과 섞이지 않습니다.
export const EVENT_ID = 'coagency-2611';

// 3) 진행용 PIN. 참여자가 실수로 진행 화면을 조작하지 않게 막는 간이 잠금입니다(보안 장치 아님).
export const FACIL_PIN = '2611';   // 분임 진행자(모둠원 5명)
export const ADMIN_PIN = '0000';   // 전체 운영(대표 1명)
