import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import "../assets/styles/Admin.css";

const Admin = ({ user }) => {
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(false);
    const [withdrawals, setWithdrawals] = useState([]);
    const [usersList, setUsersList] = useState([]);

    // State cho dữ liệu Timeline đã được làm phẳng
    const [activityLog, setActivityLog] = useState([]);
    const [visibleCount, setVisibleCount] = useState(10);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    useEffect(() => {
        if (!user) {
            navigate("/login");
            return;
        }
        fetchAccessTradeReport();
        fetchWithdrawals();
        fetchUsersList();
    }, [user]);

    // Xử lý làm phẳng dữ liệu khi usersList thay đổi
    useEffect(() => {
        let logs = [];
        usersList.forEach(u => {
            if (u.recent_links && u.recent_links.length > 0) {
                u.recent_links.forEach(link => {
                    logs.push({ email: u.email, ...link });
                });
            }
        });

        // Sắp xếp lại theo thời gian mới nhất lên đầu
        logs.sort((a, b) => {
            const parseDate = (dStr) => {
                if (!dStr || dStr === 'N/A') return 0;
                const [datePart, timePart] = dStr.split(' ');
                if (!datePart || !timePart) return 0;
                const [d, m, y] = datePart.split('/');
                const [hr, min] = timePart.split(':');
                return new Date(y, m - 1, d, hr, min).getTime();
            };
            return parseDate(b.time_str) - parseDate(a.time_str);
        });

        setActivityLog(logs);
    }, [usersList]);

    const fetchUsersList = async () => {
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
            if (data.success) setUsersList(data.data);
        } catch (err) {
            console.error("Lỗi fetch danh sách user:", err);
        }
    };

    const fetchWithdrawals = async () => {
        try {
            const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const token = await user.getIdToken();
            const res = await fetch(`${API}/api/admin/withdrawals`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setWithdrawals(data.data);
        } catch (err) { }
    };

    const fetchAccessTradeReport = async () => {
        setLoading(true);
        try {
            const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
            if (!user) return;
            const token = await user.getIdToken();
            const res = await fetch(`${API}/api/admin/at-reports`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();

            if (res.status === 403) {
                setAuthError(true);
                setTimeout(() => navigate("/"), 2000);
                return;
            }
            if (!res.ok) throw new Error(data.detail || "Không thể tải dữ liệu");
            setReportData(data);
        } catch (error) {
            console.error("Lỗi fetch dữ liệu AccessTrade:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveWithdrawal = async (id) => {
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const token = await user.getIdToken();
        if (!window.confirm("Xác nhận đã chuyển khoản cho user?")) return;

        await fetch(`${API}/api/admin/withdrawals/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ request_id: id, status: "approved" })
        });
        fetchWithdrawals();
    };

    const handleRejectWithdrawal = async (id) => {
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
        const token = await user.getIdToken();
        if (!window.confirm("Xác nhận từ chối yêu cầu rút tiền này?")) return;

        await fetch(`${API}/api/admin/withdrawals/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ request_id: id, status: "rejected" })
        });
        fetchWithdrawals();
    };

    const handleExportExcel = () => {
        if (!reportData && usersList.length === 0 && withdrawals.length === 0) {
            alert("Hệ thống chưa tải xong dữ liệu để xuất file!");
            return;
        }
        const ordersData = (reportData?.orders || []).map(o => ({
            "Mã Đơn Hàng": o.order_id || "N/A",
            "User": o.utm_source || "",
            "Thời Gian Giao Dịch": o.order_time ? new Date(o.order_time).toLocaleString("vi-VN") : "--",
            "Chiến Dịch/Sàn": o.campaign_name || "Khác",
            "Giá Trị Đơn Hàng (đ)": parseFloat(o.sales_amount || 0),
            "Hoa Hồng Hệ Thống (đ)": parseFloat(o.pub_commission || 0),
            "Trạng Thái Đơn Sàn": o.order_status === 1 ? "Đã duyệt" : o.order_status === 2 ? "Hủy bỏ" : "Chờ xử lý"
        }));
        const withdrawalsData = withdrawals.map(w => ({
            "Mã Giao Dịch": w.id, "Thời Gian Đăng Ký": w.date, "Tài Khoản Email": w.email,
            "Số Tiền Yêu Cầu Rút (đ)": w.amount, "Thông Tin Ngân Hàng Nhận": w.bank,
            "Trạng Thái Xử Lý": w.status === "approved" ? "Đã chuyển khoản" : w.status === "rejected" ? "Đã từ chối" : "Đang chờ duyệt"
        }));

        // Xuất data Timeline
        const usersLinksData = activityLog.map(log => ({
            "Thời Gian Tạo": log.time_str,
            "Tài Khoản Email": log.email,
            "Nền Tảng Sàn": log.platform,
            "Tên Sản Phẩm": log.product_name,
            "Link Affiliate": log.short_link
        }));

        const wsOrders = XLSX.utils.json_to_sheet(ordersData);
        const wsWithdrawals = XLSX.utils.json_to_sheet(withdrawalsData);
        const wsUsersLinks = XLSX.utils.json_to_sheet(usersLinksData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsOrders, "Đơn Hàng Tổng Quan");
        XLSX.utils.book_append_sheet(wb, wsWithdrawals, "Lịch Sử Yêu Cầu Rút Tiền");
        XLSX.utils.book_append_sheet(wb, wsUsersLinks, "Nhật Ký Tạo Link");
        XLSX.writeFile(wb, `Bao_Cao_He_Thong_Tho_Admin_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const summary = reportData?.summary || {};
    const analytics = reportData?.analytics || {};
    const orders = reportData?.orders || [];
    const chartData = analytics.daily_links || [];
    const maxChartValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.count || 0)) : 1;
    const finalMaxChartValue = maxChartValue > 0 ? maxChartValue : 1;
    const topUsers = analytics.top_users || [];

    if (authError) {
        return (
            <div className="admin-restrict-screen">
                <div className="restrict-box slide-up">
                    <div className="alert-icon-wrapper"><span className="alert-emoji">🔒</span></div>
                    <h2>Khu vực hạn chế truy cập</h2>
                    <p>Hệ thống phát hiện tài khoản không có quyền quản trị.</p>
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
                <div className="admin-logo" onClick={() => navigate("/")}>
                    <span className="logo-icon">🐰</span>
                    <span className="logo-text">Thỏ Admin</span>
                </div>
                <div className="admin-nav-actions">
                    <button className="btn-secondary" onClick={() => navigate("/dashboard")}>⚡ Đổi Link</button>
                    <button className="btn-excel" onClick={handleExportExcel}>📊 Xuất Excel</button>
                    <button className="btn-refresh" onClick={() => { fetchAccessTradeReport(); fetchWithdrawals(); fetchUsersList(); }}>🔄 Làm Mới</button>
                </div>
            </nav>

            <div className="admin-main-container">
                <div className="admin-welcome-row fade-up">
                    <div>
                        <h1>Tổng quan hệ thống</h1>
                        <p className="subtitle-text">Tích hợp dữ liệu thời gian thực từ AccessTrade và Firebase</p>
                    </div>
                </div>

                {/* --- KHỐI 1: DOANH THU --- */}
                <div className="admin-stats-bento grid-4 fade-up delay-1 mt-30">
                    <div className="at-card">
                        <div className="at-card-header">
                            <div className="at-icon-box bg-blue"><i className="fas fa-wallet">💼</i></div>
                            <span>Hoa hồng phát sinh</span>
                        </div>
                        <div className="at-card-body">
                            <h3>{summary.total_commission?.toLocaleString() || 0}<small>đ</small></h3>
                        </div>
                    </div>
                    <div className="at-card">
                        <div className="at-card-header">
                            <div className="at-icon-box bg-cyan"><i className="fas fa-gem">💎</i></div>
                            <span>Đơn hàng phát sinh</span>
                        </div>
                        <div className="at-card-body">
                            <h3>{summary.conversions?.toLocaleString() || 0}</h3>
                        </div>
                    </div>
                    <div className="at-card">
                        <div className="at-card-header">
                            <div className="at-icon-box bg-indigo"><i className="fas fa-shopping-bag">🛍️</i></div>
                            <span>Giá trị chuyển đổi</span>
                        </div>
                        <div className="at-card-body">
                            <h3>{summary.total_sales?.toLocaleString() || 0}<small>đ</small></h3>
                        </div>
                    </div>
                    <div className="at-card">
                        <div className="at-card-header">
                            <div className="at-icon-box bg-purple"><i className="fas fa-chart-line">📈</i></div>
                            <span>Thỏ giữ lại (20%)</span>
                        </div>
                        <div className="at-card-body">
                            <h3 className="highlight-gradient">{summary.net_profit?.toLocaleString() || 0}<small>đ</small></h3>
                        </div>
                    </div>
                </div>

                {/* --- KHỐI 2: DỮ LIỆU HỆ THỐNG FIREBASE --- */}
                <h3 className="section-title mt-40 fade-up delay-2">Hoạt động người dùng</h3>
                <div className="admin-stats-bento grid-4 fade-up delay-2">
                    <div className="at-card">
                        <div className="at-card-header">
                            <div className="at-icon-box bg-gray"><i className="fas fa-users">👥</i></div>
                            <span>Tổng Users</span>
                        </div>
                        <div className="at-card-body">
                            <h3>{summary.users?.toLocaleString() || 0}</h3>
                        </div>
                    </div>
                    <div className="at-card">
                        <div className="at-card-header">
                            <div className="at-icon-box bg-gray"><i className="fas fa-user-plus">🐣</i></div>
                            <span>User Mới Tuần Này</span>
                        </div>
                        <div className="at-card-body">
                            <h3>{analytics.new_users?.toLocaleString() || 0} <span className="trend-up">↑ Tăng</span></h3>
                        </div>
                    </div>
                    <div className="at-card">
                        <div className="at-card-header">
                            <div className="at-icon-box bg-gray"><i className="fas fa-link">🔗</i></div>
                            <span>Tổng Link Đã Tạo</span>
                        </div>
                        <div className="at-card-body">
                            <h3>{summary.generated_links?.toLocaleString() || 0}</h3>
                        </div>
                    </div>
                    <div className="at-card">
                        <div className="at-card-header">
                            <div className="at-icon-box bg-orange"><i className="fas fa-fire">🔥</i></div>
                            <span>Link Tạo Hôm Nay</span>
                        </div>
                        <div className="at-card-body">
                            <h3>{analytics.today_links?.toLocaleString() || 0}</h3>
                        </div>
                    </div>
                </div>

                {/* --- KHỐI 3: CHARTS & TOP LISTS --- */}
                <div className="charts-grid fade-up delay-3 mt-40">
                    <div className="chart-card">
                        <div className="chart-header">
                            <h3>Biểu đồ tạo link (7 ngày)</h3>
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
                                <div className="empty-state-text">Chưa có dữ liệu</div>
                            )}
                        </div>
                    </div>
                    <div className="top-list-card">
                        <div className="list-header"><h3>🏆 Top User Hoàn Tiền</h3></div>
                        <div className="list-body">
                            {topUsers.length > 0 ? (
                                topUsers.map((u, i) => (
                                    <div className="list-item" key={i}>
                                        <div className="item-info"><strong>{u.email || "Ẩn danh"}</strong></div>
                                        <div className="item-right highlight-green">+{u.cashback?.toLocaleString() || 0}đ</div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state-text">Chưa có dữ liệu.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- KHỐI 4: NHẬT KÝ TẠO LINK (ACTIVITY LOG) --- */}
                <div className="admin-data-section fade-up delay-4 mt-40">
                    <div className="section-header-flex">
                        <h3>Nhật ký tạo link (Activity Log)</h3>
                        <div className="date-filter-group">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            <span>đến</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            <button onClick={fetchUsersList} className="btn-filter">Lọc</button>
                        </div>
                    </div>
                    <div className="table-responsive-wrapper">
                        <table className="custom-admin-table at-style-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '120px' }}>Thời gian</th>
                                    <th>Tài khoản</th>
                                    <th>Nền tảng</th>
                                    <th>Sản phẩm</th>
                                    <th>Link rút gọn</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activityLog.slice(0, visibleCount).map((log, i) => (
                                    <tr key={i}>
                                        <td className="time-cell">{log.time_str}</td>
                                        <td><span className="user-email-badge">{log.email}</span></td>
                                        <td><span className={`merchant-badge ${(log.platform || '').toLowerCase()}`}>{log.platform}</span></td>
                                        <td><div className="product-name-cell" title={log.product_name}>{log.product_name}</div></td>
                                        <td><a href={log.short_link} target="_blank" rel="noreferrer" className="aff-link-cell">{log.short_link}</a></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {visibleCount < activityLog.length && (
                            <div style={{ textAlign: 'center', padding: '15px' }}>
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 10)}
                                    className="btn-filter"
                                    style={{ background: '#e2e8f0', color: '#1e293b' }}
                                >
                                    Xem thêm 10 hoạt động cũ hơn
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- KHỐI 5: ĐƠN HÀNG ACCESSTRADE --- */}
                <div className="admin-data-section fade-up delay-5 mt-40">
                    <div className="section-header">
                        <h3>Đơn hàng AccessTrade mới nhất</h3>
                    </div>
                    <div className="table-responsive-wrapper">
                        <table className="custom-admin-table at-style-table">
                            <thead>
                                <tr>
                                    <th>Mã đơn hàng</th>
                                    <th>User</th>
                                    <th>Thời gian</th>
                                    <th>Chiến dịch</th>
                                    <th>Giá trị</th>
                                    <th>Hoa hồng</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order, i) => (
                                    <tr key={i}>
                                        <td><code className="order-id-code">{order.order_id || "N/A"}</code></td>
                                        <td><span className="user-email-badge">{order.utm_source || "--"}</span></td>
                                        <td className="time-cell">{order.order_time ? new Date(order.order_time).toLocaleString('vi-VN') : '--'}</td>
                                        <td><span className={`merchant-badge ${(order.campaign_name || '').toLowerCase()}`}>{order.campaign_name || 'Khác'}</span></td>
                                        <td className="amount-cell">{parseFloat(order.sales_amount || 0).toLocaleString()}đ</td>
                                        <td className="commission-cell">+{parseFloat(order.pub_commission || 0).toLocaleString()}đ</td>
                                        <td>
                                            <span className={`status-text ${order.order_status === 1 ? 'approved' : order.order_status === 2 ? 'rejected' : 'pending'}`}>
                                                {order.order_status === 1 ? 'Đã duyệt' : order.order_status === 2 ? 'Đã hủy' : 'Chờ xử lý'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr><td colSpan="7" className="empty-table-cell"><div className="empty-state"><span className="empty-icon">📭</span><p>Chưa có đơn hàng nào.</p></div></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- KHỐI 6: QUẢN LÝ YÊU CẦU RÚT TIỀN --- */}
                <div className="admin-data-section fade-up delay-5 mt-40 mb-80">
                    <div className="section-header"><h3>Yêu cầu rút tiền</h3></div>
                    <div className="table-responsive-wrapper">
                        <table className="custom-admin-table at-style-table">
                            <thead>
                                <tr>
                                    <th>Mã GD</th><th>Thời gian</th><th>Người dùng</th><th>Số tiền</th><th>Ngân hàng nhận</th><th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {withdrawals.map((req, i) => (
                                    <tr key={i}>
                                        <td><code className="order-id-code">{req.id.substring(0, 8)}</code></td>
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
                                                <span className="status-text approved">Đã chuyển</span>
                                            ) : (
                                                <span className="status-text rejected">Đã từ chối</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {withdrawals.length === 0 && (
                                    <tr><td colSpan="6" className="empty-table-cell"><div className="empty-state"><p>Không có yêu cầu rút tiền.</p></div></td></tr>
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