---
name: spec-finalize
model: claude-sonnet-4-6
description: 기획회의 이후 확정된 최종 기획서를 제출받아 Notion 작업번호 페이지 하위에 "최종 기획서" 서브페이지로 업로드·정리할 때 사용. 초안 대비 주요 변경점도 함께 기록한다. "최종 기획서", "spec finalize", "기획서 확정"
---

# spec-finalize

기획회의 이후 확정된 **최종 기획서**를 사용자로부터 제출받아 Notion 작업번호 페이지 하위에 "최종 기획서" 서브페이지로 업로드·정리한다. 초안 대비 변경점 요약도 함께 기록하여 다운스트림 설계 단계에서 참조할 수 있게 한다.

---

## 선행조건

- `stages["2.1"].done === true` (기획서 검토 완료 — validate 통과 또는 수동 확인)
- `.claude/active-task`의 작업번호가 유효함

---

## 입력 수집

사용자에게 최종 기획서를 요청한다:

```
최종 기획서 파일 경로 또는 접근 링크를 제공해주세요.
```

파일 경로(PDF 등) 또는 URL 둘 다 허용한다. 변경이 있는 경우 사용자가 변경된 파일을 직접 제공하므로 별도로 변경점을 묻지 않는다.

제출이 없거나 사용자가 "나중에"로 응답하면 state 변경 없이 종료하고 다음 안내를 출력:
```
기획회의 후 최종 기획서가 준비되면 /dev에서 다시 2.2 단계를 선택해주세요.
```

---

## Notion 업로드

`skills/common/notion-writer` 스킬을 호출하여 작업번호 페이지 하위에 **"최종 기획서"** 서브페이지를 생성하거나 갱신한다. 페이지 본문은 다음 구조를 따른다.

```markdown
## [작업번호] 최종 기획서

- 업로드 일시: <ISO 타임스탬프>
- 업로드 작업자: <dev-config.json.worker>

### 원본 자료
- <파일명 또는 링크>
  (PDF라면 파일 첨부, URL이라면 링크 임베드)
```

notion-writer로부터 생성된 페이지의 `page_id`를 확보한다.

---

## state 반영

`.claude/active-task`에서 작업번호를 읽어 `.dev-work/<작업번호>/state.json`을 아래와 같이 갱신한다. 쓰기는 `hooks/lib/state.js`의 `readState`/`writeState` 헬퍼(또는 동등한 임시 파일 + rename 방식)로 원자적으로 처리한다.

- `finalSpec = { pageId: <위에서 얻은 page_id>, uploadedAt: new Date().toISOString() 포맷 }`
- `finalSpec = { pageId: <page_id>, uploadedAt: new Date().toISOString() 포맷 }`
- `stages["2.2"].done = true`
- `validated`와 `artifactPageId`는 Notion 저장 시 `validate-guard.js`(PreToolUse)와 `pageid-capture.js`(PostToolUse) Hook이 자동 기록한다. 이 스킬은 `done`과 `finalSpec`만 설정한다.

---

## 완료 메시지

```
최종 기획서가 업로드되었습니다. 페이지: <Notion 링크>
이어서 설계 단계(3.1 UI 흐름도)로 진행할 수 있습니다.
```
