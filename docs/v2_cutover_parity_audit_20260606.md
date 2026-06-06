# MDM v2 빅뱅 전환 — v1↔v2 기능 패리티 감사 / 전환 체크리스트

> 작성 2026-06-06. 목표: v2(`/v2/`)가 v1(mdm.sampyo.co.kr)을 완전 대체. nginx root 교체로 컷오버.
> 상태표기: ✅완료(실DB) · 🟡 read-only(쓰기 필요) · 🔴 미구현/누락 · ⏭️ v1에서 미사용(redirect/dead) · ❓ 확인필요

---

## 1. 페이지 패리티 (v1 라우트 기준)

| v1 라우트 | v1 페이지 | v2 대응 | v2 상태 | 전환 위해 필요한 작업 |
|---|---|---|---|---|
| `/auth` | AuthPage | LoginPage | ✅ | (컷오버 시 OAuth redirect 재설정) |
| `/` | Dashboard | DashboardPage | ✅ | - |
| `/admin/settings` | (Navigate→reviewers) | - | ⏭️ | 불필요(죽은 라우트) |
| `/admin/users` | UserManagement | UserManagementPage | ✅ CRUD | - |
| `/admin/erp` | ERPManagement | ERPAdminPage | ✅ CRUD | - |
| `/admin/organization` | OrganizationManagement | OrganizationPage | ✅ CRUD | - |
| `/admin/reviewers` | AdminReviewers | AdminReviewersPage | ✅ CRUD | - |
| `/admin/ai-review` | AdminAIReview | AdminAIReviewPage | ✅ | - |
| `/request/new` | ItemRequest | ItemRequestPage | ✅ | 변형등록(parent_item_id) 진입 확인 |
| `/request/edit/:id` | ItemRequest(편집) | - | 🔴 | **기존 신청 편집 모드** 라우트/로직 |
| `/requests` `/request/my` | RequestsPage | RequestsPage | ✅ | - |
| `/approval` `/approval/:id` | MDMApproval | ApprovalDetailPage | ✅ | 목록(`/approval`) 진입·첨부뷰어·검토팀카드 패리티 확인 |
| `/item/list` | ItemList | - | ❓🔴 | 별도 목록 필요 여부 확인(카탈로그로 흡수 가능?) |
| `/catalog` | ItemCatalog | CatalogPage | ✅ | - |
| `/catalog/upload` | ItemUpload(엑셀 일괄) | CatalogUploadPage | 🟡 비활성 | **엑셀 업로드 commit**(xlsx 의존성+변환+적재) |
| `/item/search` `/item/:id` | ItemDetail(페이지) | ItemDetailDialog(모달) | 🟡 | 직접 딥링크 `/item/:id` 페이지 필요 여부(현재 모달만) |
| `/classification/tree` | CategoryAttributeManagement | ClassificationTreePage | 🟡 read-only | **분류 CRUD**(대/중/소 + 현장용어) |
| `/classification/mapping` | CategoryAttributeManagement | ClassificationMappingPage | 🟡 read-only | **분류-속성 매핑 CRUD**(sort_order/include_in_name) |
| `/classification/include-in-name` | IncludeInNameReview(admin) | IncludeInNameReviewPage | 🟡 저장 비활성 | **저장 활성**(include_in_name + recalc) |
| `/attribute/list` | AttributeValueManagement | AttributeListPage | 🟡 read-only | **속성값 관리 CRUD** (v1은 값 관리, v2는 마스터 목록 — 범위 정합 확인) |
| `/unit` | UnitManagement | UnitListPage | 🟡 read-only | **단위 CRUD** |
| `/maker-model` | MakerManagement | MakerListPage | 🟡 read-only | **제조사 CRUD + 병합** |
| (ERP 조회) | ERPItemLookup | - | 🔴 | **ERP 품목조회** 페이지 (우선순위 확인) |
| AI 현황/품질 | AIDashboard/AIQuality | AIDashboardPage/AIQualityPage | ✅ | - |
| Q&A | QnaBoard/QnaDetail | QAListPage/QAThreadPage | ✅ | - |
| 매뉴얼 | (정적/MainLayout) | ManualPage | ✅ | - |
| - | - | DistributionRequestsPage | ✅ (v2 신규) | v1엔 없는 신규 기능 |

