import { useAppStore } from "../store/useAppStore";
import logo from "../logo/image 2.svg";
import { Tooltip } from "@mui/material";

const NAV_TREE = [
  {
    section: "Main",
    items: [
      { key: "dashboard", label: "Dashboard", routeKey: "dashboard", icon: "dashboard" },
    ],
  },
  {
    section: "Planning",
    items: [
      { key: "planningHub", label: "Planning Hub", routeKey: "planningHub", icon: "hub" },
    ],
  },
  {
    section: "Services",
    items: [
      { key: "serviceCatalogue", label: "Service Catalogue", routeKey: "serviceCatalogue", icon: "catalogue" },
      { key: "serviceModes", label: "Service Modes", routeKey: "serviceModes", icon: "layers" },
    ],
  },
  {
    section: "Configuration",
    items: [
      { key: "kpiStandards", label: "KPI Standards", routeKey: "kpiStandards", icon: "target" },
      { key: "slaConfiguration", label: "SLA Configuration", routeKey: "slaConfiguration", icon: "sliders" },
      { key: "holidayCalendar", label: "Holiday Calendar", routeKey: "holidayCalendar", icon: "calendar" },
      { key: "evaluationPeriods", label: "Evaluation Periods", routeKey: "evaluationPeriods", icon: "clock" },
    ],
  },
  {
    section: "OPCR",
    items: [
      { key: "opcrTracker", label: "Campus OPCR Tracker", routeKey: "opcrTracker", icon: "clipboardCheck" },
      { key: "opcrCommitments", label: "OPCR Commitments", routeKey: "opcrCommitments", icon: "file" },
    ],
  },
];

const ICONS = {
  hub: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="5" r="2" />
      <circle cx="19" cy="19" r="2" />
      <circle cx="5" cy="19" r="2" />
      <line x1="9.9" y1="9.9" x2="6.4" y2="6.4" />
      <line x1="14.1" y1="9.9" x2="17.6" y2="6.4" />
      <line x1="9.9" y1="14.1" x2="6.4" y2="17.6" />
      <line x1="14.1" y1="14.1" x2="17.6" y2="17.6" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  catalogue: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="10" x2="8" y2="20" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  sliders: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M19.07 4.93l-1.42 1.42M6.34 17.66l-1.42 1.42M19.07 19.07l-1.42-1.42M6.34 6.34L4.92 4.92" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  layers: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  file: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="13" y2="18" />
    </svg>
  ),
  clipboardCheck: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <polyline points="9 14 11 16 15 11" />
    </svg>
  ),
};

