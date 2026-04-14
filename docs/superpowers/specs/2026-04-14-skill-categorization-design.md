# 스킬 카테고리 분리 설계

## 개요

16개 스킬이 flat하게 `skills/` 디렉토리에 존재하는 현재 구조를 기능 특성별 6개 카테고리로 재구성한다. 하나의 플러그인 안에서 디렉토리 그룹핑 + 카테고리 README 방식을 사용한다.

## 목표

1. 스킬을 역할별로 그룹핑하여 탐색성과 유지보수성 향상
2. 스킬 간 참조를 이름 기반에서 상대 경로 기반으로 변경하여 호출 명확성 확보
3. `common-design` → `tech-spec` 리네이밍
4. 불필요한 evals 디렉토리 삭제

## 디렉토리 구조

```
skills/
├── setting/
│   ├── README.md
│   ├── dev/SKILL.md           # 파이프라인 오케스트레이터
│   ├── dev-init/SKILL.md      # 초기 세팅 (서비스/플랫폼/워커 설정, Notion MCP 검증)
│   └── service-config/SKILL.md # 서비스 레지스트리 (Notion 페이지 ID, 프리픽스 매핑)
├── planning/
│   ├── README.md
│   ├── spec-review/SKILL.md    # 요구사항 PDF 4가지 기준 검토
│   └── feedback-generator/SKILL.md # 검토 결과 다크 에디토리얼 HTML/PDF 생성
├── blueprint/
│   ├── README.md
│   ├── ui-flow/SKILL.md        # 화면 전환 Mermaid 상태 다이어그램
│   ├── data-flow/SKILL.md      # API/데이터 모델 Mermaid 시퀀스 다이어그램
│   └── tech-spec/SKILL.md      # 플랫폼 공통 기술 설계 (기존 common-design)
├── development/
│   ├── README.md
│   ├── implement/SKILL.md      # 설계 + 테스트 기반 프로덕션 코드 작성
│   ├── code-review/SKILL.md    # 설계 완성도/컨벤션/코드 품질/테스트 커버리지 리뷰
│   └── bug-fix/SKILL.md        # 버그 분류/원인 분석/수정/리포트
├── testing/
│   ├── README.md
│   ├── tdd-guide/SKILL.md      # 설계 기반 테스트 케이스 추출, Red-Green-Refactor 가이드
│   └── qa-scenario/SKILL.md    # 3단계 테스트 매트릭스 생성 (정상/엣지/회귀)
└── common/
    ├── README.md
    └── notion-writer/SKILL.md  # 모든 Notion 읽기/쓰기 공통 인터페이스
```

## 파이프라인 흐름

```
setting → planning → blueprint → development → testing
                                      ↑
                                   common (notion-writer는 전 단계에서 사용)
```

## 스킬 간 참조 변경

모든 스킬 간 참조를 `skills/카테고리/스킬명` 상대 경로 형식으로 변경한다.

### 변경 규칙

| 현재 참조 | 변경 후 |
|----------|---------|
| `notion-writer 스킬` | `skills/common/notion-writer 스킬` |
| `service-config 스킬` | `skills/setting/service-config 스킬` |
| `code-review 스킬` | `skills/development/code-review 스킬` |
| `feedback-generator 스킬` | `skills/planning/feedback-generator 스킬` |
| `implement 스킬` | `skills/development/implement 스킬` |
| `tdd-guide 스킬` | `skills/testing/tdd-guide 스킬` |
| `bug-fix 스킬` | `skills/development/bug-fix 스킬` |
| `qa-scenario 스킬` | `skills/testing/qa-scenario 스킬` |
| `spec-review 스킬` | `skills/planning/spec-review 스킬` |
| `ui-flow 스킬` | `skills/blueprint/ui-flow 스킬` |
| `data-flow 스킬` | `skills/blueprint/data-flow 스킬` |
| `common-design 스킬` | `skills/blueprint/tech-spec 스킬` |
| `dev 스킬` | `skills/setting/dev 스킬` |
| `dev-init 스킬` | `skills/setting/dev-init 스킬` |

### 주요 변경 대상 스킬

1. **dev** (오케스트레이터) — 라우팅 테이블의 8개 스킬 참조 전부 경로로 변경
2. **notion-writer를 참조하는 11곳** — spec-review, ui-flow, data-flow, tech-spec, tdd-guide, code-review, implement, qa-scenario, bug-fix, dev 등
3. **service-config를 참조하는 곳** — notion-writer, qa-scenario 등
4. **스킬 체인 참조** — implement→code-review, spec-review→feedback-generator, bug-fix→code-review

## 리네이밍

| 기존 | 변경 | 사유 |
|------|------|------|
| `common-design` | `tech-spec` | 개발팀 기술 설계 의미를 명확히 전달. 기획 spec과도 구분됨 |

SKILL.md 내부의 스킬 이름(name 필드)도 `tech-spec`으로 변경한다.

## 카테고리 README 구조

각 카테고리 README.md에 포함할 내용:

1. **카테고리 목적** — 한 줄 설명
2. **포함 스킬 목록** — 테이블 (스킬명 + 한 줄 설명)
3. **실행 순서** — 카테고리 내 스킬 간 의존 관계 (있는 경우)

### 카테고리별 README 내용

#### setting/README.md
- 목적: 프로젝트 초기 설정 및 파이프라인 관리
- 스킬: dev (파이프라인 오케스트레이터), dev-init (초기 세팅), service-config (서비스 레지스트리)
- 순서: dev-init → service-config → dev

#### planning/README.md
- 목적: 기획 산출물 검토 및 피드백 생성
- 스킬: spec-review (요구사항 검토), feedback-generator (검토 결과 HTML/PDF)
- 순서: spec-review → feedback-generator

#### blueprint/README.md
- 목적: UI/데이터 흐름 설계 및 플랫폼 공통 기술 명세 작성
- 스킬: ui-flow (화면 전환 다이어그램), data-flow (데이터 흐름 다이어그램), tech-spec (플랫폼 공통 기술 설계)
- 순서: ui-flow, data-flow → tech-spec

#### development/README.md
- 목적: 프로덕션 코드 구현, 리뷰, 버그 수정
- 스킬: implement (코드 작성), code-review (코드 리뷰), bug-fix (버그 수정)
- 순서: implement → code-review, bug-fix → code-review

#### testing/README.md
- 목적: 테스트 케이스 생성 및 QA 시나리오 관리
- 스킬: tdd-guide (TDD 가이드), qa-scenario (QA 테스트 매트릭스)
- 순서: tdd-guide (개발 전), qa-scenario (개발 후)

#### common/README.md
- 목적: 전 단계 공통 인프라
- 스킬: notion-writer (Notion 읽기/쓰기 공통 인터페이스)

## 삭제 대상

- 모든 `evals/` 디렉토리 삭제 (각 스킬 하위)

## 작업 범위 요약

1. 스킬 디렉토리를 6개 카테고리 폴더로 이동
2. `common-design/` → `tech-spec/`으로 디렉토리명 및 SKILL.md 내부 이름 변경
3. 모든 SKILL.md 내 스킬 참조를 상대 경로로 변경
4. 6개 카테고리 README.md 생성
5. 모든 evals/ 디렉토리 삭제
