import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import "../assets/styles/Admin.css";

// Elegant Custom SVG Icons
const HomeIcon = () => (
    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
    </svg>
);

const ExcelIcon = () => (
    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
);

const RefreshIcon = () => (
    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12"></path>
    </svg>
);

const SyncIcon = () => (
    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12"></path>
    </svg>
);

const DoubleCheckIcon = () => (
    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
);

const OverviewIcon = () => (
    <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
    </svg>
);

const OrdersIcon = () => (
    <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
    </svg>
);

const WithdrawalsIcon = () => (
    <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
    </svg>
);

const UsersTabIcon = () => (
    <svg className="tab-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
    </svg>
);

const SearchIcon = () => (
    <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
    </svg>
);

const Admin = ({ user }) => {
    const navigate = useNavigate();

    // Tab state
    const [activeTab, setActiveTab] = useState("overview");

    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(false);
    const [withdrawals, setWithdrawals] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [activityLog, setActivityLog] = useState([]);
    const [visibleCount, setVisibleCount] = useState(15);
    const [searchTerm, setSearchTerm] = useState("");
    const [orderSearchTerm, setOrderSearchTerm] = useState("");

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [filterLoading, setFilterLoading] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);

    const formatMoney = (val) => Number(val || 0).toLocaleString("vi-VN") + " đ";

    const getPlatformName = (campaign) => {
        if (!campaign) return "Khác";
        const s = String(campaign);
        if (s.includes("6648523843406889655") || s.length > 15) return "TikTok Shop";
        return s;
    };

    const getPlatformClass = (campaign) => {
        const n = getPlatformName(campaign).toLowerCase();
        if (n.includes("tiktok")) return "tiktok";
        if (n.includes("shopee")) return "shopee";
        if (n.includes("lazada")) return "lazada";
        return "other";
    };

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        fetchAccessTradeReport();
        fetchWithdrawals();
        fetchUsersList();
    }, [user]);

    // Sorting user activity log using backend timestamp (time_val)
    useEffect(() => {
        let logs = [];
        usersList.forEach(u => {
            if (Array.isArray(u.recent_links)) {
                u.recent_links.forEach(link => logs.push({ email: u.email, ...link }));
            }
        });

        logs.sort((a, b) => {
            if (a.time_val && b.time_val) {
                return b.time_val - a.time_val;
            }
            try {
                const [dA, tA] = a.time_str.split(' ');
                const [dB, tB] = b.time_str.split(' ');
                const da = new Date(dA.split('/').reverse().join('-') + 'T' + tA);
                const db = new Date(dB.split('/').reverse().join('-') + 'T' + tB);
                return db - da;
            } catch { return 0; }
        });

        setActivityLog(logs);
    }, [usersList]);

    const fetchUsersList = async () => {
        setFilterLoading(true);
        try {
            const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const token = await user.getIdToken();
            let url = `${API}/api/admin/users`;
            const params = new URLSearchParams();
            if (startDate) params.append("start_date", startDate);
            if (endDate) params.append("end_date", endDate);
            if (params.toString()) url += `?${params.toString()}`;

            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setUsersList(data.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setFilterLoading(false);
        }
    };

    const fetchWithdrawals = async () => {
        try {
            const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const token = await user.getIdToken();
            const res = await fetch(`${API}/api/admin/withdrawals`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setWithdrawals(data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAccessTradeReport = async () => {
        setLoading(true);
        try {
            const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const token = await user.getIdToken();
            const res = await fetch(`${API}/api/admin/at-reports`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();

            if (res.status === 403) {
                setAuthError(true);
                setTimeout(() => navigate("/"), 2000);
                return;
            }
            if (res.ok && data.success) setReportData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Trigger user sync API
    const handleSyncUsers = async () => {
        if (!window.confirm("Xác nhận đồng bộ tất cả thành viên từ Firebase Auth sang Firestore Database?")) return;
        setSyncLoading(true);
        try {
            const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const token = await user.getIdToken();
            const res = await fetch(`${API}/api/admin/sync-users`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(`Đồng bộ thành công! Đã cập nhật ${data.synced} thành viên.`);
                fetchUsersList();
            } else {
                alert("Đồng bộ thất bại hoặc có lỗi xảy ra!");
            }
        } catch (err) {
            console.error(err);
            alert("Có lỗi xảy ra trong quá trình đồng bộ!");
        } finally {
            setSyncLoading(false);
        }
    };

    const handleApproveWithdrawal = async (id) => {
        if (!window.confirm("Xác nhận đã chuyển khoản thành công yêu cầu này?")) return;
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const token = await user.getIdToken();
        const res = await fetch(`${API}/api/admin/withdrawals/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ request_id: id, status: "approved" })
        });
        if (res.ok) {
            fetchWithdrawals();
        } else {
            alert("Cập nhật thất bại!");
        }
    };

    const handleRejectWithdrawal = async (id) => {
        if (!window.confirm("Xác nhận từ chối yêu cầu rút tiền này?")) return;
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const token = await user.getIdToken();
        const res = await fetch(`${API}/api/admin/withdrawals/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ request_id: id, status: "rejected" })
        });
        if (res.ok) {
            fetchWithdrawals();
        } else {
            alert("Cập nhật thất bại!");
        }
    };

    const handleExportExcel = () => {
        if (!reportData && usersList.length === 0 && withdrawals.length === 0) {
            alert("Chưa có dữ liệu để xuất file!");
            return;
        }

        const ordersData = (reportData?.orders || []).map(o => ({
            "Mã Đơn Hàng": o.order_id || "N/A",
            "User": o.utm_source || "",
            "Thời Gian": o.order_time ? new Date(o.order_time).toLocaleString("vi-VN") : "--",
            "Sàn": getPlatformName(o.campaign_name),
            "Giá Trị (đ)": parseFloat(o.sales_amount || 0),
            "Hoa Hồng (đ)": parseFloat(o.pub_commission || 0),
            "Trạng Thái": o.order_status === 1 ? "Đã duyệt" : o.order_status === 2 ? "Hủy" : "Chờ"
        }));

        const withdrawalsData = withdrawals.map(w => ({
            "Mã GD": w.id || "",
            "Thời Gian": w.date || "",
            "Email": w.email || "",
            "Số Tiền": w.amount || 0,
            "Ngân Hàng": w.bank || w.bank_info || "",
            "Trạng Thái": w.status === "approved" ? "Đã chuyển" : w.status === "rejected" ? "Từ chối" : "Chờ"
        }));

        const usersLinksData = activityLog.map(log => ({
            "Thời Gian": log.time_str || "",
            "Email": log.email || "",
            "Sàn": log.platform || "TikTok",
            "Sản Phẩm": log.product_name || "",
            "Link": log.short_link || ""
        }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersData), "Đơn Hàng");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(withdrawalsData), "Rút Tiền");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersLinksData), "Nhật Ký Link");

        XLSX.writeFile(wb, `Bao_Cao_Admin_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const summary = reportData?.summary || {};
    const analytics = reportData?.analytics || {};
    const orders = reportData?.orders || [];
    const orderStatus = analytics.order_status || {};
    const chartData = analytics.daily_links || [];
    const maxChartValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.count || 0)) : 1;
    const topUsers = analytics.top_users || [];
    const topProducts = analytics.top_products || [];

    const filteredLogs = activityLog.filter(log =>
        log.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.product_name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredOrders = orders.filter(order =>
        (order.utm_source || "").toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
        (order.order_id || "").toLowerCase().includes(orderSearchTerm.toLowerCase())
    );

    if (authError) {
        return (
            <div className="admin-restrict-screen">
                <div className="restrict-box">
                    <div className="alert-icon">🔒</div>
                    <h2>Khu vực hạn chế truy cập</h2>
                    <p>Hệ thống phát hiện tài khoản của bạn không có quyền quản trị viên.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="admin-loading-screen">
                <div className="loader-container">
                    <div className="rabbit-loader-glow"></div>
                    <div className="loader-circle-ring"></div>
                    <div className="loader-bunny">🐰</div>
                </div>
                <p className="loader-text">Đang đồng bộ dữ liệu hệ thống Thỏ...</p>
            </div>
        );
    }

    return (
        <div className="admin-panel-layout">
            {/* Topbar */}
            <nav className="admin-topbar">
                <div className="admin-logo" onClick={() => navigate("/")}>
                    <span className="logo-icon-bunny">🐰</span>
                    <span className="logo-text-brand">Thỏ <span className="logo-text-sub">Admin</span></span>
                </div>
                <div className="admin-nav-actions">
                    <button className="btn-action-primary" onClick={() => navigate("/dashboard")}>
                        <HomeIcon />
                        <span>Bảng Điều Khiển</span>
                    </button>
                    <button className="btn-action-success" onClick={handleExportExcel}>
                        <ExcelIcon />
                        <span>Xuất Excel</span>
                    </button>
                    <button className="btn-action-sync" onClick={handleSyncUsers} disabled={syncLoading}>
                        <SyncIcon />
                        <span>{syncLoading ? "Đang đồng bộ..." : "Đồng bộ TV"}</span>
                    </button>
                    <button className="btn-action-refresh" onClick={() => { fetchAccessTradeReport(); fetchWithdrawals(); fetchUsersList(); }}>
                        <RefreshIcon />
                        <span>Làm Mới</span>
                    </button>
                </div>
            </nav>

            <div className="admin-main-container">
                {/* Modern Navigation Tabs */}
                <div className="admin-tabs-nav">
                    <button className={`tab-nav-item ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>
                        <OverviewIcon />
                        <span>Tổng Quan</span>
                    </button>
                    <button className={`tab-nav-item ${activeTab === "orders" ? "active" : ""}`} onClick={() => setActiveTab("orders")}>
                        <OrdersIcon />
                        <span>Đơn Hàng</span>
                        {orders.length > 0 && <span className="tab-badge-count">{orders.length}</span>}
                    </button>
                    <button className={`tab-nav-item ${activeTab === "withdrawals" ? "active" : ""}`} onClick={() => setActiveTab("withdrawals")}>
                        <WithdrawalsIcon />
                        <span>Yêu Cầu Rút Tiền</span>
                        {withdrawals.filter(w => w.status === "pending").length > 0 && (
                            <span className="tab-badge-pending-count">
                                {withdrawals.filter(w => w.status === "pending").length}
                            </span>
                        )}
                    </button>
                    <button className={`tab-nav-item ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>
                        <UsersTabIcon />
                        <span>Thành Viên & Link</span>
                    </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                    <div className="tab-content-wrapper fade-in">
                        {/* Quick Stats Grid */}
                        <div className="quick-stats-grid">
                            <div className="kpi-card bg-kpi-pink">
                                <div className="kpi-card-header">
                                    <span className="kpi-title">Tổng Thành Viên</span>
                                    <div className="kpi-icon-circle pink">👤</div>
                                </div>
                                <div className="kpi-value">{summary.users || 0}</div>
                                <div className="kpi-footer-trend">Từ Firestore Auth</div>
                            </div>
                            <div className="kpi-card bg-kpi-blue">
                                <div className="kpi-card-header">
                                    <span className="kpi-title">Tổng Đơn Hàng</span>
                                    <div className="kpi-icon-circle blue">🛒</div>
                                </div>
                                <div className="kpi-value">{summary.conversions || 0}</div>
                                <div className="kpi-footer-trend">Đã ghi nhận trên hệ thống</div>
                            </div>
                            <div className="kpi-card bg-kpi-emerald">
                                <div className="kpi-card-header">
                                    <span className="kpi-title">Tổng Doanh Số</span>
                                    <div className="kpi-icon-circle emerald">💸</div>
                                </div>
                                <div className="kpi-value">{formatMoney(summary.approved_sales)}</div>
                                <div className="kpi-footer-trend text-emerald">Từ đơn hàng thành công</div>
                            </div>
                            <div className="kpi-card bg-kpi-purple">
                                <div className="kpi-card-header">
                                    <span className="kpi-title">Lợi Nhuận Thỏ (30%)</span>
                                    <div className="kpi-icon-circle purple">🐰</div>
                                </div>
                                <div className="kpi-value highlight-pink-gradient">{formatMoney(summary.net_profit)}</div>
                                <div className="kpi-footer-trend text-purple">Thu nhập của Nền tảng</div>
                            </div>
                        </div>

                        {/* Bento Grid: AccessTrade details & Order status */}
                        <div className="overview-sub-grid">
                            {/* Commission Details Card */}
                            <div className="detail-bento-card">
                                <h3 className="bento-card-title">Chi Tiết Hoa Hồng</h3>
                                <div className="bento-inner-rows">
                                    <div className="bento-row-item">
                                        <div className="bento-row-left">
                                            <span className="dot-indicator green"></span>
                                            <span>Đã duyệt (Approved)</span>
                                        </div>
                                        <span className="bento-row-val text-green">{formatMoney(summary.approved_commission)}</span>
                                    </div>
                                    <div className="bento-row-item">
                                        <div className="bento-row-left">
                                            <span className="dot-indicator yellow"></span>
                                            <span>Chờ duyệt (Pending)</span>
                                        </div>
                                        <span className="bento-row-val text-yellow">{formatMoney(summary.pending_commission)}</span>
                                    </div>
                                    <div className="bento-row-item">
                                        <div className="bento-row-left">
                                            <span className="dot-indicator red"></span>
                                            <span>Bị hủy (Rejected)</span>
                                        </div>
                                        <span className="bento-row-val text-red">{formatMoney(summary.rejected_commission)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Sales Breakdown Card */}
                            <div className="detail-bento-card">
                                <h3 className="bento-card-title">Doanh Số Giao Dịch</h3>
                                <div className="bento-inner-rows">
                                    <div className="bento-row-item">
                                        <div className="bento-row-left">
                                            <span className="dot-indicator green"></span>
                                            <span>Doanh số thành công</span>
                                        </div>
                                        <span className="bento-row-val text-green">{formatMoney(summary.approved_sales)}</span>
                                    </div>
                                    <div className="bento-row-item">
                                        <div className="bento-row-left">
                                            <span className="dot-indicator yellow"></span>
                                            <span>Doanh số chờ xử lý</span>
                                        </div>
                                        <span className="bento-row-val text-yellow">{formatMoney(summary.pending_sales)}</span>
                                    </div>
                                    <div className="bento-row-item">
                                        <div className="bento-row-left">
                                            <span className="dot-indicator red"></span>
                                            <span>Doanh số bị hủy</span>
                                        </div>
                                        <span className="bento-row-val text-red">{formatMoney(summary.rejected_sales)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Order Count Status */}
                            <div className="detail-bento-card col-span-2">
                                <h3 className="bento-card-title">Tỷ Lệ Đơn Hàng Theo Trạng Thái</h3>
                                <div className="status-progress-grid">
                                    <div className="status-progress-item">
                                        <div className="status-progress-header">
                                            <span className="status-text-lbl text-green">🟢 Đã duyệt</span>
                                            <span className="status-count-val">{orderStatus.approved || 0} đơn</span>
                                        </div>
                                        <div className="progress-bar-track">
                                            <div className="progress-bar-fill bg-green" style={{ width: `${(orderStatus.approved || 0) / (summary.conversions || 1) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="status-progress-item">
                                        <div className="status-progress-header">
                                            <span className="status-text-lbl text-yellow">🟡 Chờ xử lý</span>
                                            <span className="status-count-val">{orderStatus.pending || 0} đơn</span>
                                        </div>
                                        <div className="progress-bar-track">
                                            <div className="progress-bar-fill bg-yellow" style={{ width: `${(orderStatus.pending || 0) / (summary.conversions || 1) * 100}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="status-progress-item">
                                        <div className="status-progress-header">
                                            <span className="status-text-lbl text-red">🔴 Bị hủy</span>
                                            <span className="status-count-val">{orderStatus.rejected || 0} đơn</span>
                                        </div>
                                        <div className="progress-bar-track">
                                            <div className="progress-bar-fill bg-red" style={{ width: `${(orderStatus.rejected || 0) / (summary.conversions || 1) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* System Activities: Link Stats & Weekly Info */}
                        <div className="system-kpi-row mt-30">
                            <div className="system-stat-mini-card">
                                <span className="stat-label">Tổng link rút gọn</span>
                                <span className="stat-val">{summary.generated_links || 0}</span>
                            </div>
                            <div className="system-stat-mini-card">
                                <span className="stat-label">Link tạo hôm nay</span>
                                <span className="stat-val text-brand-color">{analytics.today_links || 0}</span>
                            </div>
                            <div className="system-stat-mini-card">
                                <span className="stat-label">Thành viên mới (Tuần này)</span>
                                <span className="stat-val text-green">+{analytics.new_users || 0}</span>
                            </div>
                            <div className="system-stat-mini-card">
                                <span className="stat-label">Tổng số Logs truy cập</span>
                                <span className="stat-val">{summary.logs || 0}</span>
                            </div>
                        </div>

                        {/* Chart and Lists Row */}
                        <div className="charts-grid-layout mt-40">
                            {/* Animated Link Generation Chart */}
                            <div className="chart-wrapper-card">
                                <h3 className="card-heading-title">Biểu đồ liên kết được tạo (7 ngày gần nhất)</h3>
                                <div className="bar-chart-visual">
                                    {chartData.map((data, index) => (
                                        <div className="chart-bar-group" key={index}>
                                            <span className="chart-bar-value">{data.count}</span>
                                            <div className="chart-bar-track">
                                                <div className="chart-bar-fill-gradient" style={{ height: `${(data.count / maxChartValue) * 100}%` }}></div>
                                            </div>
                                            <span className="chart-bar-label">{data.date}</span>
                                        </div>
                                    ))}
                                    {chartData.length === 0 && <div className="empty-chart-msg">Chưa có dữ liệu biểu đồ</div>}
                                </div>
                            </div>

                            {/* Top Users & Top Products Column */}
                            <div className="ranking-lists-column">
                                {/* Top Users Card */}
                                <div className="ranking-compact-card">
                                    <h3 className="card-heading-title">🏆 Top Thành Viên Nhận Hoàn Tiền</h3>
                                    <div className="ranking-list-container">
                                        {topUsers.map((u, i) => (
                                            <div className="ranking-item-row" key={i}>
                                                <div className="ranking-item-left">
                                                    <div className="avatar-letter-circle">{u.email[0].toUpperCase()}</div>
                                                    <div className="ranking-item-meta">
                                                        <span className="ranking-item-name">{u.email.split('@')[0]}</span>
                                                        <span className="ranking-item-email">{u.email}</span>
                                                    </div>
                                                </div>
                                                <div className="ranking-item-right">+{formatMoney(u.cashback)}</div>
                                            </div>
                                        ))}
                                        {topUsers.length === 0 && <div className="empty-list-indicator">Chưa có dữ liệu hoàn tiền</div>}
                                    </div>
                                </div>

                                {/* Top Products Card */}
                                <div className="ranking-compact-card mt-20">
                                    <h3 className="card-heading-title">📦 Top Sản Phẩm Được Tạo Link Nhiều Nhất</h3>
                                    <div className="ranking-list-container">
                                        {topProducts.map((p, i) => (
                                            <div className="ranking-item-row" key={i}>
                                                <div className="ranking-item-left max-width-70">
                                                    <span className={`ranking-badge-platform ${getPlatformClass(p.platform)}`}>
                                                        {getPlatformName(p.platform).split(' ')[0]}
                                                    </span>
                                                    <div className="ranking-item-meta">
                                                        <span className="ranking-product-name" title={p.name}>{p.name}</span>
                                                    </div>
                                                </div>
                                                <div className="ranking-item-right-count">
                                                    <span className="link-count-pill">{p.count} link</span>
                                                </div>
                                            </div>
                                        ))}
                                        {topProducts.length === 0 && <div className="empty-list-indicator">Chưa ghi nhận sản phẩm nào</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: ORDERS */}
                {activeTab === "orders" && (
                    <div className="tab-content-wrapper fade-in">
                        <div className="admin-card-section">
                            <div className="card-section-header">
                                <h3 className="card-heading-title">Danh Sách Đơn Hàng AccessTrade</h3>
                                <div className="table-search-box">
                                    <SearchIcon />
                                    <input
                                        type="text"
                                        placeholder="Tìm mã đơn hàng hoặc email người dùng..."
                                        value={orderSearchTerm}
                                        onChange={(e) => setOrderSearchTerm(e.target.value)}
                                        className="styled-search-input"
                                    />
                                </div>
                            </div>

                            <div className="table-wrapper-responsive">
                                <table className="premium-admin-table">
                                    <thead>
                                        <tr>
                                            <th>Mã đơn hàng</th>
                                            <th>Khách hàng</th>
                                            <th>Thời gian mua</th>
                                            <th>Nền tảng</th>
                                            <th>Giá trị đơn</th>
                                            <th>Hoa hồng (Đã nhận)</th>
                                            <th>Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrders.map((order, i) => (
                                            <tr key={i} className="hoverable-row">
                                                <td><span className="styled-order-code">{order.order_id || "N/A"}</span></td>
                                                <td><span className="styled-user-email">{order.utm_source || "--"}</span></td>
                                                <td><span className="time-text-muted">{order.order_time ? new Date(order.order_time).toLocaleString('vi-VN') : '--'}</span></td>
                                                <td>
                                                    <span className={`badge-platform ${getPlatformClass(order.campaign_name)}`}>
                                                        {getPlatformName(order.campaign_name)}
                                                    </span>
                                                </td>
                                                <td className="font-weight-bold">{formatMoney(order.sales_amount)}</td>
                                                <td className="text-emerald font-weight-extrabold">+{formatMoney(order.pub_commission)}</td>
                                                <td>
                                                    <span className={`premium-badge-status ${order.order_status === 1 ? 'approved' : order.order_status === 2 ? 'rejected' : 'pending'}`}>
                                                        <span className="status-glow-dot"></span>
                                                        {order.order_status === 1 ? 'Đã duyệt' : order.order_status === 2 ? 'Bị hủy' : 'Chờ duyệt'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredOrders.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="empty-table-placeholder">
                                                    <div className="empty-view">
                                                        <span className="empty-icon-bunny">🐰</span>
                                                        <p>Không tìm thấy đơn hàng nào khớp với tìm kiếm</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: WITHDRAWALS */}
                {activeTab === "withdrawals" && (
                    <div className="tab-content-wrapper fade-in">
                        <div className="admin-card-section">
                            <div className="card-section-header">
                                <h3 className="card-heading-title">Yêu Cầu Rút Tiền Của Thành Viên</h3>
                            </div>

                            <div className="table-wrapper-responsive">
                                <table className="premium-admin-table">
                                    <thead>
                                        <tr>
                                            <th>Mã giao dịch</th>
                                            <th>Thời gian yêu cầu</th>
                                            <th>Người dùng</th>
                                            <th>Số tiền rút</th>
                                            <th>Thông tin ngân hàng</th>
                                            <th className="text-center-aligned">Trạng thái / Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {withdrawals.map((req, i) => (
                                            <tr key={i} className="hoverable-row">
                                                <td><span className="styled-order-code">{req.id?.substring(0, 8) || req.id}</span></td>
                                                <td><span className="time-text-muted">{req.date}</span></td>
                                                <td><span className="styled-user-email">{req.email}</span></td>
                                                <td className="text-emerald font-weight-extrabold">{formatMoney(req.amount)}</td>
                                                <td className="bank-info-container" title={req.bank || req.bank_info}>
                                                    <span className="bank-detail-text">
                                                        {req.bank || req.bank_info}
                                                    </span>
                                                </td>
                                                <td className="text-center-aligned">
                                                    {req.status === "pending" ? (
                                                        <div className="action-buttons-group">
                                                            <button className="btn-table-approve" onClick={() => handleApproveWithdrawal(req.id)}>
                                                                <DoubleCheckIcon /> Duyệt
                                                            </button>
                                                            <button className="btn-table-reject" onClick={() => handleRejectWithdrawal(req.id)}>
                                                                Từ chối
                                                            </button>
                                                        </div>
                                                    ) : req.status === "approved" ? (
                                                        <span className="premium-badge-status approved">
                                                            <span className="status-glow-dot"></span> Đã chuyển tiền
                                                        </span>
                                                    ) : (
                                                        <span className="premium-badge-status rejected">
                                                            <span className="status-glow-dot"></span> Bị từ chối
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {withdrawals.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="empty-table-placeholder">
                                                    <div className="empty-view">
                                                        <span className="empty-icon-bunny">🐰</span>
                                                        <p>Hiện không có yêu cầu rút tiền nào</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 4: USERS & LINKS */}
                {activeTab === "users" && (
                    <div className="tab-content-wrapper fade-in">
                        {/* Users & Log Area */}
                        <div className="admin-card-section">
                            <div className="card-section-header flex-direction-row">
                                <h3 className="card-heading-title">Nhật Ký Liên Kết Đã Tạo</h3>
                                <div className="log-filters-container">
                                    <div className="filter-search-wrap">
                                        <SearchIcon />
                                        <input
                                            type="text"
                                            placeholder="Tìm email, sản phẩm..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="log-search-input"
                                        />
                                    </div>
                                    <div className="date-inputs-wrap">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="date-input-styled" />
                                        <span className="date-split-text">đến</span>
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="date-input-styled" />
                                    </div>
                                    <button onClick={fetchUsersList} className="btn-action-filter" disabled={filterLoading}>
                                        {filterLoading ? "Đang tải..." : "Lọc"}
                                    </button>
                                </div>
                            </div>

                            <div className="table-wrapper-responsive">
                                <table className="premium-admin-table">
                                    <thead>
                                        <tr>
                                            <th>Thời gian tạo</th>
                                            <th>Thành viên</th>
                                            <th>Tên sản phẩm</th>
                                            <th>Sàn giao dịch</th>
                                            <th>Đường dẫn liên kết</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLogs.slice(0, visibleCount).map((log, i) => (
                                            <tr key={i} className="hoverable-row">
                                                <td><span className="time-text-muted">{log.time_str}</span></td>
                                                <td><span className="styled-user-email">{log.email}</span></td>
                                                <td>
                                                    <div className="table-product-display" title={log.product_name}>
                                                        {log.product_name}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge-platform ${getPlatformClass(log.platform)}`}>
                                                        {getPlatformName(log.platform)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <a href={log.short_link} target="_blank" rel="noreferrer" className="btn-link-action">
                                                        🔗 Mở link rút gọn
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredLogs.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="empty-table-placeholder">
                                                    <div className="empty-view">
                                                        <span className="empty-icon-bunny">🐰</span>
                                                        <p>Không có nhật ký liên kết nào</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Load more logic */}
                            {filteredLogs.length > visibleCount && (
                                <div className="table-load-more-section">
                                    <button className="btn-load-more" onClick={() => setVisibleCount(prev => prev + 15)}>
                                        Xem thêm nhật ký
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;