# /dev 개발 파이프라인 플러그인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사내 5개 서비스의 iOS/Android 개발 워크플로우를 `/dev` 단일 명령어로 자동화하는 Claude Code 플러그인을 구현한다.

**Architecture:** Claude Code 플러그인 포맷(`.claude-plugin/plugin.json` + `skills/`)으로 구성. `/dev`와 `/dev init` 두 개의 user-invoked 스킬이 진입점이고, 나머지 12개 model-invoked 스킬이 각 단계의 로직을 처리한다. 모든 스킬 생성은 `/skill-creator` 사용 필수.

**Tech Stack:** Claude Code Plugin SDK, Notion MCP, Mermaid (다이어그램), HTML→PDF CLI (puppeteer/wkhtmltopdf)

---

## 파일 구조

```
yeoboya-workflow-plugin-BEYun/
├── .claude-plugin/
│   └── plugin.json                        # 플러그인 메타데이터
├── .gitignore                             # .dev-work/ 제외
├── skills/
│   ├── dev/
│   │   └── SKILL.md                       # /dev 진입점 (user-invoked)
│   ├── dev-init/
│   │   └── SKILL.md                       # /dev init 초기 설정 (user-invoked)
│   ├── service-config/
│   │   └── SKILL.md                       # 서비스별 Notion 페이지 매핑 (model-invoked)
│   ├── notion-writer/
│   │   └── SKILL.md                       # Notion 읽기/쓰기 공통 로직 (model-invoked)
│   ├── feedback-generator/
│   │   └── SKILL.md                       # HTML→PDF 피드백 생성 (model-invoked)
│   ├── spec-review/
│   │   └── SKILL.md                       # 기획서 검토 (model-invoked)
│   ├── ui-flow/
│   │   └── SKILL.md                       # UI 흐름도 작성 (model-invoked)
│   ├── data-flow/
│   │   └── SKILL.md                       # 데이터 흐름도 작성 (model-invoked)
│   ├── common-design/
│   │   └── SKILL.md                       # 공통 설계 작성 (model-invoked)
│   ├── implement/
│   │   └── SKILL.md                       # 플랫폼별 구현 가이드 (model-invoked)
│   ├── bug-fix/
│   │   └── SKILL.md                       # 버그 수정 (model-invoked)
│   ├── code-review/
│   │   └── SKILL.md                       # 코드리뷰 가이드 (model-invoked)
│   ├── tdd-guide/
│   │   └── SKILL.md                       # TDD 단위/UI 테스트 (model-invoked)
│   └── qa-scenario/
│       └── SKILL.md                       # QA 테스트 시나리오 (model-invoked)
├── .dev-work/                             # 로컬 임시 파일 (gitignore)
└── docs/
    └── superpowers/
        ├── specs/                         # 설계 문서
        └── plans/                         # 구현 계획
```

## 의존성 그래프

```
plugin.json + .gitignore (Task 1)
        │
        ▼
service-config (Task 2) ──┐
        │                  │
        ▼                  ▼
notion-writer (Task 3)   feedback-generator (Task 4)
        │                  │
        ├──────────────────┘
        ▼
dev-init (Task 5)
        │
        ▼
spec-review (Task 6)
        │
        ├──────────────────┐
        ▼                  ▼
ui-flow (Task 7)     data-flow (Task 8)
        │                  │
        ├──────────────────┘
        ▼
common-design (Task 9)
        │
        ▼
implement (Task 10) ◄── tdd-guide (Task 11)
        │
        ▼
code-review (Task 12)
        │
        ▼
bug-fix (Task 13)
        │
        ▼
qa-scenario (Task 14)
        │
        ▼
dev (Task 15) — 모든 스킬을 라우팅하는 진입점
```

---

## Task 1: 플러그인 인프라 — plugin.json, .gitignore

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `.gitignore`

- [ ] **Step 1: .claude-plugin 디렉토리 및 plugin.json 생성**

```json
{
  "name": "yeoboya-workflow",
  "description": "여보야 솔루션개발부 /dev 개발 파이프라인 플러그인 — 5개 서비스(달라, 클럽라이브, 여보야, 클럽5678, AI식단)의 iOS/Android 개발 워크플로우 자동화",
  "version": "0.1.0",
  "author": {
    "name": "윤병은"
  }
}
```

- [ ] **Step 2: .gitignore 생성**

```gitignore
.dev-work/
.DS_Store
```

- [ ] **Step 3: 디렉토리 스캐폴딩**

스킬 디렉토리만 미리 생성 (SKILL.md는 각 Task에서 `/skill-creator`로 생성):

```bash
mkdir -p skills/{dev,dev-init,service-config,notion-writer,feedback-generator,spec-review,ui-flow,data-flow,common-design,implement,bug-fix,code-review,tdd-guide,qa-scenario}
mkdir -p .dev-work
```

- [ ] **Step 4: 커밋**

```bash
git add .claude-plugin/plugin.json .gitignore
git commit -m "feat: init plugin infrastructure with plugin.json and .gitignore"
```

---

## Task 2: service-config 스킬 — 서비스별 Notion 페이지 매핑

