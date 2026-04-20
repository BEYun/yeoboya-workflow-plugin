---
name: work-define
model: claude-haiku-4-5-20251001
description: /dev 파이프라인 진입 시 작업 종류(신규 개발 / 변경·고도화 / 버그 수정)를 선택받고 state.json의 workType에 기록할 때 사용. 이미 workType이 설정된 작업에 대해서는 /dev가 자동 스킵한다. "작업 정의", "work define", "작업 종류"
---

# work-define

/dev 파이프라인 진입 시 작업 종류를 선택받아 `.dev-work/<작업번호>/state.json`의 `workType` 필드를 채운다. 이 값은 이후 메뉴의 스텝 필터링과 tech-spec 모드 결정에 사용된다.

---

## 선행조건

- `.claude/active-task`에 작업번호가 기록되어 있어야 한다 (보통 /dev가 직전에 설정).
- `state.json`이 존재해야 한다.

둘 중 하나라도 없으면 "먼저 /dev를 실행하세요" 안내 후 종료.

---

## 동작

1. 사용자에게 다음 질문 표시:
   ```
   이번 작업의 종류를 선택해주세요.
   1. 신규 개발
   2. 변경 / 고도화
   3. 버그 수정
   ```
2. 선택 값을 workType으로 매핑:
   - `1` → `"new"`
   - `2` → `"change"`
   - `3` → `"bugfix"`
3. `state.json`을 읽어 `workType`에 매핑값을 기록하고 `stages["1.1"]`을 `{ done: true, at: <ISO 현재시각> }`으로 갱신, 파일을 원자적으로 다시 쓴다.
4. 사용자에게 확정 메시지 표시:
   ```
   작업 종류: <한글 라벨> 으로 설정되었습니다.
   ```

---

## 이미 설정된 경우

`state.workType`이 비어 있지 않으면 아래 메시지만 표시하고 변경 없이 종료:
```
이 작업(<작업번호>)의 종류는 이미 '<한글 라벨>'로 설정되어 있습니다.
변경이 필요하면 state.json을 수동 편집한 뒤 /dev를 다시 실행해주세요.
```

---

## Notion 저장

하지 않는다. workType은 순수 파이프라인 메타데이터이다.
