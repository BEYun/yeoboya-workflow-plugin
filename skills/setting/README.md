# Setting (세팅)

프로젝트 초기 설정 및 파이프라인 관리.

## 스킬 목록

| 스킬 | 설명 |
|------|------|
| dev | /dev 파이프라인 메인 진입점. 산출물 검증 → 단계 메뉴 → 스킬 라우팅 |
| dev-init | 서비스/플랫폼/작업자 설정 및 Notion MCP 연결 검증 |
| service-config | 서비스별 Notion 페이지 ID 매핑 및 작업번호 접두사 정의 |

## 실행 순서

```
dev-init → service-config → dev
```
