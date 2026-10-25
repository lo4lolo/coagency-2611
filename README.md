# AI와 함께 생각하며 배우기 · 분임 토의 앱

2026-2 혁신적 교육방법 연구 조 발표 「AI와 함께 생각하며 배우기: 인간-AI 공동주체성(co-agency) 수업 설계」 뒤에
약 25명이 다섯 주제로 나뉘어 생각을 모으는 웹앱입니다. 설치 없이 휴대전화로 QR만 찍으면 됩니다.

- 공개 주소: https://lo4lolo.github.io/coagency-2611/ (예비: https://coagency-2611.web.app)
- 데이터: Firebase Firestore(프로젝트 `coagency-2611`), 이름은 받지 않음

| 누가 | 주소 | 하는 일 |
|---|---|---|
| 참여자 | `#/join` | 희망 주제 고르기(선착순) → 카드 쓰기 · ♥ 공감 |
| 모든 사람 | `#/all` | 다섯 분임의 한 문장과 카드 보고 ♥ 공감 |
| 분임 진행자 | `#/f/1`~`#/f/5` (PIN) | 카드 기록 · ★ 핵심 · 칸 옮기기 · 분임 한 문장 |
| 운영 | `#/admin` (PIN) | 단계 넘기기 · 타이머 · 정원 · 공감만 받기 · 결과 CSV |
| 큰 화면 | `#/main` | QR → 분임 현황 → 한 문장 → 결론 |

문구와 질문은 `js/content.js`, Firebase 설정과 PIN은 `js/config.js`에서 고칩니다.
리허설은 주소에 `?event=rehearsal`, Firebase 없이 보려면 `?demo=1`을 붙입니다.