**Files:**
- Create: `skills/service-config/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `service-config`
**타입:** model-invoked (다른 스킬이 서비스 정보 필요 시 자동 트리거)

**스킬이 포함해야 할 내용:**

1. **서비스 목록과 작업번호 접두사:**

| 서비스 | 접두사 예시 |
|--------|------------|
| 달라 | DCL |
| 클럽라이브 | CLV |
| 여보야 | YBY |
| 클럽5678 | C56 |
| AI식단 | AID |

2. **Notion 페이지 매핑 테이블:**

```json
{
  "달라": {
    "design": "page-id-dalla-design",
    "qa": "page-id-dalla-qa"
  },
  "클럽라이브": {
    "design": "page-id-clublive-design",
    "qa": "page-id-clublive-qa"
  },
  "여보야": {
    "design": "page-id-yeoboya-design",
    "qa": "page-id-yeoboya-qa"
  },
  "클럽5678": {
    "design": "page-id-club5678-design",
    "qa": "page-id-club5678-qa"
  },
  "AI식단": {
    "design": "page-id-aisikdan-design",
    "qa": "page-id-aisikdan-qa"
  }
}
```

> **참고:** page-id 값은 placeholder. 실제 Notion 페이지 ID는 플러그인 배포 전에 실제 값으로 교체해야 함.

3. **조회 함수 명세:**
   - 입력: 서비스명 (string)
   - 출력: `{ design: string, qa: string }` — 해당 서비스의 Notion 페이지 ID
   - 서비스명이 매핑에 없으면 에러 메시지 반환

4. **설정 파일 경로:** `.claude/dev-config.json`
5. **설정 파일 스키마:**

```json
{
  "service": "달라",
  "platform": "iOS",
  "worker": "윤병은"
}
```

**description (트리거 조건):**
> 서비스 설정 조회, Notion 페이지 ID 매핑, dev-config.json 읽기가 필요할 때 사용. "서비스 설정", "Notion 페이지 ID", "서비스별 매핑"

- [ ] **Step 2: 생성된 SKILL.md 내용 확인**

```bash
cat skills/service-config/SKILL.md
```

스킬에 매핑 테이블, 설정 파일 경로, 조회 로직이 모두 포함되어 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add skills/service-config/SKILL.md
git commit -m "feat: add service-config skill with Notion page mapping"
```

---

## Task 3: notion-writer 스킬 — Notion 읽기/쓰기 공통 로직

**Files:**
- Create: `skills/notion-writer/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `notion-writer`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **Notion MCP 도구 사용 규칙:**
   - 페이지 검색: `mcp__claude_ai_Notion__notion-search` — 작업번호로 검색
   - 페이지 조회: `mcp__claude_ai_Notion__notion-fetch` — 페이지 ID로 내용 조회
   - 서브페이지 생성: `mcp__claude_ai_Notion__notion-create-pages` — 부모 페이지 아래 서브페이지 생성
   - 페이지 업데이트: `mcp__claude_ai_Notion__notion-update-page` — 기존 페이지 내용 수정

2. **공통 규칙:**
   - 모든 서브페이지에 **담당자** 필드 필수 (dev-config.json의 worker 값 사용)
   - 기존 서브페이지가 존재하면 새로 생성하지 않고 **업데이트**
   - 업데이트 시 **논의사항**과 **수정사항** 섹션은 건드리지 않음 (회의 기록 보존)

3. **작업번호 페이지 조회/생성 흐름:**
   ```
   service-config에서 design 페이지 ID 조회
   → 해당 페이지 하위에서 작업번호 페이지 검색
   → 없으면 새로 생성
   → 있으면 페이지 ID 반환
   ```

4. **서브페이지 존재 여부 확인 (산출물 검증용):**
   ```
   작업번호 페이지의 하위 페이지 목록 조회
   → 서브페이지 제목으로 존재 여부 반환
   예: "기획서 검토" 서브페이지가 있으면 1단계 완료
   ```

5. **서브페이지 생성/업데이트 흐름:**
   ```
   작업번호 페이지 ID 확보
   → 서브페이지 제목으로 기존 검색
   → 없으면: create-pages로 새 서브페이지 생성 (담당자 포함)
   → 있으면: 기존 내용 fetch → 논의사항/수정사항 제외하고 update
   ```

6. **QA 보드 서브페이지 (7단계용):**
   ```
   service-config에서 qa 페이지 ID 조회
   → qa 페이지 하위에서 작업번호 페이지 검색/생성
   → QA 시트 서브페이지 생성/업데이트
   ```

**description (트리거 조건):**
> Notion에 산출물을 읽거나 쓸 때 사용. 서브페이지 생성, 업데이트, 존재 여부 확인, 작업번호 페이지 관리. "Notion 쓰기", "서브페이지 생성", "산출물 저장"

- [ ] **Step 2: 생성된 SKILL.md 내용 확인**

Notion MCP 도구명이 정확한지, 공통 규칙(담당자 필수, 논의사항 보존)이 포함되어 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add skills/notion-writer/SKILL.md
git commit -m "feat: add notion-writer skill for Notion read/write operations"
```

---

## Task 4: feedback-generator 스킬 — HTML→PDF 피드백 생성

**Files:**
- Create: `skills/feedback-generator/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `feedback-generator`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **목적:** 기획서 검토 결과를 기획자에게 전달할 수 있는 PDF로 변환

2. **HTML 템플릿 구조:**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <meta charset="UTF-8">
     <style>
       body { font-family: 'Apple SD Gothic Neo', sans-serif; padding: 40px; }
       .page-section { margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; }
       .page-number { font-size: 18px; font-weight: bold; color: #333; }
       .issue { margin: 10px 0; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; }
       .issue-location { font-weight: bold; }
       .issue-problem { color: #856404; }
       .issue-suggestion { color: #155724; background: #d4edda; padding: 8px; margin-top: 5px; }
       .pass { color: #155724; background: #d4edda; padding: 10px; }
     </style>
   </head>
   <body>
     <h1>[작업번호] 기획서 검토 피드백</h1>
     <p>검토자: [작업자명] | 검토일: [날짜]</p>
     <!-- 페이지별 섹션 반복 -->
     <div class="page-section">
       <div class="page-number">p.[N]</div>
       <div class="issue">
         <div class="issue-location">위치: [구체적 위치]</div>
         <div class="issue-problem">문제점: [설명]</div>
         <div class="issue-suggestion">권장 수정사항: [제안]</div>
       </div>
     </div>
   </body>
   </html>
   ```

3. **PDF 변환 방법 (우선순위):**
   - 1순위: `npx puppeteer` (Node.js 환경)
     ```bash
     node -e "
     const puppeteer = require('puppeteer');
     (async () => {
       const browser = await puppeteer.launch();
       const page = await browser.newPage();
       await page.setContent(require('fs').readFileSync('feedback.html', 'utf8'));
       await page.pdf({ path: 'feedback.pdf', format: 'A4', printBackground: true });
       await browser.close();
     })();
     "
     ```
   - 2순위: `wkhtmltopdf feedback.html feedback.pdf`
   - 3순위: 사용 가능한 도구가 없으면 HTML 파일만 생성하고 안내

4. **출력 경로:** `.dev-work/[작업번호]/[작업번호]-feedback.pdf`

