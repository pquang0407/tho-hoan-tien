import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import "../assets/styles/DashboardLayout.css";

const DashboardLayout = ({ children, user }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(
        window.innerWidth > 900
    );
    const [showUserMenu, setShowUserMenu] = useState(false);

    useEffect(() => {
        const resize = () => {
            if (window.innerWidth <= 900) {
                setIsCollapsed(false);
            }
        };

        resize();

        window.addEventListener("resize", resize);

        return () => window.removeEventListener("resize", resize);
    }, []);
    useEffect(() => {
        setShowUserMenu(false);
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/");
        } catch (err) {
            console.error(err);
            alert("Đăng xuất thất bại!");
        }
    };

    return (
        <div className="layout-container">
            {/* --- SIDEBAR --- */}
            <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>

                <button
                    className="toggle-btn"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>

                <div className="sidebar-logo" onClick={() => navigate("/")}>
                    <span className="logo-emoji">🐰</span>
                    <h2 className="logo-text">Thỏ Hoàn Tiền</h2>
                </div>

                {/* Profile hiển thị linh hoạt tùy trạng thái đăng nhập */}
                <div className="sidebar-user">
                    <div className="user-avatar-wrap">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" />
                        ) : (
                            <div className="avatar-placeholder">
                                {user?.email ? user.email.charAt(0).toUpperCase() : "👤"}
                            </div>
                        )}
                    </div>
                    <div className="user-info">
                        <strong>{user?.displayName || (user ? "Thỏ Mới" : "Khách")}</strong>
                        <span className="user-badge" style={{ backgroundColor: user ? 'var(--primary-color)' : '#94a3b8' }}>
                            {user ? "Thành viên" : "Chưa đăng nhập"}
                        </span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <Link
                        to="/"
                        className={`nav-item ${location.pathname === "/" ? "active" : ""}`}
                    >
                        <span className="nav-icon">🏠</span>
                        <span className="nav-text">Trang Chủ</span>
                    </Link>

                    <Link
                        to="/dashboard"
                        className={`nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}
                    >
                        <span className="nav-icon">✨</span>
                        <span className="nav-text">Chuyển Link</span>
                    </Link>

                    <Link
                        to="/history"
                        className={`nav-item ${location.pathname === "/history" ? "active" : ""}`}
                    >
                        <span className="nav-icon">📜</span>
                        <span className="nav-text">Lịch Sử Đơn</span>
                    </Link>

                    <Link
                        to="/wallet"
                        className={`nav-item ${location.pathname === "/wallet" ? "active" : ""}`}
                    >
                        <span className="nav-icon">💰</span>
                        <span className="nav-text">Ví Tiền Hoàn</span>
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    {user ? (
                        <button className="btn-logout" onClick={handleLogout}>
                            <span className="nav-icon">🚪</span>
                            <span className="nav-text">Đăng Xuất</span>
                        </button>
                    ) : (
                        <button
                            className="btn-logout"
                            style={{ color: 'var(--primary-color)', borderColor: '#fecdd3' }}
                            onClick={() => navigate("/login")}
                        >
                            <span className="nav-icon">🔑</span>
                            <span className="nav-text">Đăng Nhập</span>
                        </button>
                    )}
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            <main className="main-content">
                {/* Mobile Top Header */}
                <div className="mobile-top-header">
                    <div className="mobile-logo">
                        <span className="logo-emoji">🐰</span>
                        <strong>Thỏ Hoàn Tiền</strong>
                    </div>
                    <div
                        className="mobile-avatar"
                        onClick={() => {
                            if (user) {
                                setShowUserMenu(!showUserMenu);
                            } else {
                                navigate("/login");
                            }
                        }}
                    >
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" />
                        ) : (
                            <div className="avatar-placeholder" style={{ background: user ? 'var(--primary-color)' : '#94a3b8' }}>
                                {user?.email ? user.email.charAt(0).toUpperCase() : "👤"}
                            </div>
                        )}
                    </div>
                    {showUserMenu && user && (
                        <div className="mobile-user-menu">
                            <div className="mobile-user-email">
                                {user.email}
                            </div>

                            <button
                                className="mobile-menu-btn"
                                onClick={handleLogout}
                            >
                                🚪 Đăng xuất
                            </button>
                        </div>
                    )}
                </div>

                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;