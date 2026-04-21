---
name: dev-init
model: claude-sonnet-4-6
description: /dev 파이프라인 초기 설정. 서비스, 플랫폼, 작업자를 설정하고 Notion MCP 연결을 검증한다. 처음 /dev를 사용하기 전에 반드시 실행해야 한다. "/dev init", "초기 설정", "서비스 설정", "플랫폼 설정"
argument-hint: (인자 없음)
---

# dev-init

/dev 파이프라인 사용 전 1회 실행하는 초기 설정. 서비스, 플랫폼, 작업자 정보를 수집하고 Notion MCP 연결을 확인한 뒤 `.claude/dev-config.json`에 저장한다.

---

## 기존 설정 확인

`.claude/dev-config.json`이 이미 있는지 먼저 확인한다.

**있으면:**
```
기존 설정이 있습니다:
  서비스: [service]
  플랫폼: [platform]
  작업자: [worker]

변경할 항목을 선택하세요:
1. 서비스
2. 플랫폼
3. 작업자
4. 전체 재설정
5. 변경 없음
```
선택한 항목만 다시 질문한다. "5. 변경 없음"이면 설정 완료 메시지로 바로 이동.

**없으면:** 아래 전체 설정을 순서대로 진행.

---

## 설정 수집

**반드시 한 번에 하나씩** 질문한다. 답변을 받은 후 다음 질문으로 넘어간다.

### (1) 서비스 선택

```
어떤 서비스에서 작업하시나요?
1. 달라
2. 클럽라이브
3. 여보야
4. 클럽5678
5. AI식단
```

### (2) 플랫폼 선택

```
플랫폼을 선택하세요.
1. iOS
2. Android
```

### (3) 작업자 이름

```
작업자 이름을 입력하세요. (예: 홍길동)
```

### (4) Notion MCP 검증

```
Notion MCP 연결을 확인합니다...
```

Notion MCP의 search 도구를 호출해본다.

**성공:**
```
✓ Notion MCP 연결 확인 완료
```

**실패:**
```
✗ Notion MCP가 연결되지 않았습니다.

설정 방법:
1. Claude Code 설정에서 Notion MCP 서버 추가
2. Notion 계정 연결 (OAuth 인증)

Notion MCP 없이도 개발 단계(4~6번)는 사용 가능합니다.
기획/테스트 단계(1~3, 7번)는 Notion 연동이 필요합니다.

계속 진행하시겠습니까?
```

### (5) 디자인 툴 MCP 검증

```
디자인 툴 MCP 연결을 확인합니다...
```

Figma MCP와 Zeplin MCP 중 연결된 것이 있는지 확인한다. 둘 중 하나라도 성공하면 통과.

**Figma 또는 Zeplin 연결 성공:**
```
✓ 디자인 툴 MCP 연결 확인 완료 ([Figma / Zeplin])
```

**둘 다 실패:**
```
✗ Figma / Zeplin MCP가 연결되지 않았습니다.

설정 방법:
1. Claude Code 설정에서 Figma 또는 Zeplin MCP 서버 추가
2. 해당 계정 연결

디자인 MCP 없이도 개발 단계(4~6번)는 사용 가능합니다.
UI 흐름도(3.1) 단계에서 디자인 파일 참조 시 연동이 필요합니다.

계속 진행하시겠습니까?
```

---

## 설정 저장

`.claude/dev-config.json`에 저장한다:

```json
{
  "service": "달라",
  "platform": "iOS",
  "worker": "윤병은",
  "designTool": "Figma"
}
```

`designTool` 값은 연결 확인된 툴 이름("Figma" 또는 "Zeplin")을 저장한다. 둘 다 실패한 경우 `null`.

이 파일은 `.gitignore`에 포함되어 git에 커밋되지 않는다.

---

## 완료 메시지

```
✓ 설정 완료!
  서비스: [service]
  플랫폼: [platform]
  작업자: [worker]
  Notion: 연결됨 / 미연결
  디자인 툴: [Figma / Zeplin / 미연결]

'/dev'를 실행하여 작업을 시작하세요.
설정을 변경하려면 '/dev-init'을 다시 실행하세요.
```