**description (트리거 조건):**
> 기획서 검토 피드백을 HTML→PDF로 변환할 때 사용. "피드백 PDF", "기획서 피드백 생성", "HTML to PDF"

- [ ] **Step 2: 생성된 SKILL.md 확인**

HTML 템플릿과 PDF 변환 명령어가 포함되어 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add skills/feedback-generator/SKILL.md
git commit -m "feat: add feedback-generator skill for HTML-to-PDF conversion"
```

---

## Task 5: dev-init 스킬 — 초기 설정

**Files:**
- Create: `skills/dev-init/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `dev-init`
**타입:** user-invoked (`/dev init`로 실행)

**Frontmatter:**
```yaml
---
name: dev-init
description: /dev 파이프라인 초기 설정 — 서비스, 플랫폼, 작업자 설정 및 Notion MCP 검증
argument-hint: (인자 없음)
---
```

**스킬이 포함해야 할 내용:**

1. **기존 설정 확인:**
   ```
   .claude/dev-config.json 존재 확인
   → 존재: "기존 설정이 있습니다: [서비스] / [플랫폼] / [작업자]. 변경할 항목을 선택하세요."
            변경할 항목만 선택적으로 수정 가능
   → 없음: 전체 설정 시작
   ```

2. **수집 순서 (순서대로 하나씩 질문):**

   **(1) 서비스 선택:**
   ```
   어떤 서비스에서 작업하시나요?
   1. 달라
   2. 클럽라이브
   3. 여보야
   4. 클럽5678
   5. AI식단
   ```

   **(2) 플랫폼 선택:**
   ```
   플랫폼을 선택하세요.
   1. iOS
   2. Android
   ```

   **(3) 작업자 이름:**
   ```
   작업자 이름을 입력하세요. (예: 윤병은)
   ```

   **(4) Notion MCP 검증:**
   ```
   Notion MCP 연결을 확인합니다...
   → mcp__claude_ai_Notion__notion-search 호출 시도
   → 성공: "✓ Notion MCP 연결 확인 완료"
   → 실패: "✗ Notion MCP가 연결되지 않았습니다.
            설정 방법:
            1. Claude Code 설정에서 Notion MCP 서버 추가
            2. Notion 계정 연결 (OAuth 인증)
            자세한 내용: https://docs.anthropic.com/en/docs/claude-code/mcp"
   ```

3. **설정 저장:**

   `.claude/dev-config.json`에 저장:
   ```json
   {
     "service": "달라",
     "platform": "iOS",
     "worker": "윤병은"
   }
   ```

4. **완료 메시지:**
   ```
   ✓ 설정 완료!
     서비스: 달라
     플랫폼: iOS
     작업자: 윤병은
     Notion: 연결됨

   '/dev'를 실행하여 작업을 시작하세요.
   설정을 변경하려면 '/dev init'을 다시 실행하세요.
   ```

- [ ] **Step 2: 생성된 SKILL.md 확인**

user-invoked 스킬 frontmatter가 올바른지, 질문 순서와 설정 저장 로직이 포함되어 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add skills/dev-init/SKILL.md
git commit -m "feat: add dev-init skill for initial setup"
```

---

## Task 6: spec-review 스킬 — 기획서 검토

**Files:**
- Create: `skills/spec-review/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `spec-review`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **입력:** PDF 기획서 경로 (사용자에게 질문)

2. **PDF 읽기:**
   ```
   Read 도구로 PDF 파일을 페이지 단위로 읽음
   .dev-work/[작업번호]/ 디렉토리에 원본 경로 기록
   ```

3. **검토 관점 (4가지 기준으로 각 페이지 분석):**

   | 관점 | 체크 내용 |
   |------|----------|
   | 화면 흐름 완전성 | 진입 ~ 이탈까지 모든 경로가 정의되어 있는가 |
   | 상태 정의 | 각 화면의 로딩, 빈 상태, 에러, 성공 상태가 정의되어 있는가 |
   | 엣지 케이스 | 네트워크 오류, 권한 거부, 데이터 없음 등이 기술되어 있는가 |
   | 인터랙션 명세 | 탭, 스와이프, 길게 누르기 등의 동작과 결과가 명확한가 |

4. **결과 출력 (사용자에게 보여주고 확인):**
   ```
   ## 기획서 검토 결과

   ### p.3 — 프로필 편집 화면
   ⚠ [상태 정의] 에러 상태 UI 미정의
     → 권장: 네트워크 에러 시 재시도 버튼 포함 에러 화면 추가

   ⚠ [엣지 케이스] 이미지 용량 초과 시 동작 미기술
     → 권장: 10MB 이상 시 압축 또는 안내 팝업 정의

   ### p.5 — 설정 화면
   ✓ 검토 통과

   ---
   총 이슈: N건 | 통과: M건

   이 결과를 Notion에 저장하고 피드백 PDF를 생성하시겠습니까?
   ```

5. **사용자 확인 후:**
   - **notion-writer 스킬** 호출: 작업번호 페이지 하위에 "기획서 검토" 서브페이지 생성
     - 담당자: dev-config.json의 worker
     - 내용: 페이지별 이슈 목록 (위치, 문제점, 권장 수정사항)
     - 이슈 없을 시: "검토 통과" 기록
   - **feedback-generator 스킬** 호출: 피드백 HTML → PDF 생성

6. **이슈 없을 시:**
   ```
   ✓ 기획서 검토 통과! 이슈가 발견되지 않았습니다.
   Notion에 "검토 통과"로 기록합니다.
   ```

**description (트리거 조건):**
> 기획서 PDF를 검토하여 UI/UX 명세 완성도를 분석할 때 사용. "기획서 검토", "spec review", "PDF 검토"

- [ ] **Step 2: 생성된 SKILL.md 확인**

4가지 검토 관점, 결과 포맷, notion-writer/feedback-generator 호출 로직이 포함되어 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add skills/spec-review/SKILL.md
git commit -m "feat: add spec-review skill for planning document review"
```

---

## Task 7: ui-flow 스킬 — UI 흐름도 작성

**Files:**
- Create: `skills/ui-flow/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `ui-flow`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **선행조건:** 1번 기획서 검토 완료 (notion-writer로 검증)

