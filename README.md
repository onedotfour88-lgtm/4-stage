# 최부장 비밀 금고 (Choi Bujang Secret Vault)

## 진행 단계 및 현황 기록

### 3단계 진행 현황 (진짜 로그인을 붙입니다)
- **Supabase Auth 연동**: 이메일/비밀번호 기반 로그인/로그아웃 구현
- **인증 토큰 검증**: `src/verify-login.mjs` 검증 규격 준수 및 API 토큰 수신 검증 (`identityProvider` 설정 완료)
- **가상 메모 CRUD API (`/api/memos`)**:
  - `POST /api/memos`: 메모 추가 (`owner_id` 할당, UUID 자동 생성)
  - `GET /api/memos`: 로그인 사용자의 메모 목록 반환 (미인증 시 401 JSON 반환)
  - `GET /api/memos/:id`: 단건 메모 조회 (삭제 후 404)
  - `PUT /api/memos/:id`: 메모 수정
  - `DELETE /api/memos/:id`: 메모 삭제
- **가점 100점 항목 충족**:
  - 무로그인 메모 목록 요청 시 401 JSON 에러 반환
  - 빌드 시 `/aleph.json` 자동 생성 유지 (`scripts/build-public.mjs`)
  - `vercel.json` 내 `X-Content-Type-Options: nosniff` 및 `Content-Security-Policy` 보안 헤더 추가

---

### 이전 단계 기록
- **1~2단계**: XDR 위협 탐지(Detect) 및 대응(Decider) 자동화 구축 완료