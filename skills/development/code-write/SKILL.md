---
name: code-write
model: claude-sonnet-4-6
description: 확정된 blueprint를 기반으로 플랫폼별 코드를 작성할 때 사용. superpowers의 brainstorming → writing-plans → test-driven-development 체인을 필수 선행으로 수행하고, 프로젝트 CLAUDE.md의 아키텍처와 컨벤션을 따른다. 작성 완료 후 code-review 스킬을 트리거한다. "코드 작성", "개발", "플랫폼 구현", "code-write"
version: 0.1.0
---

# code-write

확정된 blueprint를 기반으로, `superpowers:test-driven-development`의 Red 단계에서 작성된 실패 테스트를 통과시키는 코드를 작성한다. 프로젝트 CLAUDE.md의 아키텍처/컨벤션을 따른다.

---

## superpowers 파이프라인 (필수 선행)

blueprint 문서가 확정된 상태에서 코드 작성에 진입하기 전, 아래 순서로 superpowers 스킬을 호출한다.

1. **superpowers:brainstorming** — 확정된 blueprint를 입력으로, 작성 단위(데이터 모델/리포지토리/비즈니스/UI) 수준에서 세부 설계를 재점검한다. brainstorming의 terminal state는 writing-plans 호출이다.
2. **superpowers:writing-plans** — brainstorming에서 합의된 설계를 기반으로 작업번호별 작성 plan을 작성한다. blueprint(산출물)와 plan(실행 단위)은 서로 다른 층위다.
3. **superpowers:test-driven-development** — plan의 각 실행 단위마다 Red → Green → Refactor를 엄격히 따른다. 아래 "작성 순서"의 각 레이어 전환 시점에 TDD 사이클을 완주해야 한다.

세 skill은 rigid 스킬이므로 요약하지 말고 정의된 절차 그대로 따른다. 프로젝트 고유 컨텍스트(테스트 프레임워크·네이밍 등)는 CLAUDE.md에서 가져온다.

---

## 입력

1. **공통 설계** — Notion에서 **skills/common/notion-writer** 스킬로 읽거나, 직전 단계에서 전달
2. **실패 테스트** — `superpowers:test-driven-development`의 Red 단계에서 작성한 실패 테스트
3. **프로젝트 CLAUDE.md** — 아키텍처, 컨벤션, DI 방식, 파일 구조 정의

CLAUDE.md가 없거나 관련 내용이 없으면 사용자에게 확인한다:
```
프로젝트의 아키텍처와 컨벤션을 알려주세요.
(예: Clean Architecture + MVVM, Needle DI 등)
```

### 디자인 컨텍스트 (design-check 결과)

`state.stages["4.1"].result`를 읽어 디자인 소스 전략을 확인한다. 값에 따라 참조 방식이 달라진다.

| strategyId              | tokenized | 참조 방식                                                     |
| ----------------------- | --------- | ------------------------------------------------------------- |
| `zeplin-manual`         | false     | `designSource` Zeplin 링크를 열어 치수·색상·에셋을 수동 확인  |
| `figma-screenshot`      | false     | `designSource` 스크린샷 파일을 로드하여 비전 기반 해석        |
| `figma-mcp-tokenized`   | true      | Figma MCP로 노드 조회 + 서비스 디자인 토큰 매핑 사용          |
| `skip-bugfix`           | -         | 버그 수정 — 디자인 소스 참조 없이 기존 컨벤션으로 구현        |

`state.stages["4.1"].done === false`이면 "디자인 체크가 아직 완료되지 않았습니다. /dev에서 4.1 단계를 먼저 완료해주세요." 안내 후 종료.

---

## 구현 원칙

- **TDD Green 단계** — 실패 테스트를 통과시키는 최소한의 코드를 작성한다
- **CLAUDE.md 준수** — 네이밍, 파일 구조, 아키텍처 패턴, DI 방식을 엄격히 따른다
- **공통 설계 충실** — 설계에 정의된 데이터 모델, API, 비즈니스 로직을 빠짐없이 구현한다

---

## 구현 순서

아키텍처 레이어 순서로 진행한다. 각 단계마다 해당 테스트를 실행하여 통과를 확인한 뒤 다음 단계로 넘어간다.

```
(1) 데이터 모델 — 공통 설계의 데이터 모델 섹션 기반
    → 모델 관련 테스트 실행 → 통과 확인

(2) 리포지토리/서비스 계층 — API 연동, 데이터 접근
    → API 테스트 실행 → 통과 확인

(3) 비즈니스 로직 계층 — UseCase / Interactor
    → 비즈니스 로직 테스트 실행 → 통과 확인

(4) UI 계층 — 화면 구성, 상태 바인딩, ViewModel
    → 상태 관리 + UI 테스트 실행 → 통과 확인
```

---

## 구현 중 컨벤션 가이드

CLAUDE.md를 기반으로 실시간 가이드한다:

| 항목 | 확인 내용 |
|------|----------|
| 네이밍 | 클래스명, 함수명, 변수명이 CLAUDE.md 규칙을 따르는가 |
| 파일 구조 | 새 파일이 CLAUDE.md에 정의된 디렉토리에 배치되는가 |
| 아키텍처 | Clean Architecture, MVVM 등 정의된 패턴을 따르는가 |
| DI | CLAUDE.md에 정의된 DI 방식(Needle, Hilt 등)을 따르는가 |
| 테스트 프레임워크 | CLAUDE.md에 정의된 프레임워크를 사용하는가 |

---

## 레이어 체크포인트 (커밋 아님)

각 레이어(데이터 모델 → 리포지토리 → 비즈니스 → UI)를 마치면 테스트 통과를 확인하고 **스테이징만** 해둔다. 커밋은 code-review 통과 후 단일/논리 단위로 생성한다.

**리뷰 전 커밋 금지** — 리뷰에서 ✗ 항목이 나오면 히스토리 오염 없이 수정할 수 있도록, 구현 중에는 `git add`까지만 수행한다. TDD 사이클이 내부 커밋을 유도하더라도 이 스킬 범위에서는 보류한다.

---

## 구현 완료 후

모든 테스트가 통과하면 리뷰 전 검증 게이트를 거친 뒤 code-review로 넘긴다:

1. `superpowers:verification-before-completion` 스킬을 Skill 도구로 호출하여 "완료" 주장 전 검증을 수행한다.
2. `skills/development/code-review` 스킬을 Skill 도구로 호출한다.

```
구현 완료 → verification-before-completion → code-review
```

code-review가 통과를 반환하면 해당 스킬의 "리뷰 통과 후 커밋" 가이드에 따라 커밋을 생성한다.

---

## 커밋 규칙 (리뷰 통과 후)

작업번호를 커밋 메시지에 포함하고 논리적 단위로 커밋한다:

```
[DCL-1351] 쿠킹클래스 데이터 모델 구현
[DCL-1351] 쿠킹클래스 API 연동 구현
[DCL-1351] 쿠킹클래스 비즈니스 로직 구현
[DCL-1351] 쿠킹클래스 UI 구현
```

리뷰 중 수정이 생겼다면 수정분을 해당 논리 커밋에 합쳐 하나의 깔끔한 이력으로 만든다(여러 fixup 커밋이 쌓여 있으면 squash).
