import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  callAnalyzeItem,
  fetchMasters,
  createMaker,
  saveDraft,
  fetchMyDrafts,
  uploadAttachmentFiles,
  submitRequest,
  type AIAnalysisResult,
} from "../lib/itemRequestQueries";
import { OptionCombobox, type OptionItem } from "../components/common/OptionCombobox";
import { useAuth } from "../contexts/AuthContext";

const MAX_IMAGE_MB = 10;
const MAX_DOC_MB = 20;

type FormState = {
  itemName: string;
  makerId: string | null;
  makerName: string;
  model: string;
  companyId: string | null;
  siteId: string | null;
  equipmentName: string;
  unit: string;
  spec: string;
  notes: string;
};

const INIT: FormState = {
  itemName: "",
  makerId: null,
  makerName: "",
  model: "",
  companyId: null,
  siteId: null,
  equipmentName: "",
  unit: "",
  spec: "",
  notes: "",
};

export function ItemRequestPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>(); // /request/edit/:id 편집 모드
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const [form, setForm] = useState<FormState>(INIT);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [editLoaded, setEditLoaded] = useState(false); // 편집 대상 로드 1회 가드
  const [editRequestNumber, setEditRequestNumber] = useState<string | null>(null);
  const [ai, setAi] = useState<AIAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [attrStars, setAttrStars] = useState<Set<string>>(new Set());
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  // 낙관적 잠금 — saveDraft 후 받은 version (간단히 1부터 시작, 실제 DB version은 UPDATE 시 갱신)
  const [draftVersion, setDraftVersion] = useState(1);

  // 첨부파일 — 신규 선택 + DRAFT 이어쓰기 시 기존 path 분리
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newDocs, setNewDocs] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingDocs, setExistingDocs] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => {
      if (f.size > MAX_IMAGE_MB * 1024 * 1024) { alert(`${f.name}: ${MAX_IMAGE_MB}MB 초과`); return false; }
      return true;
    });
    setNewImages((prev) => [...prev, ...valid]);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => {
      if (f.size > MAX_DOC_MB * 1024 * 1024) { alert(`${f.name}: ${MAX_DOC_MB}MB 초과`); return false; }
      return true;
    });
    setNewDocs((prev) => [...prev, ...valid]);
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const removeNewImage = (i: number) => setNewImages((p) => p.filter((_, idx) => idx !== i));
  const removeNewDoc = (i: number) => setNewDocs((p) => p.filter((_, idx) => idx !== i));
  const removeExistingImage = (path: string) => setExistingImages((p) => p.filter((x) => x !== path));
  const removeExistingDoc = (path: string) => setExistingDocs((p) => p.filter((x) => x !== path));

  // 본인 법인 자동 default (profile.company_id 있을 때)
  // useState 초기값으로는 안 되니 useEffect 대용 useMemo 분기 — 이미 사용자 변경 시 prev 우선

  const mastersQuery = useQuery({
    queryKey: ["item-request-masters"],
    queryFn: fetchMasters,
    staleTime: 5 * 60_000,
  });

  const sitesFiltered = useMemo(() => {
    if (!form.companyId || !mastersQuery.data) return [];
    return mastersQuery.data.sites.filter((s) => s.company_id === form.companyId);
  }, [form.companyId, mastersQuery.data]);

  // OptionCombobox 옵션 변환
  const companyOptions = useMemo<OptionItem[]>(
    () => (mastersQuery.data?.companies ?? []).map((c) => ({ value: c.id, label: c.code, sub: c.name })),
    [mastersQuery.data],
  );
  const siteOptions = useMemo<OptionItem[]>(
    () => sitesFiltered.map((s) => ({ value: s.id, label: `[${s.code}] ${s.name}` })),
    [sitesFiltered],
  );
  const makerOptions = useMemo<OptionItem[]>(
    () => (mastersQuery.data?.makers ?? []).map((m) => ({ value: m.id, label: m.name })),
    [mastersQuery.data],
  );

  // 본인 DRAFT 5건 — 진입 시 상단 카드로 노출 (편집 모드에선 숨김)
  const draftsQuery = useQuery({
    queryKey: ["my-drafts", user?.id],
    queryFn: () => fetchMyDrafts(user!.id),
    enabled: !!user && !draftId && !editId,
    staleTime: 10_000,
  });

  // 편집 모드 (/request/edit/:id) — 기존 신청 로드 → 폼 채움 (v1 동등 가드: 본인 + APPROVED/REJECTED 불가 + version 낙관적 잠금)
  useEffect(() => {
    if (!editId || editLoaded || !user || !mastersQuery.data) return;
    let cancelled = false;
    (async () => {
      const { rest } = await import("../lib/supabase");
      type Row = {
        id: string; request_number: string; status: string; requester_id: string; version: number | null;
        item_name: string; maker: string | null; model: string | null;
        company_id: string | null; site_id: string | null; equipment_name: string | null;
        unit: string | null; spec: string | null; notes: string | null;
        image_urls: string[] | null; document_urls: string[] | null;
      };
      let arr: Row[];
      try {
        arr = await rest<Row[]>("GET", "item_requests", {
          params: {
            id: `eq.${editId}`, limit: "1",
            select: "id,request_number,status,requester_id,version,item_name,maker,model,company_id,site_id,equipment_name,unit,spec,notes,image_urls,document_urls",
          },
        });
      } catch (e) { alert("요청 조회 실패: " + (e as Error).message); navigate("/requests"); return; }
      if (cancelled) return;
      const r = arr?.[0];
      if (!r) { alert("수정할 요청을 찾을 수 없습니다."); navigate("/requests"); return; }
      if (r.status === "APPROVED" || r.status === "REJECTED") { alert("승인 또는 반려된 요청은 수정할 수 없습니다."); navigate("/requests"); return; }
      if (r.requester_id !== user.id) { alert("본인이 신청한 요청만 수정할 수 있습니다."); navigate("/requests"); return; }
      setExistingImages(Array.isArray(r.image_urls) ? r.image_urls : []);
      setExistingDocs(Array.isArray(r.document_urls) ? r.document_urls : []);
      setNewImages([]); setNewDocs([]);
      const m = mastersQuery.data!.makers.find((x) => x.name === r.maker);
      setDraftId(r.id);
      setDraftVersion(r.version ?? 1);
      setEditRequestNumber(r.request_number);
      setForm({
        itemName: r.item_name, makerId: m?.id ?? null, makerName: r.maker ?? "",
        model: r.model ?? "", companyId: r.company_id, siteId: r.site_id,
        equipmentName: r.equipment_name ?? "", unit: r.unit ?? "", spec: r.spec ?? "", notes: r.notes ?? "",
      });
      setAi(null);
      setEditLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [editId, editLoaded, user, mastersQuery.data, navigate]);

  // 본인 법인 자동 default (편집 모드 제외 — 로드값 우선)
  if (profile?.company_id && !form.companyId && !draftId && !editId) {
    // 첫 진입 시에만 한 번 (controlled state 변경 충돌 회피 위해 effect 대신 ref 대신 set 한 번)
    setForm((prev) => prev.companyId ? prev : { ...prev, companyId: profile.company_id });
  }

  const handleDraftSave = async () => {
    if (!user) { alert("로그인이 필요합니다"); return; }
    if (!form.itemName.trim()) { alert("품목명을 입력하세요"); return; }
    setDraftSaving(true);
    setDraftMsg(null);
    try {
      // 1. 신규 첨부파일 Storage 업로드
      let newImgPaths: string[] = [];
      let newDocPaths: string[] = [];
      if (newImages.length > 0 || newDocs.length > 0) {
        const up = await uploadAttachmentFiles(user.id, newImages, newDocs);
        newImgPaths = up.imageUrls;
        newDocPaths = up.documentUrls;
      }
      // 2. 기존 + 신규 path 병합
      const allImagePaths = [...existingImages, ...newImgPaths];
      const allDocPaths = [...existingDocs, ...newDocPaths];

      const result = await saveDraft({
        requesterId: user.id,
        itemName: form.itemName,
        maker: form.makerName || null,
        model: form.model || null,
        companyId: form.companyId,
        siteId: form.siteId,
        equipmentName: form.equipmentName || null,
        unit: form.unit || null,
        spec: form.spec || null,
        notes: form.notes || null,
        imageUrls: allImagePaths,
        documentUrls: allDocPaths,
      }, draftId);
      setDraftId(result.id);
      // 신규 파일은 이제 existing으로 이동, newImages 초기화
      setExistingImages(allImagePaths);
      setExistingDocs(allDocPaths);
      setNewImages([]);
      setNewDocs([]);
      setDraftMsg(`임시저장 완료: ${result.request_number}`);
      await queryClient.invalidateQueries({ queryKey: ["my-drafts", user.id] });
      setTimeout(() => setDraftMsg(null), 5000);
    } catch (e) {
      setDraftMsg(`저장 실패: ${(e as Error).message}`);
    } finally {
      setDraftSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!ai) { alert("AI 분석 결과가 필요합니다"); return; }
    const cat = ai.categories[selectedCategory];
    if (!cat) { alert("분류를 선택하세요"); return; }
    setSubmitting(true); setSubmitErr(null); setSubmitMsg(null);
    try {
      // draftId 없으면 자동 임시저장 → 신규 draftId 확보
      let currentDraftId = draftId;
      if (!currentDraftId) {
        if (!user) throw new Error("로그인이 필요합니다");
        if (!form.itemName.trim()) throw new Error("품목명을 입력하세요");
        let newImgPaths: string[] = [];
        let newDocPaths: string[] = [];
        if (newImages.length > 0 || newDocs.length > 0) {
          const up = await uploadAttachmentFiles(user.id, newImages, newDocs);
          newImgPaths = up.imageUrls; newDocPaths = up.documentUrls;
        }
        const allImagePaths = [...existingImages, ...newImgPaths];
        const allDocPaths = [...existingDocs, ...newDocPaths];
        const dr = await saveDraft({
          requesterId: user.id, itemName: form.itemName,
          maker: form.makerName || null, model: form.model || null,
          companyId: form.companyId, siteId: form.siteId,
          equipmentName: form.equipmentName || null, unit: form.unit || null,
          spec: form.spec || null, notes: form.notes || null,
          imageUrls: allImagePaths, documentUrls: allDocPaths,
        }, null);
        currentDraftId = dr.id;
        setDraftId(dr.id);
        setExistingImages(allImagePaths); setExistingDocs(allDocPaths);
        setNewImages([]); setNewDocs([]);
      }

      // 소분류 ID 조회
      const { rest } = await import("../lib/supabase");
      const arr = await rest<Array<{ id: string }>>("GET", "category_small", {
        params: { name: `eq.${cat.small}`, select: "id", limit: "1" },
      });
      const smallCategoryId = arr[0]?.id ?? null;

      const result = await submitRequest({
        draftId: currentDraftId,
        version: draftVersion,
        smallCategoryId,
        smallCategoryName: cat.small,
        largeCategory: cat.large,
        mediumCategory: cat.medium,
        maker: form.makerName || null,
        model: form.model || null,
        spec: form.spec || null,
        equipmentName: form.equipmentName || null,
        attributes: ai.attributes.map((a) => ({ name: a.name, value: a.value })),
      });

      if (!result.ok) {
        setSubmitErr(result.message);
        return;
      }
      setSubmitMsg(`✅ 제출 완료: ${result.requestNumber} → 1차 AI 검토 자동 진행 (v2 격리 데이터)`);
      setDraftVersion(draftVersion + 1);
      // 폼 초기화 — 다음 신청 가능
      setTimeout(() => {
        if (confirm("제출 완료. 요청목록으로 이동하시겠습니까?")) navigate("/requests");
      }, 1500);
    } catch (e) {
      setSubmitErr(`제출 중 예외: ${(e as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResumeDraft = async (id: string) => {
    // 선택된 DRAFT의 모든 필드 fetch (rest 헬퍼)
    const { rest } = await import("../lib/supabase");
    type Row = {
      id: string; item_name: string; maker: string | null; model: string | null;
      company_id: string | null; site_id: string | null; equipment_name: string | null;
      unit: string | null; spec: string | null; notes: string | null;
      image_urls: string[] | null; document_urls: string[] | null;
    };
    let r: Row;
    try {
      const arr = await rest<Row[]>("GET", "item_requests", {
        params: { id: `eq.${id}`, select: "id,item_name,maker,model,company_id,site_id,equipment_name,unit,spec,notes,image_urls,document_urls" },
      });
      if (!arr || arr.length === 0) { alert("불러오기 실패"); return; }
      r = arr[0];
    } catch (e) { alert("불러오기 실패: " + (e as Error).message); return; }
    setExistingImages(Array.isArray(r.image_urls) ? r.image_urls : []);
    setExistingDocs(Array.isArray(r.document_urls) ? r.document_urls : []);
    setNewImages([]);
    setNewDocs([]);
    // makerId는 maker name으로 역추적
    const m = mastersQuery.data?.makers.find((x) => x.name === r.maker);
    setDraftId(r.id);
    setForm({
      itemName: r.item_name,
      makerId: m?.id ?? null,
      makerName: r.maker ?? "",
      model: r.model ?? "",
      companyId: r.company_id,
      siteId: r.site_id,
      equipmentName: r.equipment_name ?? "",
      unit: r.unit ?? "",
      spec: r.spec ?? "",
      notes: r.notes ?? "",
    });
    setAi(null);
  };

  const handleCreateMaker = async (newName: string) => {
    try {
      const m = await createMaker(newName);
      await queryClient.invalidateQueries({ queryKey: ["item-request-masters"] });
      update({ makerId: m.id, makerName: m.name, model: "" });
    } catch (e) {
      alert("제조사 등록 실패: " + (e as Error).message);
    }
  };

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleAI = async () => {
    if (!form.itemName.trim()) {
      alert("품목명을 먼저 입력하세요");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAi(null);
    setSelectedCategory(0);
    try {
      const result = await callAnalyzeItem({
        itemName: form.itemName,
        maker: form.makerName || "",
        model: form.model || "",
        spec: form.spec || "",
      });
      setAi(result);
      // 첫 카테고리 자동 선택, 첫 2개 속성 ★ 자동
      const stars = new Set<string>();
      (result.attributes ?? []).slice(0, 2).forEach((a) => stars.add(a.name));
      setAttrStars(stars);
      setTimeout(() => {
        document.getElementById("ai-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleStar = (name: string) => {
    setAttrStars((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const masters = mastersQuery.data;

  return (
    <section className="page-card">
      <div className="page-h">
        <div>
          <h1>
            품목마스터 ▸ {editId ? "신청 수정" : "품목등록"}
            <span className="text-xs text-gray-500 font-normal ml-2">/ {editId ? "request/edit" : "request"}</span>
          </h1>
          <div className="meta">
            {editId ? (
              <>기존 신청 <span style={{ fontFamily: "ui-monospace, monospace", color: "#003876", fontWeight: 600 }}>{editRequestNumber ?? "…"}</span> 수정 · 저장 시 임시저장(DRAFT) 갱신, 제출 시 1차 검토 재진행</>
            ) : (
              <>신규 품목코드 신청 · AI 분석으로 분류·속성·표준명 자동 추출 · 필수 항목 <span style={{ color: "#dc2626" }}>*</span></>
            )}
          </div>
        </div>
      </div>

      {/* DRAFT 5건 카드 — 신규 진입 + DRAFT 있을 때만 노출 */}
      {!draftId && (draftsQuery.data ?? []).length > 0 && (
        <div style={{
          border: "1px solid #fbbf24", background: "#fffbeb",
          borderRadius: 8, padding: "12px 16px", marginBottom: 16,
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <div style={{ fontSize: 20 }}>📝</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "#92400e", fontSize: 14 }}>
              작성 중이던 신청 {(draftsQuery.data ?? []).length}건이 있습니다
            </div>
            <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>
              완료하지 못한 임시저장 — 클릭하여 이어쓰기
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {(draftsQuery.data ?? []).map((d) => (
                <span
                  key={d.id}
                  onClick={() => handleResumeDraft(d.id)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: "#fff", border: "1px solid #fcd34d", borderRadius: 999,
                    padding: "3px 10px", fontSize: 12, color: "#92400e", cursor: "pointer",
                  }}
                >
                  <span style={{ fontFamily: "ui-monospace, monospace", color: "#b45309", fontWeight: 600 }}>
                    {d.request_number}
                  </span>
                  <span>{d.item_name || "(품목명 미입력)"}</span>
                  <span style={{ color: "#d97706", fontSize: 11 }}>
                    · {new Date(d.updated_at).toLocaleDateString("ko-KR")}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 임시저장 메시지 (3초 자동 사라짐) */}
      {draftMsg && (
        <div style={{
          padding: "10px 14px", marginBottom: 16,
          background: draftMsg.includes("실패") ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${draftMsg.includes("실패") ? "#fca5a5" : "#86efac"}`,
          borderRadius: 6,
          color: draftMsg.includes("실패") ? "#991b1b" : "#166534",
          fontSize: 13,
        }}>
          {draftMsg}
        </div>
      )}

      {/* TODO Phase 2 (3단계): AI 보완요청 카드 */}

      {/* 메인 폼: form-group 래퍼 + 6 field-cards + 첨부 */}
      <div className="form-group" style={{ padding: "16px 20px" }}>

        <div className="fg-title-row">
          <span className="title-text">품목 정보 입력</span>
          <button
            className="btn-search"
            disabled
            title="Phase 2 — 기존 품목 검색 다이얼로그 연결 예정"
          >
            🔍 기존 품목 검색
          </button>
        </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* 1) 품목명 + 단위 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="field-card">
            <div className="field-lbl">품목명 (원문)<span className="req">*</span></div>
            <input
              type="text"
              placeholder="예: 베어링, 기어드모터, 원심펌프 등"
              value={form.itemName}
              onChange={(e) => update({ itemName: e.target.value })}
            />
          </div>
          <div className="field-card">
            <div className="field-lbl">단위<span className="req">*</span></div>
            <select
              value={form.unit}
              onChange={(e) => update({ unit: e.target.value })}
              className="combo-trigger"
              style={{ width: "100%", appearance: "auto" }}
            >
              <option value="">단위 선택</option>
              {(masters?.units ?? []).map((u) => (
                <option key={u.id} value={u.code}>
                  {u.code} – {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2) 제조사/모델 + 조직/설비 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="field-card">
            <div className="sub-h">
              <span className="t">제조사/모델 정보</span>
              <span className="badge-sel">선택</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="sub-lbl">제조사 (Maker)</div>
                <OptionCombobox
                  value={form.makerId}
                  onChange={(id) => {
                    const m = mastersQuery.data?.makers.find((x) => x.id === id);
                    update({ makerId: id, makerName: m?.name ?? "", model: "" });
                  }}
                  options={makerOptions}
                  placeholder="제조사 검색"
                  onCreate={handleCreateMaker}
                />
              </div>
              <div>
                <div className="sub-lbl">모델명</div>
                <input
                  type="text"
                  placeholder="모델명 입력"
                  className="font-mono"
                  value={form.model}
                  onChange={(e) => update({ model: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="field-card">
            <div className="sub-h">
              <span className="t">조직/설비정보</span>
              <span className="badge-sel">사업장/설비 선택</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div className="sub-lbl">법인<span className="req">*</span></div>
                <OptionCombobox
                  value={form.companyId}
                  onChange={(id) => update({ companyId: id, siteId: null })}
                  options={companyOptions}
                  placeholder="법인 검색"
                />
              </div>
              <div>
                <div className="sub-lbl">사업장</div>
                <OptionCombobox
                  value={form.siteId}
                  onChange={(id) => update({ siteId: id })}
                  options={siteOptions}
                  placeholder={form.companyId ? "사업장 검색" : "법인 먼저 선택"}
                  disabled={!form.companyId}
                />
              </div>
              <div>
                <div className="sub-lbl">적용설비</div>
                <input
                  type="text"
                  placeholder="설비"
                  value={form.equipmentName}
                  onChange={(e) => update({ equipmentName: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3) 규격설명 + 참고설명 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="field-card">
            <div className="field-lbl">규격설명<span className="req">*</span></div>
            <textarea
              rows={3}
              placeholder="예: 용량 100L/min, 양정 50m, 전압 380V, 재질 SUS304"
              value={form.spec}
              onChange={(e) => update({ spec: e.target.value })}
            />
          </div>
          <div className="field-card">
            <div className="field-lbl">참고설명</div>
            <textarea
              rows={3}
              placeholder="추가 참고사항을 입력하세요..."
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
            <div className="hint" style={{ marginTop: 4 }}>선택 입력 · 검토자에게 전달할 메모</div>
          </div>
        </div>

      </div>

      {/* 4) 첨부파일 (이미지 + PDF) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
        {/* 이미지 */}
        <div className="field-block">
          <div className="field-lbl">품목 이미지</div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            style={{ display: "none" }}
          />
          {(existingImages.length > 0 || newImages.length > 0) && (
            <div className="img-grid" style={{ marginBottom: 4 }}>
              {existingImages.map((path) => {
                const filename = path.split("/").pop()?.replace(/^\d+_/, "") ?? path;
                return (
                  <div key={"e-" + path} className="img-thumb">
                    🖼️
                    <div className="filename">{filename}</div>
                    <button
                      onClick={() => removeExistingImage(path)}
                      style={{ position: "absolute", top: 4, right: 4, background: "rgba(220,38,38,0.85)", color: "#fff", border: "none", borderRadius: 4, width: 22, height: 22, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                      title="삭제"
                    >×</button>
                  </div>
                );
              })}
              {newImages.map((f, i) => (
                <div key={"n-" + i} className="img-thumb">
                  <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div className="filename">{f.name}</div>
                  <button
                    onClick={() => removeNewImage(i)}
                    style={{ position: "absolute", top: 4, right: 4, background: "rgba(220,38,38,0.85)", color: "#fff", border: "none", borderRadius: 4, width: 22, height: 22, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                    title="삭제"
                  >×</button>
                </div>
              ))}
            </div>
          )}
          <button
            className="btn-sec"
            style={{ width: "100%", marginTop: 4, fontSize: 12 }}
            onClick={() => imageInputRef.current?.click()}
          >
            🖼️ 이미지 추가
          </button>
          <div className="hint" style={{ marginTop: 6 }}>품목 외관 · 명판 · 규격표 등 (JPG/PNG/GIF · 최대 {MAX_IMAGE_MB}MB)</div>
        </div>

        {/* 문서 */}
        <div className="field-block">
          <div className="field-lbl">관련 문서 (PDF)</div>
          <input
            ref={docInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleDocSelect}
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {existingDocs.map((path) => {
              const filename = path.split("/").pop()?.replace(/^\d+_/, "") ?? path;
              return (
                <div key={"e-" + path} className="doc-row">
                  <div className="ic-doc">PDF</div>
                  <div className="info">
                    <div className="name">{filename}</div>
                    <div className="size">기존 첨부</div>
                  </div>
                  <div className="acts">
                    <button className="ibtn del" title="삭제" onClick={() => removeExistingDoc(path)}>×</button>
                  </div>
                </div>
              );
            })}
            {newDocs.map((f, i) => (
              <div key={"n-" + i} className="doc-row">
                <div className="ic-doc">PDF</div>
                <div className="info">
                  <div className="name">{f.name}</div>
                  <div className="size">{(f.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <div className="acts">
                  <button className="ibtn del" title="삭제" onClick={() => removeNewDoc(i)}>×</button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="btn-sec"
            style={{ width: "100%", marginTop: 4, fontSize: 12 }}
            onClick={() => docInputRef.current?.click()}
          >
            📎 문서 추가
          </button>
          <div className="hint" style={{ marginTop: 6 }}>카탈로그 · 기술사양서 · 도면 등 (PDF · 최대 {MAX_DOC_MB}MB)</div>
        </div>
      </div>

      </div>{/* /form-group */}

      {/* AI 결과 패널 (조건부) */}
      {ai && (
        <div className="ai-panel" id="ai-panel">
          <div className="ai-h">
            <div className="ai-icon">✨</div>
            <div style={{ flex: 1 }}>
              <div className="ai-title">AI 추천 결과</div>
              <div className="ai-sub">입력하신 품목명을 분석하여 분류와 속성을 추천합니다 · Gemini 2.0 Flash</div>
              {ai.normalizedName && (
                <div className="ai-normname">
                  표준화된 품목명: <span className="bold">{ai.normalizedName}</span>
                </div>
              )}
            </div>
          </div>

          {/* 분류 추천 카드 */}
          {ai.categories.length > 0 && (
            <div>
              <div className="ai-section-title">▸ 분류 추천</div>
              <div className="cat-grid">
                {ai.categories.map((c, i) => (
                  <div
                    key={i}
                    className={`cat-card${selectedCategory === i ? " selected" : ""}`}
                    onClick={() => setSelectedCategory(i)}
                  >
                    <div className="cat-h">
                      <span className={`cat-badge ${i === 0 ? "primary" : "secondary"}`}>
                        {i === 0 ? "추천" : `옵션 ${i + 1}`}
                      </span>
                      {selectedCategory === i && <span className="cat-check">✓</span>}
                    </div>
                    <div className="cat-path">{c.large} ▸ {c.medium} ▸ {c.small}</div>
                    {(() => {
                      const pct = Math.round(c.confidence > 1 ? c.confidence : c.confidence * 100);
                      return (
                        <>
                          <div className="conf-bar"><div className="fill" style={{ width: `${pct}%` }}></div></div>
                          <div className="conf-text"><span>신뢰도</span><span className="pct">{pct}%</span></div>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 중복 위험 */}
          {ai.duplicateRisk.score > 30 && (
            <div className="dup-warn">
              <div className="h">⚠️ 중복 위험도: {ai.duplicateRisk.score}%</div>
              <p>{ai.duplicateRisk.reason || "유사한 품목이 기존 카탈로그에 존재합니다."}</p>
            </div>
          )}

          {/* 유사 품목 */}
          {ai.suggestedItems.length > 0 && (
            <div>
              <div className="ai-section-title">▸ 유사 품목 발견 — 기존 품목 확인 권장</div>
              {ai.suggestedItems.slice(0, 5).map((s, i) => (
                <div key={i} className="similar-card">
                  <div className="sim-pct">{s.similarity}%</div>
                  <div className="info">
                    <div className="sim-code">{s.code}</div>
                    <div className="sim-name">{s.name}</div>
                    <div className="sim-reason">{s.reason}</div>
                  </div>
                  <div className="acts">
                    <button className="btn-sec" style={{ fontSize: 12 }} disabled>📋 상세보기</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 속성 5슬롯 */}
          {ai.attributes.length > 0 && (
            <div>
              <div className="ai-section-title">
                ▸ 속성 입력 ({ai.attributes.length})
                <span className="text-xs text-gray-500 font-normal ml-2" style={{ borderBottom: 0 }}>
                  ★ = 표준명 포함
                </span>
              </div>
              {ai.attributes.map((a, i) => {
                const starred = attrStars.has(a.name);
                return (
                  <div key={i} className="ai-attr-row">
                    <div className="idx">{i + 1}</div>
                    <div className="name">
                      {a.name}
                      {starred && <span className="star">★</span>}
                    </div>
                    <div>
                      <input
                        type="text"
                        defaultValue={a.value}
                        placeholder={a.unit ? `(${a.unit})` : ""}
                      />
                    </div>
                    <button
                      className={`star-toggle${starred ? " on" : ""}`}
                      onClick={() => toggleStar(a.name)}
                      title="표준명 포함"
                    >
                      ★
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 제출 결과 메시지 */}
          {submitMsg && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, color: "#166534", fontSize: 13 }}>
              {submitMsg}
            </div>
          )}
          {submitErr && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, color: "#991b1b", fontSize: 13 }}>
              ⚠ {submitErr}
            </div>
          )}

          {/* AI 액션 */}
          <div className="ai-actions">
            <button className="btn-sec" onClick={handleAI} disabled={aiLoading || submitting}>🔄 다시 분석</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-sec"
                onClick={handleDraftSave}
                disabled={draftSaving || submitting || !form.itemName.trim()}
              >
                {draftSaving ? "저장 중…" : "💾 임시저장"}
              </button>
              <button
                className="btn-pri"
                onClick={handleSubmit}
                disabled={submitting || !ai}
                title={!ai ? "AI 분석 먼저 실행" : "검토 요청 → PENDING_AI_REVIEW (is_v2_test 격리)"}
              >
                {submitting ? "제출 중…" : "📤 검토 요청 → 제출"}
              </button>
            </div>
          </div>
        </div>
      )}

      {aiError && (
        <div style={{
          marginTop: 16, padding: 12, background: "#fef2f2",
          border: "1px solid #fca5a5", borderRadius: 6,
          color: "#991b1b", fontSize: 13,
        }}>
          ⚠ AI 분석 오류: {aiError}
        </div>
      )}

      {/* 하단 액션 — AI 결과 없을 때만 표시 */}
      {!ai && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn-ghost" onClick={() => navigate(-1)}>취소</button>
          <button
            className="btn-sec"
            onClick={handleDraftSave}
            disabled={draftSaving || !form.itemName.trim()}
            title={draftId ? "임시저장 (기존 갱신)" : "임시저장 (신규)"}
          >
            {draftSaving ? "저장 중…" : (draftId ? "💾 임시저장 (갱신)" : "💾 임시저장")}
          </button>
          <button className="btn-sec" disabled title="Phase 2 — 분류 직접 선택 다이얼로그 연결 예정">🗂 분류 직접 선택</button>
          <button
            className="btn-ai"
            onClick={handleAI}
            disabled={aiLoading || !form.itemName.trim()}
          >
            {aiLoading ? (
              <>
                <span className="spinner" style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}></span>
                <span>AI 분석 중…</span>
              </>
            ) : (
              <>
                <span>🤖</span>
                <span>AI 분석</span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