2. **입력:** 검토를 거쳐 보완된 최종 기획서 경로 (사용자에게 질문)

3. **처리 흐름:**

   **(1) 화면 목록 추출:**
   ```
   기획서에서 모든 화면(Screen)을 식별하고 목록화
   각 화면의 이름, 역할, 주요 요소 정리
   ```

   **(2) 화면 간 전환 관계 정리:**
   ```
   각 화면에서 다른 화면으로 이동하는 조건과 트리거 정리:
   - 진입 조건 (어떤 상태에서 이 화면에 도달하는가)
   - 이동 트리거 (버튼 탭, 스와이프, 시스템 이벤트 등)
   - 뒤로가기 동작 (이전 화면, 홈, 닫기 등)
   ```

   **(3) 엣지 케이스별 분기:**
   ```
   - 에러 발생 → 얼럿/토스트/에러 화면
   - 권한 거부 → 설정 화면 이동 안내
   - 데이터 없음 → 빈 상태 화면
   - 네트워크 오류 → 재시도 화면
   ```

   **(4) Mermaid 다이어그램 작성:**
   ```mermaid
   stateDiagram-v2
       [*] --> 홈
       홈 --> 프로필_편집: 편집 버튼 탭
       프로필_편집 --> 사진_선택: 사진 변경 탭
       프로필_편집 --> 홈: 저장 성공
       프로필_편집 --> 에러_팝업: 저장 실패
       에러_팝업 --> 프로필_편집: 닫기
       사진_선택 --> 권한_안내: 권한 거부
       권한_안내 --> 설정_이동: 설정 열기
   ```

   **(5) 사용자에게 보여주고 확인:**
   ```
   ## UI 흐름도

   [Mermaid 다이어그램]

   ### 화면별 상태 정의 요약
   | 화면 | 상태 | 설명 |
   |------|------|------|
   | 프로필_편집 | 로딩 | 기존 프로필 데이터 로드 중 |
   | 프로필_편집 | 성공 | 데이터 로드 완료, 편집 가능 |
   | 프로필_편집 | 에러 | 로드 실패, 재시도 버튼 표시 |

   이 내용을 Notion에 저장하시겠습니까?
   ```

   **(6) Notion 저장:**
   - **notion-writer 스킬** 호출
   - 작업번호 페이지 하위에 "UI 흐름도" 서브페이지 생성
   - Notion 서브페이지 구조:
     ```
     [작업번호] UI 흐름도
     ├── 담당자: [worker]
     ├── 상태: 작성완료
     ├── 흐름도
     │   └── Mermaid 다이어그램 + 화면별 상태 정의 요약
     ├── 논의사항
     │   └── (빈 섹션 — 개발회의에서 작성)
     └── 수정사항
         └── (빈 섹션 — 회의 결과 기록)
     ```

**description (트리거 조건):**
> UI 흐름도를 작성하여 화면 간 전환 관계를 Mermaid로 정리할 때 사용. "UI 흐름도", "화면 흐름", "UI flow"

- [ ] **Step 2: 생성된 SKILL.md 확인**

Mermaid 다이어그램 예시, Notion 서브페이지 구조, 논의사항/수정사항 빈 섹션이 포함되어 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add skills/ui-flow/SKILL.md
git commit -m "feat: add ui-flow skill for UI flow diagram generation"
```

---

## Task 8: data-flow 스킬 — 데이터 흐름도 작성

**Files:**
- Create: `skills/data-flow/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `data-flow`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **선행조건:** 1번 기획서 검토 완료

2. **입력:** 검토를 거쳐 보완된 최종 기획서 경로

3. **처리 흐름:**

   **(1) 데이터 항목 추출:**
   ```
   기획서에서 모든 데이터 항목 식별:
   - 사용자 입력 데이터 (폼 필드, 선택값 등)
   - API 요청/응답 데이터
   - 로컬 저장 데이터 (캐시, UserDefaults, DB)
   - 외부 서비스 데이터 (CDN, 푸시, 분석 등)
   ```

   **(2) 데이터 흐름 정리:**
   ```
   각 데이터 항목의 생명주기:
   생성(입력/수신) → 가공(변환/검증) → 표시(UI 렌더링) → 저장(로컬/서버)
   ```

   **(3) 파트별 책임 구분:**
   ```
   - 프론트엔드: UI 입력 수집, 데이터 표시, 로컬 캐시
   - 백엔드: API 처리, 데이터 검증, 영속 저장
   - 외부 서비스: CDN, 푸시 알림, 결제 등
   ```

   **(4) Mermaid 다이어그램 작성:**
   ```mermaid
   sequenceDiagram
       participant U as 사용자
       participant F as 프론트엔드
       participant B as 백엔드 API
       participant S as 외부 서비스

       U->>F: 프로필 이미지 선택
       F->>F: 이미지 리사이즈/압축
       F->>B: PUT /api/profile/image
       B->>S: CDN 업로드
       S-->>B: CDN URL 반환
       B-->>F: { imageUrl: "https://cdn.example.com/..." }
       F->>F: 로컬 캐시 업데이트
       F-->>U: 새 프로필 이미지 표시
   ```

   **(5) 데이터 모델 정의:**
   ```
   ### Profile
   | 필드 | 타입 | 설명 | 소스 |
   |------|------|------|------|
   | id | String | 유저 고유 ID | 서버 |
   | nickname | String | 닉네임 (2-20자) | 사용자 입력 |
   | imageUrl | String? | 프로필 이미지 CDN URL | 서버 |
   | updatedAt | Date | 최종 수정일 | 서버 |
   ```

   **(6) API 엔드포인트 초안:**
   ```
   ### API 엔드포인트
   | Method | Path | 설명 | Request | Response |
   |--------|------|------|---------|----------|
   | GET | /api/profile | 프로필 조회 | - | Profile |
   | PUT | /api/profile | 프로필 수정 | ProfileUpdateReq | Profile |
   | PUT | /api/profile/image | 이미지 변경 | multipart/form-data | { imageUrl } |
   ```

   **(7) 사용자 확인 후 Notion 저장:**
   - **notion-writer 스킬** 호출
   - 작업번호 페이지 하위에 "데이터 흐름도" 서브페이지 생성
   - Notion 서브페이지 구조:
     ```
     [작업번호] 데이터 흐름도
     ├── 담당자: [worker]
     ├── 상태: 작성완료
     ├── 흐름도
     │   └── Mermaid 다이어그램 + 데이터 모델 정의 + API 엔드포인트 초안
     ├── 논의사항
     │   └── (빈 섹션)
     └── 수정사항
         └── (빈 섹션)
     ```

