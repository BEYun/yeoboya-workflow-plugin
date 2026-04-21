---
name: spec-review
model: claude-opus-4-7
description: 기획서 PDF를 4가지 관점(화면 흐름, 상태 정의, 엣지 케이스, 인터랙션)으로 검토하고 피드백 문서를 생성할 때 사용. 기획서를 받으면 반드시 이 스킬로 검토해야 한다. "기획서 검토", "spec review", "PDF 검토", "기획서 분석"
version: 0.2.0
---

# spec-review

기획서 PDF를 읽고 UI/UX 명세 완성도를 검토한다. 이슈를 페이지별로 정리하고 기획자에게 전달할 피드백 HTML을 생성한다. Notion 저장은 하지 않는다 — 최종 기획서 업로드는 2.2(spec-finalize)에서 처리한다.

---

## 입력

사용자에게 PDF 기획서 경로를 질문한다:
```
검토할 기획서 PDF 경로를 알려주세요.
```

PDF를 페이지 단위로 읽는다.

> **PDF Read 제한:** Read 도구는 한 번에 최대 20페이지까지 읽는다. 20페이지가 넘는 PDF는 `pages: "1-20"`, `pages: "21-40"`처럼 나눠서 호출한다. 페이지 누락 없이 끝까지 읽어야 한다.

> **작업 디렉토리:** 기본값은 `.dev-work/[작업번호]/`다. 평가·테스트 등 호출자가 다른 경로를 지정하면 그 경로를 우선한다. 이후 단계의 JSON/HTML 산출물도 같은 디렉토리에 저장한다. 이 문서에서 `[workDir]`는 이 디렉토리를 가리킨다.

---

## 검토 관점 (4가지)

모든 페이지를 아래 4가지 기준으로 빠짐없이 분석한다:

| 관점 | 체크 내용 |
|------|----------|
| **화면 흐름 완전성** | 진입 ~ 이탈까지 모든 경로가 정의되어 있는가. 화면 간 전환, 뒤로가기, 딥링크 진입 등. |
| **상태 정의** | 각 화면의 로딩, 빈 상태, 에러, 성공 상태가 정의되어 있는가. 이벤트 시작 전/종료 후 상태 포함. |
| **엣지 케이스** | 네트워크 오류, 권한 거부, 데이터 없음, 동시 접근, 제한 초과 등이 기술되어 있는가. placeholder(n값 미정 등)도 지적. |
| **인터랙션 명세** | 탭, 스와이프, 길게 누르기 등 동작과 결과가 명확한가. 버튼 탭 후 어떤 일이 일어나는지 정의되어 있는가. |

---

## 결과 출력

검토 결과를 사용자에게 보여주고 확인을 받는다:

```
## 기획서 검토 결과

### p.3 — [화면/섹션 이름]
⚠ [상태 정의] 이슈 제목
  → 문제점: 구체적 설명
  → 권장: 수정 제안

⚠ [엣지 케이스] 이슈 제목
  → 문제점: 구체적 설명
  → 권장: 수정 제안

### p.5 — [화면/섹션 이름]
✓ 검토 통과

---
총 이슈: N건 | 통과: M건
유형별: 상태 정의 X건, 엣지 케이스 Y건, 화면 흐름 Z건, 인터랙션 W건

피드백 HTML을 생성하시겠습니까?
```

---

## 사용자 확인 후

### 피드백 HTML 생성

1. 검토 결과를 JSON 스키마(아래)에 맞춰 `[workDir]/review-data.json`에 저장한다.
2. Node.js 설치 여부를 확인한다 (`which node`).

   > **주의:** `which node`가 통과해도 `node <script>.js` 실행은 샌드박스에서 막힐 수 있다. 설치 확인과 실행 권한은 별개 문제다.

3. Node.js가 없으면 사용자에게 안내:
   ```
   Node.js가 필요합니다. https://nodejs.org 에서 설치 후 다시 시도하세요.
   ```
4. 스크립트를 실행한다:
   ```bash
   node skills/planning/spec-review/scripts/feedback-generator.js [workDir]/review-data.json
   ```

   > **권한 주의:** Claude Code가 제한된 권한 모드로 실행 중이면 위 `node <script>.js` 호출이 샌드박스에서 거부될 수 있다. 이 경우 사용자에게 다음 중 하나를 안내한다:
   > - 해당 `node` 명령을 1회 승인해 달라고 요청
   > - 사용자가 직접 터미널에서 위 명령을 실행
   >
   > **출력:** 스크립트는 JSON과 같은 디렉토리에 `[작업번호]-feedback.html`을 생성하고, 성공 시 해당 HTML 절대 경로를 stdout에 출력한다. 실패 시 stderr로 구체적 에러(스키마 검증 실패 위치 등)를 반환한다.

5. 생성 완료를 사용자에게 안내:
   ```
   피드백 HTML이 생성되었습니다: [workDir]/[작업번호]-feedback.html
   브라우저에서 열어 Cmd+P로 PDF 변환할 수 있습니다.
   ```

#### review-data.json 스키마

```json
{
  "taskId": "DCL-1351",
  "title": "문서 제목",
  "subtitle": "부제목 (버전, 검토 목적)",
  "reviewer": "검토자 이름 (dev-config.json의 worker)",
  "reviewDate": "YYYY. MM. DD",
  "source": "원본 PDF 파일명",
  "pages": [
    {
      "pageNumber": "p.3",
      "title": "화면/섹션 이름",
      "pass": false,
      "issues": [
        {
          "type": "state|edge|flow|interaction",
          "severity": "critical|warn|info",
          "title": "이슈 제목",
          "problem": "문제점 설명",
          "suggestion": "권장 수정사항"
        }
      ]
    },
    {
      "pageNumber": "p.5",
      "title": "화면/섹션 이름",
      "pass": true,
      "passReason": "통과 사유",
      "issues": []
    }
  ]
}
```

**필수 필드:** 루트의 `taskId`, `title`, `subtitle`, `reviewer`, `reviewDate`, `source`, `pages`. 각 page는 `pageNumber`, `title`, `pass`.

**`pass` 페이지 규칙:** `pass: true`인 페이지는 `issues: []` (빈 배열)로 두고 `passReason`에 통과 사유를 적는다. `pass: false` 페이지는 `issues`에 1개 이상의 항목이 있어야 한다.

**type → severity 매핑:** 기본 권장은 `state → critical`, `edge → warn`, `flow`/`interaction` → `info`. 다만 사안의 심각도에 따라 reviewer의 판단으로 override 가능하다 (예: UX 전반을 망가뜨리는 interaction 누락이면 `critical`로 올리는 것이 맞다). 스키마상 어떤 type + 어떤 severity 조합이든 유효하다.

---

## 이슈 없을 시

```
✓ 기획서 검토 통과! 이슈가 발견되지 않았습니다.
```

피드백 HTML은 이슈 없음으로 생성한다.

---

## state 반영

HTML 생성 완료 후 `stages["2.1"].done = true`로 갱신한다. Notion 산출물이 없으므로 `validated`는 `true`로 함께 설정한다.
