import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/Admin.css";

const Admin = ({ user }) => {
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(false);

    // ==========================================
    // MOCK DATA: YÊU CẦU RÚT TIỀN (Thay bằng API sau)
    // ==========================================
    const [withdrawals, setWithdrawals] = useState([]);

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }

        fetchAccessTradeReport();
        fetchWithdrawals();

    }, [user]);

    const fetchWithdrawals = async () => {

        try {

            const API =
                import.meta.env.VITE_API_URL ||
                "http://localhost:8000";

            const token = await user.getIdToken();

            const res = await fetch(
                `${API}/api/admin/withdrawals`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await res.json();

            if (data.success) {

                setWithdrawals(data.data);

            }

        } catch (err) {

            console.log(err);

        }

    };

    const fetchAccessTradeReport = async () => {
        setLoading(true);
        try {
            const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
            if (!user) return;
            const token = await user.getIdToken();

            const res = await fetch(`${API}/api/admin/at-reports`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = await res.json();

            if (res.status === 403) {
                setAuthError(true);
                setTimeout(() => navigate("/"), 2000);
                return;
            }

            if (!res.ok) throw new Error(data.detail || "Không thể tải dữ liệu");

            setReportData(data);
        } catch (error) {
            console.error("Lỗi fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Hàm xử lý UI Duyệt/Từ chối rút tiền
    const handleApproveWithdrawal = async (id) => {

        const API =
            import.meta.env.VITE_API_URL ||
            "http://localhost:8000";

        const token =
            await user.getIdToken();
        if (!window.confirm("Đã chuyển khoản cho user?"))
            return;

        await fetch(
            `${API}/api/admin/withdrawals/update`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    request_id: id,
                    status: "approved"
                })
            }
        );

        fetchWithdrawals();

    };

    const handleRejectWithdrawal = async (id) => {

        const API =
            import.meta.env.VITE_API_URL ||
            "http://localhost:8000";

        const token =
            await user.getIdToken();

        await fetch(
            `${API}/api/admin/withdrawals/update`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    request_id: id,
                    status: "rejected"
                })
            }
        );

        fetchWithdrawals();
    };

    // --- BÓC TÁCH & BẢO VỆ DỮ LIỆU CHỐNG CRASH ---
    const summary = reportData?.summary || {};
    const analytics = reportData?.analytics || {};
    const orders = reportData?.orders || [];

    // Chart Data
    const chartData = analytics.daily_links || [];
    const maxChartValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.count || 0)) : 1;
    const finalMaxChartValue = maxChartValue > 0 ? maxChartValue : 1;

    // Ratios Data
    const orderStatus = analytics.order_status || { approved: 0, pending: 0, rejected: 0 };
    const totalOrdersStatus = (orderStatus.approved + orderStatus.pending + orderStatus.rejected) || 1;

    const orderRatios = {
        approved: Math.round((orderStatus.approved / totalOrdersStatus) * 100),
        pending: Math.round((orderStatus.pending / totalOrdersStatus) * 100),
        rejected: Math.round((orderStatus.rejected / totalOrdersStatus) * 100),
    };

    // Top Lists
    const topUsers = analytics.top_users || [];
    const topProducts = analytics.top_products || [];
    const avatarColors = ["#f27b8a", "#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#06b6d4"];

    if (authError) {
        return (
            <div className="admin-restrict-screen">
                <div className="restrict-box slide-up">
                    <div className="alert-icon-wrapper"><span className="alert-emoji">🔒</span></div>
                    <h2>Khu vực hạn chế truy cập</h2>
                    <p>Hệ thống phát hiện tài khoản không có quyền quản trị. Đang điều hướng an toàn về trang chủ...</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="admin-loading-screen">
                <div className="loader-pulse"></div>
                <p>Đang đồng bộ dữ liệu hệ thống 📡...</p>
            </div>
        );
    }

    return (
        <div className="admin-panel-layout">
            <nav className="admin-topbar slide-down">
                <div className="admin-logo bubbly-hover" onClick={() => navigate("/")}>
                    <span className="logo-icon">🐰</span>
                    <span className="logo-text">Thỏ Admin</span>
                </div>
                <div className="admin-nav-actions">
                    <button className="btn-secondary bubbly-hover" onClick={() => navigate("/dashboard")}>⚡ Trang Đổi Link</button>
                    <button className="btn-refresh bubbly-hover" onClick={fetchAccessTradeReport}>🔄 Làm Mới</button>
                </div>
            </nav>

            <div className="admin-main-container">
                <div className="admin-welcome-row fade-up">
                    <div>
                        <h1>Báo Cáo Tổng Quan</h1>
                        <p className="subtitle-text">Tích hợp dữ liệu thời gian thực từ AccessTrade và Firebase</p>
                    </div>
                </div>

                {/* --- KHỐI 1: DOANH THU ACCESSTRADE --- */}
                <h3 className="section-title fade-up delay-1">Hiệu Quả Doanh Thu (AccessTrade)</h3>
                <div className="admin-stats-bento fade-up delay-1">
                    <div className="bento-item order-card bubbly-hover">
                        <div className="bento-icon-wrapper orange-glow"><span className="bento-icon">📦</span></div>
                        <div className="bento-info">
                            <span>Đơn Hàng Phát Sinh</span>
                            <h3>{summary.conversions?.toLocaleString() || 0}</h3>
                        </div>
                    </div>

                    <div className="bento-item commission-card bubbly-hover">
                        <div className="bento-icon-wrapper green-glow"><span className="bento-icon">💰</span></div>
                        <div className="bento-info">
                            <span>Tổng Hoa Hồng Sàn</span>
                            <h3>{summary.total_commission?.toLocaleString() || 0}<small>đ</small></h3>
                        </div>
                    </div>

                    <div className="bento-item profit-card bubbly-hover">
                        <div className="bento-icon-wrapper purple-glow"><span className="bento-icon">📈</span></div>
                        <div className="bento-info">
                            <span>Thỏ Giữ Lại (20%)</span>
                            <h3 className="highlight-gradient">{summary.net_profit?.toLocaleString() || 0}<small>đ</small></h3>
                        </div>
                    </div>
                </div>

                {/* --- KHỐI 2: DỮ LIỆU HỆ THỐNG FIREBASE --- */}
                <h3 className="section-title mt-40 fade-up delay-2">Hoạt Động Hệ Thống (Firebase)</h3>
                <div className="admin-stats-bento grid-4 fade-up delay-2">
                    <div className="bento-item users-card bubbly-hover">
                        <div className="bento-icon-wrapper pink-glow"><span className="bento-icon">👥</span></div>
                        <div className="bento-info">
                            <span>Tổng Users</span>
                            <h3>{summary.users?.toLocaleString() || 0}</h3>
                        </div>
                    </div>

                    <div className="bento-item new-users-card bubbly-hover">
                        <div className="bento-icon-wrapper cyan-glow"><span className="bento-icon">🐣</span></div>
                        <div className="bento-info">
                            <span>User Mới Tuần Này</span>
                            <h3>{analytics.new_users?.toLocaleString() || 0} <span className="trend-up">↑ Tăng</span></h3>
                        </div>
                    </div>

                    <div className="bento-item link-card bubbly-hover">
                        <div className="bento-icon-wrapper blue-glow"><span className="bento-icon">🔗</span></div>
                        <div className="bento-info">
                            <span>Tổng Link Đã Tạo</span>
                            <h3>{summary.generated_links?.toLocaleString() || 0}</h3>
                        </div>
                    </div>

                    <div className="bento-item today-link-card bubbly-hover">
                        <div className="bento-icon-wrapper yellow-glow"><span className="bento-icon">🔥</span></div>
                        <div className="bento-info">
                            <span>Link Tạo Hôm Nay</span>
                            <h3>{analytics.today_links?.toLocaleString() || 0}</h3>
                        </div>
                    </div>
                </div>

                {/* --- KHỐI 3: CHARTS (BIỂU ĐỒ) --- */}
                <div className="charts-grid fade-up delay-3 mt-40">
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3>Biểu đồ link tạo theo ngày</h3>
                            <span className="badge-light">7 Ngày gần nhất</span>
                        </div>
                        <div className="css-bar-chart">
                            {chartData.length > 0 ? (
                                chartData.map((data, index) => (
                                    <div className="bar-group" key={index}>
                                        <span className="bar-value">{data.count || 0}</span>
                                        <div className="bar-track">
                                            <div
                                                className="bar-fill"
                                                style={{ height: `${((data.count || 0) / finalMaxChartValue) * 100}%` }}
                                            ></div>
                                        </div>
                                        <span className="bar-label">{data.date || ''}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state-text">Chưa có dữ liệu 7 ngày qua</div>
                            )}
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-header">
                            <h3>Tỷ lệ trạng thái đơn hàng</h3>
                            <span className="badge-light">30 Ngày</span>
                        </div>
                        <div className="ratio-wrapper">
                            <div className="stacked-bar">
                                <div className="segment approved" style={{ width: `${orderRatios.approved}%` }}></div>
                                <div className="segment pending" style={{ width: `${orderRatios.pending}%` }}></div>
                                <div className="segment rejected" style={{ width: `${orderRatios.rejected}%` }}></div>
                            </div>
                            <div className="ratio-legend">
                                <div className="legend-item"><span className="dot approved"></span><div><strong>{orderRatios.approved}%</strong> Đã Duyệt</div></div>
                                <div className="legend-item"><span className="dot pending"></span><div><strong>{orderRatios.pending}%</strong> Đang Chờ</div></div>
                                <div className="legend-item"><span className="dot rejected"></span><div><strong>{orderRatios.rejected}%</strong> Đã Hủy</div></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- KHỐI 4: TOP DANH SÁCH --- */}
                <div className="top-lists-grid fade-up delay-4 mt-40">
                    <div className="top-list-card">
                        <div className="list-header"><h3>🏆 Top 10 User Hoàn Tiền</h3></div>
                        <div className="list-body">
                            {topUsers.length > 0 ? (
                                topUsers.map((u, i) => (
                                    <div className="list-item" key={i}>
                                        <div className="item-left">
                                            <div className="item-avatar" style={{ backgroundColor: avatarColors[i % avatarColors.length] }}>
                                                {u.email ? u.email.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div className="item-info">
                                                {/* ĐÃ SỬA: Hiển thị nguyên bản email, không che */}
                                                <strong>{u.email || "Ẩn danh"}</strong>
                                                <span>Hạng #{i + 1}</span>
                                            </div>
                                        </div>
                                        <div className="item-right highlight-green">+{u.cashback?.toLocaleString() || 0}đ</div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state-text">Chưa có dữ liệu người dùng.</div>
                            )}
                        </div>
                    </div>

                    <div className="top-list-card">
                        <div className="list-header"><h3>🛍️ Top 10 Sản Phẩm</h3></div>
                        <div className="list-body">
                            {topProducts.length > 0 ? (
                                topProducts.map((p, i) => (
                                    <div className="list-item" key={i}>
                                        <div className="item-left">
                                            <div className={`platform-mini-icon ${(p.platform || '').toLowerCase()}`}>
                                                {p.platform === 'shopee' ? 'S' : p.platform === 'lazada' ? 'L' : p.platform === 'tiktok' ? 'T' : '🐰'}
                                            </div>
                                            <div className="item-info">
                                                <strong>{p.name && p.name.length > 25 ? p.name.substring(0, 25) + '...' : (p.name || 'Không rõ')}</strong>
                                                <span className="uppercase">{p.platform || 'System'}</span>
                                            </div>
                                        </div>
                                        <div className="item-right"><span className="click-count">🔥 {p.count || 0} Lượt</span></div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state-text">Chưa có sản phẩm nào.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- KHỐI MỚI: QUẢN LÝ YÊU CẦU RÚT TIỀN --- */}
                <div className="admin-data-section fade-up delay-5 mt-40">
                    <div className="section-header">
                        <h3>Quản lý yêu cầu rút tiền</h3>
                        <div className="header-decoration"></div>
                    </div>
                    <div className="table-responsive-wrapper">
                        <table className="custom-admin-table">
                            <thead>
                                <tr>
                                    <th>Mã GD</th>
                                    <th>Thời Gian</th>
                                    <th>Người Dùng</th>
                                    <th>Số Tiền</th>
                                    <th>Thông Tin Nhận</th>
                                    <th>Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {withdrawals.map((req, i) => (
                                    <tr key={i} className="table-row-hover">
                                        <td>
                                            <div className="order-id-wrapper">
                                                <code className="order-id-code">{req.id}</code>
                                            </div>
                                        </td>
                                        <td className="time-cell">{req.date}</td>
                                        <td><span className="user-email-badge">{req.email}</span></td>
                                        <td className="amount-cell highlight-green">{req.amount.toLocaleString()}đ</td>
                                        <td className="bank-info-cell">{req.bank}</td>
                                        <td>
                                            {req.status === "pending" ? (
                                                <div className="action-buttons">
                                                    <button className="btn-approve" onClick={() => handleApproveWithdrawal(req.id)}>Duyệt</button>
                                                    <button className="btn-reject" onClick={() => handleRejectWithdrawal(req.id)}>Từ chối</button>
                                                </div>
                                            ) : req.status === "approved" ? (
                                                <span className="status-pill approved">Đã chuyển khoản</span>
                                            ) : (
                                                <span className="status-pill rejected">Đã từ chối</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {withdrawals.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="empty-table-cell">
                                            <div className="empty-state">
                                                <p>Hiện không có yêu cầu rút tiền nào.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- BẢNG DỮ LIỆU ĐƠN HÀNG (Dịch xuống cuối) --- */}
                <div className="admin-data-section fade-up delay-5 mt-40">
                    <div className="section-header">
                        <h3>Chi tiết đơn hàng mới nhất từ mạng lưới</h3>
                        <div className="header-decoration"></div>
                    </div>
                    <div className="table-responsive-wrapper">
                        <table className="custom-admin-table">
                            <thead>
                                <tr>
                                    <th>Mã Đơn Hàng</th>
                                    <th>Thời Gian</th>
                                    <th>Chiến Dịch</th>
                                    <th>Giá Trị Đơn</th>
                                    <th>Hoa Hồng</th>
                                    <th>Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order, i) => (
                                    <tr key={i} className="table-row-hover">
                                        <td>
                                            <div className="order-id-wrapper">
                                                <code className="order-id-code">{order.order_id || 'N/A'}</code>
                                            </div>
                                        </td>
                                        <td className="time-cell">
                                            {order.order_time ? new Date(order.order_time).toLocaleString('vi-VN') : '--'}
                                        </td>
                                        <td>
                                            <span className={`merchant-badge ${(order.campaign_name || '').toLowerCase().includes('shopee') ? 'shopee' : (order.campaign_name || '').toLowerCase().includes('lazada') ? 'lazada' : (order.campaign_name || '').toLowerCase().includes('tiktok') ? 'tiktok' : 'default'}`}>
                                                {order.campaign_name || 'Khác'}
                                            </span>
                                        </td>
                                        <td className="amount-cell">{parseFloat(order.sales_amount || 0).toLocaleString()}đ</td>
                                        <td className="commission-cell">+{parseFloat(order.pub_commission || 0).toLocaleString()}đ</td>
                                        <td>
                                            <span className={`status-pill ${order.order_status === 1 ? 'approved' : order.order_status === 2 ? 'rejected' : 'pending'}`}>
                                                {order.order_status === 1 ? 'Đã duyệt' : order.order_status === 2 ? 'Hủy bỏ' : 'Chờ xử lý'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="empty-table-cell">
                                            <div className="empty-state">
                                                <span className="empty-icon">📭</span>
                                                <p>Chưa có dữ liệu đơn hàng nào được ghi nhận từ AccessTrade.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;