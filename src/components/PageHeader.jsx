import { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants/colors";
import { useAppStore } from "../store/useAppStore";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CircleIcon from "@mui/icons-material/Circle";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import { clearToken } from "../services/auth";

export default function PageHeader({ breadcrumb, title, subtitle, action }) {
    const {
        periods,
        fetchPeriods,
        userRole,
        activeUser,
        permissions,
        sidebarCollapsed,
        setSidebarCollapsed,
        sidebarMobileOpen,
        setSidebarMobileOpen
    } = useAppStore();

    const [activePeriod, setActivePeriod] = useState("");
    const [profileOpen, setProfileOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const profileRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        if (!periods || periods.length === 0) {
            fetchPeriods();
        }
    }, [periods, fetchPeriods]);

    useEffect(() => {
        if (periods && periods.length > 0) {
            const active = periods.find(p => p.status === "Active" || p.status === "Open");
            if (active) {
                if (active.start_date && active.end_date) {
                    const formatStr = (d) => {
                        const date = new Date(d);
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    };
                    setActivePeriod(`${formatStr(active.start_date)} — ${formatStr(active.end_date)}`);
                } else {
                    setActivePeriod(active.name);
                }
            } else {
                setActivePeriod("");
            }
        } else {
            setActivePeriod("");
        }
    }, [periods]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Derive display info from the decoded activeUser (real token data)
    const displayName = activeUser?.displayName || activeUser?.username || (userRole === "Staff" ? "Staff User" : userRole === "OPCREvaluator" ? "OPCR Evaluator" : "Admin User");
    const displayRole = activeUser?.armsRole === 'OPCR_EVALUATOR' ? 'Campus Director'
        : activeUser?.armsRole === 'SUBSYSTEM_ADMIN' ? 'Office Head'
            : activeUser?.armsRole === 'STAFF' ? 'Staff'
                : userRole;
    const displayOffice = activeUser?.office && activeUser.office !== 'ALL' ? activeUser.office : (activeUser?.isCrossOffice ? 'All Offices' : '');
    const initials = displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const notifications = [
        { id: 1, title: 'New commitment draft saved', description: 'A new draft commitment has been successfully saved to your records.', time: '2 min ago', unread: true },
        { id: 2, title: 'Evaluation period is active', description: 'The new evaluation cycle is now open for submissions.', time: '1 hr ago', unread: true },
        { id: 3, title: 'KPI standards updated', description: 'Key performance indicators have been synchronized with the central database.', time: 'Yesterday', unread: false },
    ];
    const unreadCount = notifications.filter(n => n.unread).length;

    const handleLogout = () => {
        setProfileOpen(false);
        clearToken();
        localStorage.removeItem('pss_default_page');
        window.location.href = '/';
    };

    return (
        <>
            {/* Sticky Breadcrumb Row */}
            <div className="sticky-breadcrumb-row">
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
                    <button
                        onClick={() => {
                            if (window.innerWidth < 960) {
                                setSidebarMobileOpen(!sidebarMobileOpen);
                            } else {
                                setSidebarCollapsed(!sidebarCollapsed);
                            }
                        }}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 6,
                            borderRadius: 6,
                            color: "#64748B",
                            transition: "background 0.15s, color 0.15s",
                            marginLeft: -6,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                            e.currentTarget.style.color = "#1E293B";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#64748B";
                        }}
                        title="Toggle Sidebar"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>

                    <span style={{ color: breadcrumb === "Dashboard" ? "#580000" : "#64748B", fontWeight: breadcrumb === "Dashboard" ? 600 : 500, whiteSpace: "nowrap" }}>
                        Dashboard
                    </span>
                    {breadcrumb !== "Dashboard" && (
                        <>
                            <span style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1, flexShrink: 0 }}>›</span>
                            <span style={{
                                color: "#580000",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "160px"
                            }}>
                                {breadcrumb}
                            </span>
                        </>
                    )}
                </div>

                {/* Right side: period badge + notification + profile */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Notification Bell */}
                    <div ref={notifRef} style={{ position: "relative" }}>
                        <button
                            onClick={() => { setNotifOpen(n => !n); setProfileOpen(false); }}
                            style={{
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                border: "none",
                                background: notifOpen ? "rgba(0,0,0,0.07)" : "transparent",
                                color: "#64748B",
                                cursor: "pointer",
                                transition: "background 0.15s, color 0.15s",
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = "rgba(0,0,0,0.06)";
                                e.currentTarget.style.color = "#334155";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = notifOpen ? "rgba(0,0,0,0.07)" : "transparent";
                                e.currentTarget.style.color = notifOpen ? "#334155" : "#64748B";
                            }}
                        >
                            <NotificationsNoneIcon sx={{ fontSize: 22 }} />
                            {/* Badge */}
                            {unreadCount > 0 && (
                                <span style={{
                                    position: "absolute",
                                    top: -2,
                                    right: -2,
                                    display: "flex",
                                    height: 16,
                                    width: 16,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderRadius: "50%",
                                    background: "#580000",
                                    color: "#FFFFFF",
                                    fontSize: 9,
                                    fontWeight: "bold",
                                    border: "2px solid #FFFFFF",
                                }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Dropdown */}
                        {notifOpen && (
                            <div style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                right: -40,
                                background: "#fff",
                                border: "1px solid #E2E8F0",
                                borderRadius: 8,
                                boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                                width: 320,
                                zIndex: 999,
                                overflow: "hidden",
                            }}>
                                {/* Header */}
                                <div style={{ padding: "12px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", fontFamily: "'DM Sans', sans-serif" }}>Notifications</span>
                                    <span
                                        style={{ fontSize: 11, color: "#580000", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                                        onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                                        onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                                    >
                                        Mark all as read
                                    </span>
                                </div>

                                {/* Notification Items */}
                                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                                    {notifications.map((n, i) => (
                                        <div key={n.id} style={{
                                            display: "flex",
                                            alignItems: "start",
                                            gap: 8,
                                            padding: "12px 16px",
                                            borderBottom: i < notifications.length - 1 ? "1px solid #F1F5F9" : "none",
                                            background: n.unread ? "rgba(88,0,0,0.04)" : "#fff",
                                            cursor: "pointer",
                                            transition: "background 0.15s",
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                                            onMouseLeave={e => e.currentTarget.style.background = n.unread ? "rgba(88,0,0,0.04)" : "#fff"}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <p style={{
                                                    fontSize: 13,
                                                    fontWeight: n.unread ? 600 : 500,
                                                    color: n.unread ? "#0f172a" : "#334155",
                                                    lineHeight: "1.25",
                                                    margin: 0,
                                                    fontFamily: "'DM Sans', sans-serif"
                                                }}>
                                                    {n.title}
                                                </p>
                                                <p style={{
                                                    fontSize: 11,
                                                    color: "#64748B",
                                                    marginTop: 4,
                                                    lineHeight: "1.25",
                                                    margin: "4px 0 0 0",
                                                    fontFamily: "'DM Sans', sans-serif"
                                                }}>
                                                    {n.description}
                                                </p>
                                                <p style={{
                                                    fontSize: 10,
                                                    color: "#94A3B8",
                                                    marginTop: 4,
                                                    margin: "4px 0 0 0",
                                                    fontFamily: "'DM Sans', sans-serif"
                                                }}>
                                                    {n.time}
                                                </p>
                                            </div>
                                            {n.unread && (
                                                <CircleIcon sx={{ fontSize: 8, color: "#580000", marginTop: "4px", flexShrink: 0 }} />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div style={{ padding: "8px 16px", textAlign: "center", borderTop: "1px solid #F1F5F9" }}>
                                    <span
                                        style={{ fontSize: 12, color: "#580000", fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                                        onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                                        onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                                    >
                                        View all notifications
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Dropdown */}
                    <div ref={profileRef} style={{ position: "relative" }}>
                        <button
                            onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                background: "none",
                                border: "none",
                                borderRadius: 8,
                                padding: "4px 8px",
                                cursor: "pointer",
                                transition: "opacity 0.15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "0.80"}
                            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        >
                            {/* Avatar */}
                            <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: "#580000",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#fff",
                                flexShrink: 0,
                            }}>
                                {initials}
                            </div>
                            <div className="header-user-text" style={{ textAlign: "left", display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", lineHeight: "1.2" }}>
                                    {displayName}
                                </span>
                                <span style={{ fontSize: 11, color: "#64748B", lineHeight: "1.2", marginTop: 2 }}>
                                    {displayRole}{displayOffice ? ` · ${displayOffice}` : ''}
                                </span>
                            </div>
                            {/* Chevron */}
                            <KeyboardArrowDownIcon
                                sx={{
                                    fontSize: 18,
                                    color: "#94A3B8",
                                    transition: "transform 0.2s",
                                    transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
                                    marginLeft: 2,
                                }}
                            />
                        </button>

                        {/* Dropdown */}
                        {profileOpen && (
                            <div style={{
                                position: "absolute",
                                top: "calc(100% + 6px)",
                                right: 0,
                                background: "#fff",
                                border: "1px solid #E2E8F0",
                                borderRadius: 10,
                                boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                                minWidth: 180,
                                zIndex: 999,
                                overflow: "hidden",
                            }}>


                                {/* Settings */}
                                <button
                                    onClick={() => setProfileOpen(false)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        width: "100%",
                                        padding: "10px 14px",
                                        background: "none",
                                        border: "none",
                                        borderBottom: "1px solid #F1F5F9",
                                        cursor: "pointer",
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: "#334155",
                                        textAlign: "left",
                                        transition: "background 0.15s",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                                >
                                    <SettingsIcon sx={{ fontSize: 16, color: "#64748B" }} />
                                    Settings
                                </button>

                                {/* Logout */}
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        width: "100%",
                                        padding: "10px 14px",
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: "#EF4444",
                                        textAlign: "left",
                                        transition: "background 0.15s",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = "#FEF2F2"}
                                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                                >
                                    <LogoutIcon sx={{ fontSize: 16, color: "#EF4444" }} />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Non-Sticky Title Row */}
            <div className="title-row">
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <h1 className="title-text">
                        {title}
                    </h1>
                    {subtitle && (
                        <p style={{
                            fontSize: 14,
                            color: "#64748B",
                            fontWeight: 400,
                            margin: 0,
                            lineHeight: 1.5,
                            fontFamily: "'DM Sans', sans-serif",
                        }}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {action && <div style={{ flexShrink: 0 }}>{action}</div>}
            </div>
        </>
    );
}