**description (트리거 조건):**
> 데이터 흐름도를 작성하여 데이터 모델, API 엔드포인트, 파트별 책임을 정리할 때 사용. "데이터 흐름도", "data flow", "API 설계"

- [ ] **Step 2: 생성된 SKILL.md 확인**

- [ ] **Step 3: 커밋**

```bash
git add skills/data-flow/SKILL.md
git commit -m "feat: add data-flow skill for data flow diagram generation"
```

---

## Task 9: common-design 스킬 — 공통 설계 작성

**Files:**
- Create: `skills/common-design/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `common-design`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **선행조건:** 1, 2, 3번 완료 + 개발회의 수정사항 반영 확인

2. **입력:**
   - Notion의 UI 흐름도 (notion-writer로 조회)
   - Notion의 데이터 흐름도 (notion-writer로 조회)
   - 최종 기획서 PDF

3. **신규 개발 (4단계) 처리 흐름:**

   **(1) 산출물 읽기:**
   ```
   notion-writer 스킬로:
   - UI 흐름도 서브페이지 내용 조회 (수정사항 섹션 포함)
   - 데이터 흐름도 서브페이지 내용 조회 (수정사항 섹션 포함)
   기획서 PDF 읽기
   ```

   **(2) 공통 설계 작성 (플랫폼 무관):**
   ```
   ## [작업번호] 공통 설계

   ### 1. 화면 구조
   [UI 흐름도 기반 — 각 화면의 구성요소와 레이아웃 구조]

   ### 2. 데이터 모델
   [데이터 흐름도 기반 — 엔티티 정의, 관계, 타입]

   ### 3. 상태 관리
   [각 화면의 상태 정의와 전환 로직]
   - 로딩 → 성공/실패 분기
   - 사용자 액션별 상태 변경

   ### 4. API 연동
   [데이터 흐름도의 API 엔드포인트 + 요청/응답 상세]

   ### 5. 비즈니스 로직
   [핵심 비즈니스 규칙과 검증 로직]
   - 입력 검증 규칙
   - 계산/변환 로직
   - 권한 체크

   ### 6. 엣지 케이스 처리
   [기획서 + UI/데이터 흐름도에서 도출된 예외 상황과 대응]
   ```

4. **변경/고도화 (5단계) 처리 흐름:**

   **(1) 기존 설계 파악 (추가 단계):**
   ```
   notion-writer로 기존 정책서/설계서 페이지 검색
   → 있으면: 기존 설계 내용 조회
   → 없으면: 기존 코드 분석 (프로젝트 CLAUDE.md 참조)
   ```

   **(2) 변경점 중심 설계:**
   ```
   ## [작업번호] 공통 설계 (변경)

   ### 변경 배경
   [왜 변경이 필요한지]

   ### 기존 설계 요약
   [현재 동작 방식 간단 정리]

   ### 변경 사항
   [각 섹션별 AS-IS → TO-BE]

   ### 영향 범위
   [변경으로 인해 함께 수정해야 하는 부분]
   ```

5. **사용자 확인 후 Notion 저장:**
   - **notion-writer 스킬** 호출
   - 작업번호 페이지 하위에 "공통 설계" 서브페이지 생성

**description (트리거 조건):**
> 플랫폼 공통 설계를 작성할 때 사용. 기획서, UI/데이터 흐름도를 기반으로 화면 구조, 데이터 모델, 비즈니스 로직 설계. "공통 설계", "common design", "설계 작성"

- [ ] **Step 2: 생성된 SKILL.md 확인**

신규(4단계)와 변경(5단계) 두 가지 흐름이 모두 포함되어 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add skills/common-design/SKILL.md
git commit -m "feat: add common-design skill for platform-agnostic design spec"
```

---

## Task 10: tdd-guide 스킬 — TDD 테스트 가이드

**Files:**
- Create: `skills/tdd-guide/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `tdd-guide`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **목적:** 공통 설계 기반으로 단위/UI 테스트를 TDD 방식으로 작성하도록 가이드

2. **superpowers 연동:**
   ```
   이 스킬은 superpowers의 test-driven-development 스킬을 활용한다.
   TDD 사이클: Red(실패 테스트 작성) → Green(최소 구현) → Refactor(개선)
   ```

3. **테스트 대상 도출 (공통 설계 기반):**
   ```
   공통 설계의 각 섹션에서 테스트 케이스 도출:

   [비즈니스 로직] → 단위 테스트
   - 입력 검증 규칙 → 유효/무효 입력 테스트
   - 계산/변환 로직 → 경계값 테스트
   - 상태 전환 → 각 전환 경로 테스트

   [API 연동] → 단위 테스트 (Mock)
   - 성공 응답 처리
   - 에러 응답 처리
   - 네트워크 에러 처리

   [UI 상태] → UI 테스트
   - 각 상태(로딩/성공/에러/빈 상태)에서의 화면 구성
   - 사용자 인터랙션 → 상태 변경 확인
   ```

4. **플랫폼별 테스트 프레임워크:**
   ```
   프로젝트의 CLAUDE.md에 정의된 테스트 프레임워크와 컨벤션을 따른다.
   CLAUDE.md가 없거나 테스트 관련 정의가 없으면 사용자에게 확인.

   일반적인 프레임워크:
   - iOS: XCTest, Quick/Nimble
   - Android: JUnit, Espresso, Compose Testing
   ```

5. **변경 작업(5단계) 시 추가 규칙:**
   ```
   - 변경 부분에 대한 새 테스트 작성
   - 기존 테스트가 있으면 회귀 테스트로 먼저 실행
   - 기존 테스트가 통과하는 상태에서 새 테스트 추가
   ```

**description (트리거 조건):**
> TDD 방식으로 테스트를 작성할 때 사용. 공통 설계 기반 테스트 케이스 도출, Red-Green-Refactor 사이클 가이드. "TDD", "테스트 작성", "단위 테스트"

- [ ] **Step 2: 생성된 SKILL.md 확인**

- [ ] **Step 3: 커밋**

```bash
git add skills/tdd-guide/SKILL.md
git commit -m "feat: add tdd-guide skill for test-driven development guidance"
```

---

## Task 11: implement 스킬 — 플랫폼별 구현 가이드

**Files:**
- Create: `skills/implement/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `implement`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **입력:**
   - 공통 설계 (Notion에서 조회 또는 직전 단계에서 전달)
   - 프로젝트 CLAUDE.md (아키텍처/컨벤션)
   - TDD 테스트 (tdd-guide에서 작성한 실패 테스트)

