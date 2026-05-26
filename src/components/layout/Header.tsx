import { NavLink } from "react-router-dom";
import { FsToggle } from "./FsToggle";

export type GnbItem = { label: string; path: string };
export type HeaderUser = { initial: string; name: string; deptRole?: string };

export type HeaderProps = {
  brandCode: string;
  systemName: string;
  subtitle?: string;
  gnb: GnbItem[];
  searchPlaceholder?: string;
  qaPath: string;
  manualPath: string;
  user: HeaderUser;
  onToggleSidebar: () => void;
};

/**
 * SDS 글로벌 헤더. CLAUDE.md §2 강제: 햄버거/브랜드/GNB/spacer/search/fs-toggle/Q&A/매뉴얼/user 순서 불변.
 */
export function Header(props: HeaderProps) {
  return (
    <header className="global">
      <button
        type="button"
        className="hamburger"
        title="사이드바"
        onClick={props.onToggleSidebar}
        aria-label="사이드바 토글"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      <div className="brand">
        <span className="logo-mark">{props.brandCode}</span>
        <span>{props.systemName}</span>
        {props.subtitle && <span className="subtitle">{props.subtitle}</span>}
      </div>

      <nav className="gnb">
        {props.gnb.map((item, i) => (
          <NavLink
            key={`${item.path}-${i}`}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="spacer" />

      {props.searchPlaceholder && (
        <input type="search" className="search" placeholder={props.searchPlaceholder} />
      )}

      <FsToggle />

      <NavLink to={props.qaPath} className="help-btn" title="질문·답변">
        <span className="ico">❓</span> Q&amp;A
      </NavLink>
      <NavLink to={props.manualPath} className="help-btn" title="사용자 매뉴얼">
        <span className="ico">📖</span> 매뉴얼
      </NavLink>

      <div className="user">
        <span className="avatar">{props.user.initial}</span>
        <span>
          {props.user.name}
          {props.user.deptRole ? ` · ${props.user.deptRole}` : ""}
        </span>
      </div>
    </header>
  );
}