## 2. 품목 상세(Dialog) 미완 기능
- 🔴 변형 등록 버튼 → `/request/new?parent_item_id=` 라우팅
- 🔴 QR 인쇄
- 🔴 변경 이력(audit_logs 조회)
- (폐기 버튼은 제거 결정 완료 — 코드정제/법인해제로 대체)

## 3. 보안 / 정합
- 🔴 `distribute_item_to_company` **DB단 admin 강제** (현재 UI만 admin, anon EXECUTE) — 정책: admin만 / admin+3차검토자
- ❓ 표준명 **Path B**(표시·ERP = item_name) 적용 여부 — 트랙1(item_name 품질)과 타이밍 연동. 적용 시 "품목명 관리" 메뉴 은퇴 검토

## 4. 전환 인프라 (빅뱅 컷오버 — 전부 VPN/서버 필요)
- [ ] nginx: `/v2/` location 제거 + root를 `/var/www/sampyo-mdm-v2`로 교체 (또는 v1 root 디렉터리 교체)
- [ ] Vite `base: '/v2/'` → `'/'` 복원 + 재빌드
- [ ] React Router `basename` 제거
- [ ] **OAuth 재설정**: redirect_to/SITE_URL을 root hostname 기준으로 (현재 `/v2/` path 기반) — Supabase Auth 설정
- [ ] erp-sync·ERP 영향 없음(프론트 교체만) — 단 카탈로그 재분류는 별개 트랙
- [ ] 롤백 플랜: nginx config backup + v1 dist 보존 (즉시 원복 가능하게)
- [ ] 컷오버 후 스모크 테스트(로그인/카탈로그/신청/승인/관리자 CRUD)

## 5. 작업 가능 구분 (서버 다운 = 재택 VPN 불가)
### 🟢 지금 가능 (인터넷 + 로컬 + git)
- 1번 표의 🟡→CRUD 활성화 + 🔴 신규/미구현 페이지 **코드+빌드** (배포만 나중)
- 2번 상세 기능(변형/QR/이력) 코드
- 3번 distribute admin 마이그(Supabase 클라우드 적용 가능, 정책 확정 후)
- 4번 OAuth 설정안 **문서화** + Vite/basename 변경은 **코드 준비**(빌드는 base 토글 주의)
- 카탈로그 재분류 dry-run/검증(DB 읽기)

### 🔴 VPN/서버 필요
- 모든 배포, nginx root 교체, erp-sync/ERP, 실제 컷오버

## 6. 권장 우선순위 (오프라인 진행 순서)
1. **read-only → CRUD 활성화** 묶음: 단위 → 제조사(+병합) → 속성 → 분류체계 → 분류-속성 매핑 → 품목명 관리 저장 (위험 낮은 순, 코드+빌드)
2. **distribute 보안 갭** 마이그 (정책 확정 후 — Supabase 적용까지 지금 가능)
3. **상세 변형 등록** 라우팅 (간단) → QR/이력
4. **데이터 업로드(엑셀)** commit — xlsx 의존성 추가 필요(트랙1 충돌 주의)
5. **누락 페이지 판단**: ItemList / ERPItemLookup / `/item/:id` 직접페이지 / `/request/edit` — 실제 필요 여부 사용자 확정 후 구현
6. **전환 런북 + OAuth 설정안** 문서 (컷오버 당일 체크리스트)

## 7. 미확정 (사용자 결정 필요)
- ItemList(`/item/list`)·ERPItemLookup·`/item/:id` 직접페이지·`/request/edit` — v2에서 살릴지/흡수할지/버릴지
- distribute 승인권한 정책 (admin만 vs admin+3차검토자)
- 표준명 Path B 적용 시점 (트랙1 연동)
- 분류/속성 CRUD를 v2에서 열지(운영 위험 ↑) vs 전환 후 별도