2. **구현 원칙:**
   ```
   - 테스트를 통과시키는 방향으로 코드 작성 (TDD Green 단계)
   - 프로젝트 CLAUDE.md의 아키텍처 패턴을 엄격히 따름
   - CLAUDE.md가 없으면 사용자에게 아키텍처/컨벤션 확인
   ```

3. **구현 순서:**
   ```
   (1) 데이터 모델 구현 — 공통 설계의 데이터 모델 섹션 기반
   (2) 리포지토리/서비스 계층 — API 연동, 데이터 접근
   (3) 비즈니스 로직 계층 — UseCase/ViewModel
   (4) UI 계층 — 화면 구성, 상태 바인딩
   각 단계마다: 해당 테스트 실행 → 통과 확인 → 다음 단계
   ```

4. **실시간 가이드:**
   ```
   구현 중 CLAUDE.md 기반으로 실시간 컨벤션 가이드:
   - 네이밍 규칙 준수 여부
   - 파일/디렉토리 구조 준수 여부
   - 아키텍처 패턴 (Clean Architecture, MVVM 등) 준수 여부
   - DI 방식 준수 여부
   ```

5. **커밋 규칙:**
   ```
   작업번호를 커밋 메시지에 포함:
   [DCL-1351] 프로필 개편 기능 구현
   [DCL-1351] 프로필 편집 UI 테스트 추가
   ```

**description (트리거 조건):**
> 공통 설계를 기반으로 플랫폼별 코드를 구현할 때 사용. CLAUDE.md 컨벤션 기반 실시간 가이드, TDD Green 단계 구현. "코드 구현", "implement", "플랫폼 구현"

- [ ] **Step 2: 생성된 SKILL.md 확인**

- [ ] **Step 3: 커밋**

```bash
git add skills/implement/SKILL.md
git commit -m "feat: add implement skill for platform-specific implementation"
```

---

## Task 12: code-review 스킬 — 코드리뷰 가이드

**Files:**
- Create: `skills/code-review/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `code-review`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **superpowers 연동:**
   ```
   이 스킬은 superpowers의 requesting-code-review 스킬을 활용한다.
   Claude 자동 리뷰 → 사용자 최종 확인 흐름.
   ```

2. **리뷰 관점:**
   ```
   (1) 공통 설계 대비 구현 완전성
       - 설계의 모든 항목이 구현되었는가
       - 엣지 케이스가 처리되었는가

   (2) CLAUDE.md 컨벤션 준수
       - 네이밍, 파일 구조, 아키텍처 패턴

   (3) 코드 품질
       - 중복 코드
       - 불필요한 복잡성
       - 에러 처리 적절성

   (4) 테스트 커버리지
       - 비즈니스 로직 테스트 여부
       - 엣지 케이스 테스트 여부
   ```

3. **리뷰 결과 포맷:**
   ```
   ## 코드리뷰 결과

   ### ✓ 통과 항목
   - [설계 완전성] 모든 화면과 상태가 구현됨
   - [컨벤션] MVVM 패턴 준수

   ### ⚠ 개선 권장
   - [코드 품질] ProfileViewModel.swift:45 — 동일 로직 중복, 메서드 추출 권장
   - [테스트] 네트워크 에러 케이스 테스트 누락

   ### ✗ 수정 필요
   - [설계 불일치] 빈 목록 상태 UI 미구현 (공통 설계 6번 항목)

   수정 후 다시 리뷰하시겠습니까?
   ```

**description (트리거 조건):**
> 구현된 코드를 공통 설계 및 CLAUDE.md 기반으로 리뷰할 때 사용. "코드리뷰", "code review", "리뷰 요청"

- [ ] **Step 2: 생성된 SKILL.md 확인**

- [ ] **Step 3: 커밋**

```bash
git add skills/code-review/SKILL.md
git commit -m "feat: add code-review skill for automated code review"
```

---

## Task 13: bug-fix 스킬 — 버그 수정

**Files:**
- Create: `skills/bug-fix/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `bug-fix`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **선행조건:** 1번 기획서 검토 완료 (긴급 시 스킵 가능 — 사용자에게 확인)

2. **대화형 정보 수집 (하나씩 질문):**
   ```
   작업번호는 /dev 진입 시 이미 입력됨.

   질문 1: "에러코드나 에러 메시지가 있나요?"
   질문 2: "스크린샷이 있나요? (경로를 알려주세요)"
   질문 3: "어떤 화면에서, 어떤 동작 시 발생하나요?"
   질문 4: "재현 방법을 알려주세요."
   질문 5: "항상 발생하나요, 간헐적으로 발생하나요?"

   → 각 질문에 "없음" 또는 "모름"도 허용
   → 충분한 정보가 모이면 자동으로 분석 단계로 진행
   ```

3. **버그 유형 분류:**
   ```
   ┌─ 로직/크래시 버그
   │  - 앱 크래시
   │  - 잘못된 동작 (기대와 다른 결과)
   │  - 데이터 불일치
   │
   └─ UI 버그
      - 레이아웃 깨짐
      - 잘못된 표시 (텍스트, 이미지 등)
      - 애니메이션 이상
   ```

4. **원인 파트 특정:**
   ```
   수집된 정보를 기반으로 원인 파트 추정:
   - API/서버 데이터 문제 → 서버팀 공유 필요
   - 비즈니스 로직 오류 → 코드 수정 필요
   - UI 상태 관리 오류 → 상태 로직 수정
   - 데이터 바인딩/레이아웃 문제 → UI 코드 수정
   - 플랫폼 특이 이슈 → OS/SDK 버전 확인
   ```

