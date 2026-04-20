---
name: design-check
model: claude-sonnet-4-6
description: 개발 진입 전 디자인 시안 존재 여부와 서비스별 디자인 소스 전략(Zeplin / Figma 스크린샷 / Figma MCP + 토큰)을 판정하고 code-write에 컨텍스트로 전달할 때 사용. 버그 수정 작업에서는 자동 스킵된다. "디자인 확인", "design check", "시안 확인"
---

# design-check

`code-write`에 앞서 이번 작업에 맞는 디자인 소스 전략을 판정한다. 작업 종류와 서비스에 따라 Zeplin 링크 / Figma 스크린샷 / Figma MCP + 디자인 토큰 중 하나로 라우팅하고, 결과를 state.json에 저장해 code-write가 참조하도록 한다.

---

## 서비스별 전략 (스킬 내부 상수)

| 서비스 (dev-config.json.service 값) | strategyId               | tokenized | 사용자 요구 자료      |
| ----------------------------------- | ------------------------ | --------- | --------------------- |
| `여보야`                            | `zeplin-manual`          | false     | Zeplin 링크           |
| `클럽5678`                          | `zeplin-manual`          | false     | Zeplin 링크           |
| `달라`                              | `figma-screenshot`       | false     | 스크린샷 업로드       |
| `클럽라이브`                        | `figma-screenshot`       | false     | 스크린샷 업로드       |
| `식단AI`                            | `figma-mcp-tokenized`    | true      | Figma 노드 URL        |

> 토큰화 상태가 실제로 변경되면 이 테이블과 해당 strategyId 블록만 수정한다.

---

## 동작

1. `.claude/active-task` 로 작업번호를 확보하고 `.dev-work/<작업번호>/state.json`을 로드한다. `state.workType`이 `"bugfix"`이면 아래 단축 경로:
   - `state.stages["4.1"] = { done: true, result: { strategyId: "skip-bugfix", designSource: null } }` 로 갱신
   - 쓰기는 `hooks/lib/state.js`의 `readState`/`writeState` 헬퍼(또는 동등한 임시 파일 + rename 방식)로 원자적으로 처리
   - 사용자에게 "버그 수정은 디자인 체크를 건너뜁니다." 출력 후 종료
2. 사용자에게 시안 존재 여부 확인:
   ```
   이 작업에 디자인 시안이 준비되어 있나요? (y/n)
   ```
3. `n` 응답 시:
   - 경고 출력: "디자이너에게 시안을 요청한 뒤 다시 실행해주세요."
   - state 변경 없이 종료 (4.1 미완료 유지)
4. `y` 응답 시:
   - `dev-config.json.service` 를 읽어 위 테이블에서 strategyId / tokenized / 요구 자료 조회
   - 사용자에게 요구 자료 요청:
     - `zeplin-manual` → "Zeplin 링크를 입력해주세요."
     - `figma-screenshot` → "스크린샷 파일 경로(여러 개면 줄바꿈으로 구분)를 입력해주세요."
     - `figma-mcp-tokenized` → "Figma 노드 URL을 입력해주세요."
5. 입력값을 `designSource`에 담아 저장 (`readState`/`writeState` 사용):
   - `state.stages["4.1"] = { done: true, result: { strategyId, designSource, tokenized } }`
6. 완료 메시지:
   ```
   디자인 전략: <strategyId> (토큰화: <예/아니오>) 로 확정했습니다.
   code-write 단계에서 이 정보가 컨텍스트로 주입됩니다.
   ```

---

## dev-config.json에 없는 service 값 처리

테이블에 없는 service이면 아래 메시지 출력 후 state 변경 없이 종료:
```
서비스 '<service값>'은 design-check 전략 테이블에 정의되어 있지 않습니다.
skills/development/design-check/SKILL.md의 전략 테이블에 매핑을 추가해주세요.
```

---

## Notion 저장

하지 않는다. 디자인 전략은 파이프라인 메타데이터이므로 state.json에만 기록한다.