export default function Sidebar({ active, setActive, isOpen, onClose }) {
  const { sidebarCollapsed, permissions } = useAppStore();

  // Derive visible nav tree based on permissions
  const visibleNavTree = NAV_TREE.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (item.key === 'opcrTracker') return !!permissions?.canSeeOpcrTracker;
      if (item.key === 'opcrCommitments') return !!permissions?.canSeeCommitmentsInSidebar;
      if (item.key === 'planningHub') return !!permissions?.canSeePlanningHub;
      if (item.key === 'serviceModes') return !!permissions?.canSeeServiceModes;
      return true;
    })
  })).filter(section => section.items.length > 0);

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 998,
            cursor: 'pointer'
          }}
        />
      )}
      <div className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${isOpen ? "open" : ""}`}>
        {/* Dynamic override style tag to fully bypass default layout lines */}
        <style dangerouslySetInnerHTML={{
          __html: `
          .sidebar {
            width: 256px;
            background: var(--maroon, #580000) !important;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            height: 100vh;
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            box-sizing: border-box;
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            font-family: "DM Sans", sans-serif;
            z-index: 1000;
            overflow: hidden;
            transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar.collapsed {
            width: 64px;
          }
          @media (max-width: 960px) {
            .sidebar {
              transform: translateX(-100%);
              width: 256px !important;
            }
            .sidebar.open {
              transform: translateX(0);
            }
          }
          .sidebar-logo {
            padding: 0 24px;
            justify-content: flex-start;
            height: 61px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.1);
            flex-shrink: 0;
            transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar.collapsed .sidebar-logo {
            padding: 0 14px;
          }
          .sidebar-logo-mark {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
          }
          .sidebar-logo-text {
            display: flex;
            flex-direction: column;
            opacity: 1;
            width: auto;
            visibility: visible;
            overflow: hidden;
            white-space: nowrap;
            transition: opacity 0.2s ease, width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar.collapsed .sidebar-logo-text {
            opacity: 0;
            width: 0px;
            visibility: hidden;
          }
          .sidebar-logo-title {
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.05em;
            margin: 0;
          }
          .sidebar-logo-subtitle {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.6);
            letter-spacing: 0.05em;
            margin: 0;
          }
          .sidebar-nav {
            padding: 12px 0;
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 4px;
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .sidebar-nav::-webkit-scrollbar {
            display: none;          /* Chrome, Safari and Opera */
          }
          .nav-section {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .nav-section-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--gold, #C8960C);
            letter-spacing: 0.08em;
            text-transform: uppercase;
            padding: 16px 24px 8px 24px;
            opacity: 0.8;
            margin: 0;
            height: auto;
            overflow: hidden;
            white-space: nowrap;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar.collapsed .nav-section-title {
            opacity: 0;
            height: 0px;
            padding: 0px;
          }
          .nav-section-divider {
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            margin: 0px 12px;
            height: 0px;
            opacity: 0;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar.collapsed .nav-section-divider {
            margin: 8px 12px;
            height: 1px;
            opacity: 1;
          }
          .nav-leaf {
            display: flex;
            align-items: center;
            gap: 16px;
            border-top-left-radius: 0px;
            border-bottom-left-radius: 0px;
            border-top-right-radius: 6px;
            border-bottom-right-radius: 6px;
            padding: 10px 16px 10px 20px;
            margin: 2px 12px 2px 0px;
            justify-content: flex-start;
            font-size: 14px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.7) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease, color 0.15s ease;
            cursor: pointer;
            border-left: 4px solid transparent;
          }
          .sidebar.collapsed .nav-leaf {
            gap: 0;
            padding-left: 14px !important;
            padding-right: 14px !important;
            margin: 2px 8px 2px 0px !important;
          }
          .nav-leaf:hover {
            color: #ffffff !important;
            background: rgba(255, 255, 255, 0.08) !important;
          }
          .nav-leaf.active {
            color: #ffffff !important;
            background: rgba(255, 255, 255, 0.08) !important;
            font-weight: 500;
            border-left: 4px solid var(--gold, #C8960C) !important;
          }
          .nav-leaf.active .nav-leaf-icon {
            color: #ffffff !important;
          }
          .nav-leaf-icon {
            width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: inherit;
            flex-shrink: 0;
          }
          .nav-leaf-label {
            line-height: 1.2;
            opacity: 1;
            width: auto;
            visibility: visible;
            overflow: hidden;
            white-space: nowrap;
            transition: opacity 0.2s ease, width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar.collapsed .nav-leaf-label {
            opacity: 0;
            width: 0px;
            visibility: hidden;
          }
          .sidebar-footer {
            padding: 16px 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            gap: 12px;
            opacity: 1;
            height: auto;
            overflow: hidden;
            white-space: nowrap;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar.collapsed .sidebar-footer {
            opacity: 0;
            height: 0px;
            padding: 0px;
          }
          .sidebar-footer-text {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
            line-height: 1.4;
            letter-spacing: 0.03em;
            margin: 0;
          }
        `}} />

        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <img src={logo} alt="PUP Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div className="sidebar-logo-text">
            <h1 className="sidebar-logo-title">PUP Caloocan</h1>
            <p className="sidebar-logo-subtitle">OPCR System</p>
          </div>
        </div>

        <div className="sidebar-nav">
          {visibleNavTree.map((section) => (
            <div key={section.section} className="nav-section">
              <div className="nav-section-title">{section.section.toUpperCase()}</div>
              <div className="nav-section-divider" />
              <div className="nav-branch">
                {section.items.map((item) => (
                  <Tooltip key={item.key} title={sidebarCollapsed ? item.label : ""} placement="right" arrow>
                    <div
                      onClick={() => setActive(item.routeKey)}
                      className={`nav-leaf ${active === item.routeKey ? "active" : ""}`}
                    >
                      <span className="nav-leaf-icon">{ICONS[item.icon]}</span>
                      <span className="nav-leaf-label">{item.label}</span>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <p className="sidebar-footer-text">
            Planning & Standards System
          </p>
        </div>
      </div>
    </>
  );
}
