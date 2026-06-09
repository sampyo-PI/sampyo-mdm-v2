# MDM v2 빅뱅 전환 — v1↔v2 패리티 감사 (2026-06-09 갱신)

> 6-6 감사(`v2_cutover_parity_audit_20260606.md`) 갱신본. 그 사이 변화: **데이터 cutover 실행(cat2→items)**·distribute 보안 해소·Path B(normalized=item_name)·v1 sub_type=속성1/N속성 UI.
> 표기: ✅완료 · 🟡 read-only(쓰기 필요) · 🔴 미구현 · ⏭️ dead(redirect) · 🆕 cutover 후 신규 과제

---

## 0. 6-6 → 6-9 변화 (전환 전제에 영향)
- **데이터 cutover 완료** → `items`/`category_*`가 신 표준(활성 29,952). v2 대부분 페이지가 v1 items 조회라 **신 카탈로그 자동 반영**. ⇒ **v2 cat2 전용 페이지(`/catalog-std` CatalogV2Page, `/request-std` Cat2RegisterPage)는 redundant** — items로 일원화 or 은퇴 (🆕).
- **Path B 확정**(normalized_name=item_name) → "품목명 관리"(`/classification/include-in-name`)는 표준명 생성 설정이라 **은퇴 대상**(저장 활성 불필요). (🆕)
- **distribute 보안 갭 ✅ 해소**(6-6 마이그 20260606100000) → 6-6 감사 §3 첫 항목 완료.
- **v1에 sub_type=속성1 + 자유속성 N개(최대7) UI 추가**(상세 읽기/편집 + 내보내기 8슬롯, 6-9) → **v2에 동일 포팅 필요**(🆕).

## 1. 페이지 패리티 (v1 라우트 기준, 6-9)

| v1 라우트 | v2 대응 | 상태 | 전환 위해 |
|---|---|---|---|
| `/auth` | LoginPage | ✅ | 컷오버 시 OAuth redirect 재설정 |
| `/` 대시보드 | DashboardPage | ✅ | - |
| `/admin/settings` | - | ⏭️ | dead(Navigate) |
| `/admin/users·erp·organization·reviewers·ai-review` | 동일 5 | ✅ CRUD | - |
| `/request/new` | ItemRequestPage | ✅ | sub_type 입력 추가(🆕) / 변형등록 진입 확인 |
| `/request/edit/:id` | - | 🔴 | **기존 신청 편집 모드**(v1은 ItemRequestPage 재사용) |
| `/requests` `/request/my` | RequestsPage | ✅ | - |
| `/approval`→redirect, `/approval/:id` | ApprovalDetailPage | ✅ | `/approval`→`/requests?tab=pending` redirect 추가 |
| `/item/list` | - | 🔴 | ItemListPage — 카탈로그로 흡수 가능 여부 결정 |
| `/catalog` | CatalogPage | ✅ | **sub_type=속성1/N속성 포팅**(🆕) |
| `/catalog/upload` | CatalogUploadPage | 🟡 비활성 | 엑셀 업로드 commit(xlsx) |
| `/item/search` `/item/:id` | ItemDetailDialog(모달) | 🟡 | 직접 딥링크 `/item/:id` 페이지 필요 여부 |
| `/classification/tree` | ClassificationTreePage | 🟡 read-only | **분류 CRUD** |
| `/classification/mapping` | ClassificationMappingPage | 🟡 read-only | **분류-속성 매핑 CRUD** |
| `/classification/include-in-name` | IncludeInNameReviewPage | 🟡 | **은퇴**(Path B로 무의미, 🆕) |
| `/attribute/list` | AttributeListPage | 🟡 read-only | **속성 CRUD** |
| `/unit` | UnitListPage | 🟡 read-only | **단위 CRUD** |
| `/maker-model` | MakerListPage | 🟡 read-only | **제조사 CRUD + 병합** |
| `/ai/dashboard` `/ai/quality` | 동일 | ✅ | - |
| `/ai/settings·training·similar` | - | ⏭️ | dead(Navigate) — 불필요 |
| `/qna` `/qna/:id` | QAListPage/QAThreadPage | ✅ | - |
| `/distribution` | DistributionMonitorPage | ✅ | - |
| `/erp/lookup` | - | 🔴 | ERPItemLookupPage — 필요 여부 결정 |
| - | CatalogV2Page(`/catalog-std`) | 🆕 은퇴 | cutover 후 items 일원화로 redundant |
| - | Cat2RegisterPage(`/request-std`) | 🆕 은퇴 | 동상 |
| - | DistributionRequestsPage | ✅ | v1엔 없는 v2 신규(유지) |