5. **범위 판단 후 분기:**

   **개발 범위 내:**
   ```
   superpowers의 systematic-debugging 스킬 활용:
   (1) 원인 분석 (코드 추적)
   (2) 버그를 재현하는 테스트 먼저 작성 (TDD Red)
   (3) 수정 (TDD Green)
   (4) 테스트 통과 확인
   (5) code-review 스킬로 리뷰
   (6) 커밋: [작업번호] [버그 설명] 수정
   ```

   **개발 범위 밖 (서버 등):**
   ```
   원인 리포트 생성:
   - 문제 파트: [API/서버/외부 서비스]
   - 근거: [분석 내용]
   - 재현 방법: [정리]
   - 권장 조치: [제안]

   notion-writer 스킬로 작업번호 하위에 "버그 분석 리포트" 서브페이지 생성
   ```

**description (트리거 조건):**
> 버그를 분석하고 수정할 때 사용. 대화형 정보 수집, 유형 분류, 원인 파트 특정, TDD 방식 수정. "버그 수정", "bug fix", "버그 분석"

- [ ] **Step 2: 생성된 SKILL.md 확인**

대화형 수집, 분류, 범위 판단 분기가 모두 포함되어 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add skills/bug-fix/SKILL.md
git commit -m "feat: add bug-fix skill for interactive bug diagnosis and fix"
```

---

## Task 14: qa-scenario 스킬 — QA 테스트 시나리오 작성

**Files:**
- Create: `skills/qa-scenario/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `qa-scenario`
**타입:** model-invoked

**스킬이 포함해야 할 내용:**

1. **선행조건:** 4번(기능 신규 개발) 또는 5번(기능 변경) 완료

2. **입력:**
   - 기획서 PDF
   - Notion 공통 설계 (notion-writer로 조회)
   - 구현된 코드 (현재 프로젝트)

3. **테스트 케이스 도출 (3단계):**

   **(1) 기획서 기반:**
   ```
   기획서의 기능 요구사항에서 정상 시나리오 도출
   - 각 화면의 핵심 기능별 1개 이상의 테스트 케이스
   ```

   **(2) 공통 설계 기반:**
   ```
   엣지 케이스 / 상태 정의에서 추가 케이스 도출
   - 에러 상태, 빈 상태, 권한 거부 등
   - 상태 전환 경계 케이스
   ```

   **(3) 구현 코드 기반:**
   ```
   분기 조건 분석하여 누락 케이스 보완
   - if/else, switch/when 분기 커버리지
   - guard/validation 조건
   ```

4. **테스트 시나리오 포맷:**
   ```
   ### 정상 케이스
   | ID | 시나리오명 | 사전조건 | 테스트 절차 | 기대 결과 | 우선순위 |
   |----|-----------|---------|------------|----------|---------|
   | TC-01 | 프로필 사진 변경 성공 | 로그인 상태, 갤러리 접근 권한 허용 | 1. 프로필 편집 진입 2. 사진 변경 탭 3. 갤러리에서 사진 선택 4. 저장 | 새 프로필 사진 표시, 서버 동기화 | 높음 |

   ### 엣지 케이스
   | ID | 시나리오명 | 사전조건 | 테스트 절차 | 기대 결과 | 우선순위 |
   |----|-----------|---------|------------|----------|---------|
   | TC-05 | 네트워크 끊긴 상태에서 저장 | 비행기 모드 ON | 1. 프로필 수정 2. 저장 탭 | 에러 토스트 표시, 입력 내용 유지 | 높음 |

   ### 회귀 케이스
   | ID | 시나리오명 | 사전조건 | 테스트 절차 | 기대 결과 | 우선순위 |
   |----|-----------|---------|------------|----------|---------|
   | TC-10 | 기존 프로필 조회 정상 동작 | 기존 프로필 데이터 존재 | 1. 프로필 화면 진입 | 기존 데이터 정상 표시 | 높음 |
   ```

5. **사용자 확인 후 Notion 저장:**
   - **notion-writer 스킬** 호출
   - service-config에서 qa 페이지 ID 조회
   - QA 보드 작업번호 하위에 "QA 시트" 서브페이지 생성
   - Notion 구조:
     ```
     [작업번호] QA 시트
     ├── 담당자: [worker]
     ├── 플랫폼: [platform]
     ├── 정상 케이스
     ├── 엣지 케이스
     └── 회귀 케이스
     ```

**description (트리거 조건):**
> QA용 테스트 시나리오를 작성할 때 사용. 기획서, 공통 설계, 구현 코드 기반 테스트 케이스 도출 후 Notion QA 보드에 저장. "QA 시나리오", "테스트 시나리오", "QA 시트"

- [ ] **Step 2: 생성된 SKILL.md 확인**

