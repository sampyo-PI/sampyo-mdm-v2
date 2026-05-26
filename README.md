# Sampyo MDM v2

삼표 품목마스터데이터관리시스템 차세대 React 앱 — **Sampyo Design System v0.1 첫 적용 대상**.

## 배경

- 기존 MDM (`mdm.sampyo.co.kr`, React 18 + shadcn) 운영 중
- SDS 표준 준수를 위해 **별도 React 앱으로 재구축** → 100% 완성 후 빅뱅 전환
- 백엔드(Supabase) 공유 — 데이터 마이그레이션 0

## 기술 스택

| 항목 | 채택 | 근거 |
|---|---|---|
| React | 19 + TypeScript | 최신, Actions/use 활용 |
| 빌드 | Vite 8 | 기존 MDM 호환 |
| UI | SDS `sds.css` + Tailwind 3 | SDS CLAUDE.md §2 임의 색 금지 |
| Headless | @headlessui/react | Tailwind 공식, 가벼움 |
| 표 | AG-Grid Community v35 (Quartz) | SDS 강제 표 라이브러리 |
| 폰트 | Pretendard (CDN dynamic-subset) | SDS 강제 폰트 |
| 백엔드 | Supabase (기존 프로젝트 공유) | 데이터 마이그 0 |
| 상태 | @tanstack/react-query | 기존 MDM 동일 |
| 라우팅 | react-router-dom v7 | 최신 |

## 디렉토리

```
src/
├── App.tsx
├── main.tsx
├── index.css                # Pretendard + AG-Grid + sds.css + Tailwind
├── styles/
│   ├── sds.css              # SDS v0.1 원본 (재정의 금지)
│   └── sds.js               # 참고용 (React로 재구현)
├── components/
│   └── layout/              # Header / Sidebar / AppShell / FsToggle
└── lib/
    └── cn.ts                # clsx + tailwind-merge
```

## 개발

```bash
bun install
bun dev        # http://localhost:5173
bun run build  # dist/
```

## 배포 (예정)

- 사내 서버: `10.50.20.51:8444` (HTTP, 사내망)
- 전환 시점: 100% 완성 후 nginx root 교체 → `mdm.sampyo.co.kr` 그대로

## 참조

- SDS 저장소: `~/projects/sampyo-design-system/` (사내 Gitea)
- SDS 진리: `design.md` + `templates/page_template.html`
- 기존 MDM: `~/Project/Sampyo_MDM/` (운영 중, 무수정)