## 2. 상세 Dialog 미완 (v1 ItemDetailDialog 대비)
- 🔴 변형 등록 → `/request/new?parent_item_id=`
- 🔴 QR 인쇄 / 🔴 변경 이력(audit_logs)
- 🆕 **sub_type=속성1 표시** (v1 6-9 추가분 포팅)
- (폐기 버튼 = 제거 결정 완료)

## 3. 갭 분류 + 전환 작업

### A. ✅ read-only → CRUD (5페이지, admin 마스터) — **6-9 완료·배포·검증**
단위 / 제조사(+병합) / 속성 / 분류체계 / 분류-속성 매핑 전부 CRUD 활성화. `useMutation`+`rest()` 패턴, admin 게이트.
- **단위**: 추가/수정/삭제 (unit_type item/attribute/both)
- **제조사**: 추가/수정/삭제 + **병합**(source명별 items.maker·item_requests.maker UPDATE + source DELETE, in-list 함정 회피 개별 PATCH). code 생략 시 DB 자동생성(MK####)
- **속성**: 추가/수정/삭제 (v1은 목록이 mock였음 → v2가 더 완전), 단위 datalist
- **분류체계**: 대/중/소 추가·수정 + 현장용어 추가/수정/삭제/토글. **분류 삭제 미포함**(v1 UI도 없음). 코드검증 교정 `대^[A-Z]$/중^[A-Z0-9]{2}$/소^[A-Z0-9]{3}$`(실데이터 숫자포함 대응)
- **매핑**: 속성 추가/제거/순서(↑↓ swap)/include_in_name 토글 — **즉시 영속**(v1 delete-all+reinsert 대신 incremental)
- **검증**: admin JWT(RLS 경로) 전 쓰기 17/17 통과(병합 items UPDATE 포함) + 실 UI 추가 왕복 + admin 게이트 동작. 테스트 데이터 0 잔존
- ⚠️ **분류코드 수정은 기존 item_code prefix와 desync**(v1 동일 기존 위험) — admin 책임

### B. 🆕 cutover 후 정합 (포팅/은퇴)
- v2 catalog/상세/내보내기에 **sub_type=속성1 + N속성** 포팅(v1 6-9 코드 이식)
- **cat2 페이지(catalog-std/request-std) 은퇴** or items 일원화
- **품목명 관리(include-in-name) 은퇴** (Path B)

### C. 🔴 누락 페이지 (사용자 결정 후 구현/흡수/폐기)
- `/request/edit/:id` 편집 / `/item/list` / `/item/:id` 직접페이지 / `/erp/lookup`

### D. 컷오버 인프라 (서버/VPN)
- [ ] Vite `base:'/v2/'`→`'/'` + React Router basename 제거 + 재빌드
- [ ] **Supabase OAuth**: Site URL/Redirect URLs를 `https://mdm.sampyo.co.kr/`로 (root hostname이라 IP거부 회피됨)
- [ ] nginx root를 v2 dist로 교체 (**v1 dist 보존=롤백**) + `/v2/` location 정리
- [ ] 스모크 테스트(로그인/카탈로그/신청/승인/관리자 CRUD) / nginx config 가드(반복 소실 이력)

## 4. 권장 우선순위
1. ~~**B(정합)**~~ ✅ 완료 (6-9)
2. ~~**A(CRUD 활성)**~~ ✅ 완료 (6-9) — 단위→제조사→속성→분류체계→매핑 5페이지 배포·검증
3. **C 누락페이지 결정** ← **다음** (request/edit·item/list·item/:id·erp/lookup 살릴지/흡수/폐기)
4. **D 인프라** (base'/'·OAuth·nginx) — 마지막 컷오버

> **⚠️ nginx `/v2/` location 반복 소실**: 메인 `mdm.sampyo.co.kr` config의 `location ^~ /v2/` 블록이 또 사라짐(6-9). 복구 스크립트 `scripts/_add_mdm_v2_location.cjs` **재생성**(멱등 + nginx -t 검증 + 실패 시 백업 복원). 배포 후 `/v2/` 404 시 이 스크립트 실행.

## 5. 결정 필요 (사용자)
- C 4개 페이지: v2에서 살릴지/카탈로그 흡수/폐기
- A CRUD를 전환 전 열지 vs 전환 후 별도 (운영 위험 vs 패리티)
- cat2 페이지·품목명관리: 은퇴 확정?
- distribute 승인권한 정책(6-6 정책 B=admin+3차검토자 적용됨 — 유지 확인)