3단계 도출 로직과 TC 테이블 포맷, QA 보드 저장 로직이 포함되어 있는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add skills/qa-scenario/SKILL.md
git commit -m "feat: add qa-scenario skill for QA test scenario generation"
```

---

## Task 15: dev 스킬 — /dev 진입점 (라우터)

**Files:**
- Create: `skills/dev/SKILL.md`

**생성 방법:** `/skill-creator` 사용

- [ ] **Step 1: `/skill-creator`로 스킬 생성 — 아래 스펙 전달**

**스킬 이름:** `dev`
**타입:** user-invoked (`/dev`로 실행)

**Frontmatter:**
```yaml
---
name: dev
description: /dev 개발 파이프라인 — 기획서 검토부터 QA 시나리오까지 전체 개발 워크플로우 자동화
argument-hint: [작업번호] (선택)
---
```

**스킬이 포함해야 할 내용:**

1. **설정 파일 확인:**
   ```
   .claude/dev-config.json 확인
   → 없으면: "/dev init 을 먼저 실행하여 초기 설정을 완료해주세요." 출력 후 종료
   → 있으면: 설정 읽기
   ```

2. **진입 메시지:**
   ```
   [서비스] / [플랫폼] / [작업자] 님으로 진행합니다.

   작업번호를 입력해주세요. (예: DCL-1351)
   ```
   - argument로 작업번호가 전달된 경우 질문 생략

3. **산출물 기반 자동 검증:**
   ```
   작업번호 입력 후, 모든 단계의 완료 상태를 자동 검증:

   [Notion 검증 — notion-writer 스킬 사용]
   1. 기획서 검토: 작업번호 페이지 하위에 "기획서 검토" 서브페이지 존재?
   2. UI 흐름도: "UI 흐름도" 서브페이지 존재?
   3. 데이터 흐름도: "데이터 흐름도" 서브페이지 존재?
   7. 테스트 시나리오: QA 보드 작업번호 하위에 "QA 시트" 존재?

   [Git 검증]
   4/5/6. 기능 개발/변경/버그 수정: git log --grep='[작업번호]' 커밋 존재?
   ```

4. **단계 메뉴 표시 (검증 결과 반영):**
   ```
   ── 기획 단계 ──
   ✓ 1. 기획서 검토
   ✓ 2. UI 흐름도 작성
     3. 데이터 흐름도 작성

   ── 개발 단계 ──
     4. 기능 신규 개발
     5. 기능 변경 및 고도화
     6. 버그 수정

   ── 테스트 단계 ──
     7. 테스트 시나리오 작성 (QA용)

   번호를 선택하세요.
   ```

5. **선행조건 체인 검증:**

   | 선택 | 선행조건 |
   |------|---------|
   | 1 | 없음 |
   | 2 | 1번 완료 |
   | 3 | 1번 완료 |
   | 4 | 1, 2, 3번 완료 |
   | 5 | 1, 2, 3번 완료 |
   | 6 | 1번 완료 (긴급 시 스킵 가능) |
   | 7 | 4 또는 5 완료 |

   미충족 시:
   ```
   "[선택한 단계]를 진행하려면 [미충족 단계 목록]이 완료되어야 합니다.
   어떤 단계부터 시작하시겠습니까?"
   → 미완료 단계 목록 표시
   ```

6. **재작업 플로우:**
   ```
   이미 완료된 단계 선택 시:
   "[단계명]이 이미 완료되어 있습니다. [해당 산출물]이 수정되었나요?"
   → "네" → 해당 스킬 재실행
   ```

   재작업 완료 시 후행 단계 영향 안내:
   ```
   "[단계명]이 변경되었습니다. 다음 산출물도 업데이트가 필요할 수 있습니다:"
   "  - [후행 단계] (✓ 완료 → ⚠ 확인 필요)"
   "어떤 단계를 업데이트하시겠습니까?"
   ```

7. **영향 전파 규칙:**

   | 재작업 단계 | ⚠ 확인 필요 표시 |
   |------------|-----------------|
   | 1. 기획서 검토 | 2, 3, 4, 5, 7 |
   | 2. UI 흐름도 | 4, 5 |
   | 3. 데이터 흐름도 | 4, 5 |
   | 4/5. 기능 개발/변경 | 7 |

8. **단계별 스킬 라우팅:**

   | 선택 | 호출 스킬 |
   |------|----------|
   | 1 | spec-review |
   | 2 | ui-flow |
   | 3 | data-flow |
   | 4 | common-design → tdd-guide → implement → code-review |
   | 5 | common-design (변경 모드) → tdd-guide → implement → code-review |
   | 6 | bug-fix (내부에서 code-review 호출) |
   | 7 | qa-scenario |

   4번과 5번은 여러 스킬을 순차 실행. 각 스킬 완료 후 다음 스킬로 자동 진행.

- [ ] **Step 2: 생성된 SKILL.md 확인**

메뉴, 선행조건 체인, 산출물 검증, 재작업 플로우, 영향 전파, 스킬 라우팅이 모두 포함되어 있는지 확인.

- [ ] **Step 3: 수동 테스트**

```
/dev init → 설정 완료 확인
/dev → 메뉴 표시 확인
```

- [ ] **Step 4: 커밋**

```bash
git add skills/dev/SKILL.md
git commit -m "feat: add dev skill — main entry point with routing and prerequisite chain"
```

---

## Task 16: 통합 테스트 및 최종 검증

- [ ] **Step 1: 플러그인 구조 확인**

```bash
find skills -name "SKILL.md" | sort
```

14개 SKILL.md가 모두 존재하는지 확인:
```
skills/bug-fix/SKILL.md
skills/code-review/SKILL.md
skills/common-design/SKILL.md
skills/data-flow/SKILL.md
skills/dev-init/SKILL.md
skills/dev/SKILL.md
skills/feedback-generator/SKILL.md
skills/implement/SKILL.md
skills/notion-writer/SKILL.md
skills/qa-scenario/SKILL.md
skills/service-config/SKILL.md
skills/spec-review/SKILL.md
skills/tdd-guide/SKILL.md
skills/ui-flow/SKILL.md
```

- [ ] **Step 2: plugin.json 검증**

```bash
cat .claude-plugin/plugin.json | python3 -m json.tool
```

유효한 JSON인지 확인.

- [ ] **Step 3: 시나리오 워크스루**

`/dev init` → `/dev` → 1번(기획서 검토) → 2번(UI 흐름도) → 3번(데이터 흐름도) 순서로 실행하여 전체 플로우가 동작하는지 확인.

- [ ] **Step 4: Notion MCP 연동 확인**

notion-writer 스킬이 실제로 Notion에 서브페이지를 생성/조회할 수 있는지 확인. service-config의 page-id placeholder를 실제 값으로 교체 필요.

- [ ] **Step 5: 최종 커밋**

```bash
git add -A
git commit -m "feat: complete /dev pipeline plugin v0.1.0 with 14 skills"
```

---

## 참고: Notion 페이지 ID 교체 필요

`skills/service-config/SKILL.md`의 Notion 페이지 매핑에 placeholder (`page-id-*`) 값이 들어있음. 플러그인을 실제 사용하기 전에 각 서비스의 실제 Notion 페이지 ID로 교체해야 함.

교체 방법:
1. 각 서비스의 Notion 정책서/설계서 페이지 URL에서 page ID 추출
2. QA 보드 페이지 URL에서 page ID 추출
3. `service-config/SKILL.md`의 매핑 테이블 업데이트
