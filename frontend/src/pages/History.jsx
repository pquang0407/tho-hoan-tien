import React, { useState, useEffect } from "react";
import "../assets/styles/Admin.css"; // Dùng chung CSS với Admin cho đồng bộ UI
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
            console.error("Lỗi lấy lịch sử:", err);
        } finally {
            setLoading(false);
        }
    };

    // Hàm chuyển đổi Campaign ID thành tên nền tảng (Vì backend đang trả về ID)
    const getPlatformName = (merchantStr) => {
        if (!merchantStr) return "Khác";
        if (merchantStr === "6648523843406889655" || merchantStr.toLowerCase().includes("tiktok")) return "TikTok";
        if (merchantStr.toLowerCase().includes("shopee")) return "Shopee";
        if (merchantStr.toLowerCase().includes("lazada")) return "Lazada";
        return merchantStr;
    };

    return (
        <div className="history-page fade-up" style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 24px' }}>
            <div className="page-header">
                <h1>📜 Lịch sử hoàn tiền</h1>
                <p>Theo dõi các đơn hàng và tiến độ duyệt hoa hồng của bạn</p>
            </div>

            <div className="admin-data-section mt-30 p-0">
                <div className="table-wrapper">
                    <table className="at-table">
                        <thead>
                            <tr>
                                <th>MÃ ĐƠN HÀNG</th>
                                <th>NGÀY MUA</th>
                                <th>NỀN TẢNG</th>
                                <th>GIÁ TRỊ ĐƠN</th>
                                <th>HOA HỒNG</th>
                                <th>TRẠNG THÁI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, i) => (
                                <tr key={i}>
                                    <td>
                                        <div className="order-id-wrapper">
                                            <code className="order-id-code">{order.order_id || 'N/A'}</code>
                                        </div>
                                    </td>
                                    <td className="text-gray">
                                        {order.time ? new Date(order.time).toLocaleString('vi-VN') : '--'}
                                    </td>
                                    <td>
                                        <span className={`merchant-badge ${getPlatformName(order.merchant).toLowerCase()}`}>
                                            {getPlatformName(order.merchant)}
                                        </span>
                                    </td>
                                    <td className="amount-cell">{parseFloat(order.amount || 0).toLocaleString()}đ</td>
                                    <td className="text-green font-bold">+{parseFloat(order.cashback || 0).toLocaleString()}đ</td>
                                    <td>
                                        {order.status === 'pending' && <span className="status-dot pending">⏳ Chờ xử lý</span>}
                                        {order.status === 'approved' && <span className="status-dot approved">✅ Đã duyệt</span>}
                                        {order.status === 'rejected' && <span className="status-dot rejected">❌ Đã hủy</span>}
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="empty-state text-center">
                                        <div className="mailbox-icon">📭</div>
                                        <p>Bạn chưa có giao dịch mua hàng hoàn tiền nào.</p>
                                    </td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan="6" className="text-center" style={{ padding: '40px' }}>
                                        <div className="loader-pulse" style={{ margin: '0 auto' }}></div>
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