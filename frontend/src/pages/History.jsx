import React, { useState, useEffect } from "react";
import "../assets/styles/History.css";
import FloatingCarrots from "../components/FloatingCarrots";

const History = ({ user }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.email) return;
        fetchUserHistory();
    }, [user]);

    const fetchUserHistory = async () => {
        setLoading(true);
        try {
            const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const res = await fetch(`${API}/api/user/history?email=${user.email}`);
            const data = await res.json();
            setOrders(data.orders || []);
        } catch (err) {
            console.error("Lỗi lấy lịch sử đơn hàng:", err);
        } finally {
            setLoading(false);
        }
    };

    const getPlatformName = (merchantStr) => {
        if (!merchantStr) return "Khác";
        const s = String(merchantStr).toLowerCase();
        if (s.includes("6648523843406889655") || s.includes("tiktok")) return "TikTok";
        if (s.includes("shopee")) return "Shopee";
        if (s.includes("lazada")) return "Lazada";
        return merchantStr;
    };

    const getPlatformClass = (merchantStr) => {
        const n = getPlatformName(merchantStr).toLowerCase();
        if (n.includes("tiktok")) return "tiktok";
        if (n.includes("shopee")) return "shopee";
        if (n.includes("lazada")) return "lazada";
        return "other";
    };

    return (
        <div className="history-page fade-in">
            <h1 className="page-title">📜 Lịch sử hoàn tiền</h1>
            <p className="page-subtitle">Theo dõi các đơn hàng và tiến độ đối soát hoa hồng của bạn</p>

            <div className="history-card-section">
                <div className="history-table-wrapper-responsive">
                    <table className="premium-history-table">
                        <thead>
                            <tr>
                                <th>Mã đơn hàng</th>
                                <th>Ngày mua</th>
                                <th>Nền tảng</th>
                                <th>Giá trị đơn</th>
                                <th>Hoa hồng</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, i) => (
                                <tr key={i} className="history-table-row">
                                    <td>
                                        <code className="styled-order-code">{order.order_id || 'N/A'}</code>
                                    </td>
                                    <td className="time-col">
                                        {order.time ? new Date(order.time).toLocaleString('vi-VN') : '--'}
                                    </td>
                                    <td>
                                        <span className={`badge-platform ${getPlatformClass(order.merchant)}`}>
                                            {getPlatformName(order.merchant)}
                                        </span>
                                    </td>
                                    <td className="amount-col-sales">
                                        {parseFloat(order.amount || 0).toLocaleString("vi-VN")}đ
                                    </td>
                                    <td className={`amount-col-cashback ${order.status === 'rejected' ? 'rejected-amount' : ''}`}>
                                        {order.status === 'rejected' ? '' : '+'}{parseFloat(order.cashback || 0).toLocaleString("vi-VN")}đ
                                    </td>
                                    <td>
                                        <span className={`status-badge ${order.status === 'pending' ? 'waiting' : order.status === 'approved' ? 'approved' : 'rejected'}`}>
                                            <span className="badge-glow-dot"></span>
                                            {order.status === 'pending' && "Chờ xử lý"}
                                            {order.status === 'approved' && "Đã duyệt"}
                                            {order.status === 'rejected' && "Đã hủy"}
                                        </span>
                                    </td>
                                </tr>
                            ))}

                            {orders.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="empty-history-cell">
                                        <div className="empty-history-view">
                                            <span className="empty-icon-bunny">🐰</span>
                                            <p>Bạn chưa có giao dịch hoàn tiền nào được ghi nhận.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {loading && (
                                <tr>
                                    <td colSpan="6" className="loading-history-cell">
                                        <div className="pulse-loader"></div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <FloatingCarrots />
        </div>
    );
};

export default History;