---
name: tdd-guide
description: 공통 설계를 기반으로 TDD 방식으로 테스트를 작성할 때 사용. 설계의 각 섹션에서 테스트 케이스를 도출하고 Red-Green-Refactor 사이클로 진행한다. "TDD", "테스트 작성", "단위 테스트", "UI 테스트"
version: 0.1.0
---

# tdd-guide

공통 설계(common-design)의 각 섹션을 기반으로 테스트 케이스를 도출하고, TDD 사이클(Red → Green → Refactor)로 진행한다.

이 스킬은 `superpowers:test-driven-development` 스킬을 활용한다. TDD 사이클의 구체적인 진행 방법은 해당 스킬을 따른다.

---

## 입력

1. **공통 설계** — Notion에서 notion-writer 스킬로 "공통 설계" 서브페이지를 읽는다
2. **프로젝트 CLAUDE.md** — 테스트 프레임워크와 컨벤션 확인
3. **플랫폼** — `.claude/dev-config.json`의 platform 값

---

## 테스트 케이스 도출

공통 설계의 각 섹션에서 테스트 대상을 추출한다:

| 설계 섹션 | 테스트 종류 | 도출 방법 |
|-----------|-----------|----------|
| 5. 비즈니스 로직 | 단위 테스트 | 각 규칙별로 유효/무효 입력, 경계값 테스트 |
| 4. API 연동 | 단위 테스트 (Mock) | 성공 응답, 에러 응답, 네트워크 에러 |
| 3. 상태 관리 | 단위/UI 테스트 | 각 상태 전환 경로, 상태별 화면 구성 |
| 6. 엣지 케이스 | 단위 + UI 테스트 | 각 엣지 케이스 항목별 1개 이상 |

### 예시: 달라 쿠킹클래스

```
[비즈니스 로직 — 케이크 생성]
- 재료 4종 각 10개 이상 → 케이크 생성 성공
- 재료 1종이라도 10개 미만 → 생성 불가
- 생성 후 재료 각 10개 차감 확인
- 생성 후 스탬프 기록 확인

[비즈니스 로직 — 선물 제한]
- 오늘 안 받은 대상 → 선물 성공
- 오늘 이미 받은 대상 → 수령 제한 에러
- BJ→FAN 교차 선물 → 성공
- 재료 선물 시도 → 불가

[API 연동 — /CookingClass/cake/create]
- 200 성공 → 케이크 객체 + 스탬프 반환
- 400 재료 부족 → 에러 메시지 표시
- 네트워크 에러 → 재시도 안내

[상태 관리 — 이벤트 메인]
- phase BEFORE → 카운트다운 화면
- phase ACTIVE → 정상 화면
- phase ENDED → 결과 화면
- 로딩 중 → 스켈레톤
- 에러 → 재시도 버튼
```

---

## TDD 사이클

각 테스트 케이스마다:

```
Red: 실패하는 테스트 먼저 작성
  → 테스트 실행, 예상대로 실패하는지 확인

Green: 테스트를 통과시키는 최소한의 코드 작성
  → 테스트 실행, 통과 확인

Refactor: 코드 정리 (동작 변경 없이)
  → 테스트 실행, 여전히 통과 확인
```

`superpowers:test-driven-development` 스킬의 가이드를 따른다.

---

## 플랫폼별 테스트 프레임워크

프로젝트의 CLAUDE.md에 정의된 테스트 프레임워크를 사용한다. CLAUDE.md가 없거나 테스트 관련 내용이 없으면 사용자에게 확인한다.

일반적인 프레임워크:
- **iOS**: XCTest, Quick/Nimble
- **Android**: JUnit, Espresso, Compose Testing

---

## 기능 변경 시 (5단계) 추가 규칙

1. **기존 테스트 먼저 실행** — 회귀 기준선 확보
2. **변경 부분에 대한 새 테스트 작성** — 공통 설계의 AS-IS → TO-BE 기반
3. **기존 테스트 + 새 테스트 모두 통과 확인**

---

## 테스트 구성

설계 섹션별로 그룹화한다:

```
tests/
├── BusinessLogic/        ← 5. 비즈니스 로직
│   ├── CakeCreationTests
│   ├── GiftLimitTests
│   └── StampBonusTests
├── API/                  ← 4. API 연동
│   ├── CookingClassAPITests
│   └── BonusTimeAPITests
├── State/                ← 3. 상태 관리
│   ├── EventMainStateTests
│   └── CakeMakingStateTests
└── EdgeCase/             ← 6. 엣지 케이스
    ├── NetworkErrorTests
    └── BonusTimeEdgeCaseTests
```
