---
name: service-config
model: claude-sonnet-4-6
description: 서비스별 Notion 페이지 ID 매핑 및 dev-config.json 설정을 조회하는 기반 스킬. 다른 스킬이 서비스 설정, Notion 페이지 ID, 작업번호 접두사, 설정 파일을 필요로 할 때 반드시 이 스킬을 참조해야 한다. "서비스 설정", "Notion 페이지", "dev-config", "서비스 매핑"
version: 0.1.0
---

# service-config

/dev 파이프라인의 모든 스킬이 참조하는 기반 데이터. 서비스명으로 Notion 페이지 ID를 조회하고, `.claude/dev-config.json`에서 현재 작업 컨텍스트를 읽는다.

---

## 서비스 목록 및 작업번호 접두사

| 서비스 | 접두사 |
|--------|--------|
| 달라 | DCL |
| 클럽라이브 | CLV |
| 여보야 | YBY |
| 클럽5678 | C56 |
| AI식단 | AID |

작업번호 형식: `접두사-숫자` (예: `DCL-1351`, `YBY-42`)

---

## Notion 페이지 매핑

서비스별로 두 개의 Notion 페이지를 사용한다:
- **design** — 정책서/설계서 페이지 (기획서 검토, UI 흐름도, 데이터 흐름도, 공통 설계 등 산출물 저장)
- **qa** — QA 보드 페이지 (QA 시트 저장)

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

> `page-id-*` 값은 플레이스홀더. 실제 배포 전에 각 서비스의 실제 Notion 페이지 ID로 교체해야 한다.

---

## 페이지 ID 조회

입력: 서비스명 (string)

```
매핑 테이블에서 서비스명으로 조회
→ 있으면: { design: "...", qa: "..." } 반환
→ 없으면: "서비스 '[입력값]'을 찾을 수 없습니다. 지원: 달라, 클럽라이브, 여보야, 클럽5678, AI식단"
```

---

## 설정 파일: .claude/dev-config.json

`/setting/dev-init` 스킬이 생성하는 개인 설정 파일. git에 포함하지 않는다.

```json
{
  "service": "달라",
  "platform": "iOS",
  "worker": "윤병은"
}
```

| 필드 | 타입 | 값 |
|------|------|-----|
| service | string | 달라 / 클럽라이브 / 여보야 / 클럽5678 / AI식단 |
| platform | string | iOS / Android |
| worker | string | 작업자 이름 |

---

## 다른 스킬에서 사용하는 방법

```
1. .claude/dev-config.json 읽기 → service, platform, worker 확보
2. 이 스킬의 매핑 테이블에서 service로 조회 → design, qa 페이지 ID 확보
3. 확보한 페이지 ID로 Notion MCP 호출
```
