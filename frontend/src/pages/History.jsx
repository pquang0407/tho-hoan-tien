import React, { useState, useEffect } from "react";
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

    // Hàm chuyển đổi Campaign ID thành tên nền tảng cho đẹp
    const getPlatformName = (merchantStr) => {
        if (!merchantStr) return "Khác";
        if (merchantStr === "6648523843406889655" || merchantStr.toLowerCase().includes("tiktok")) return "TikTok";
        if (merchantStr.toLowerCase().includes("shopee")) return "Shopee";
        if (merchantStr.toLowerCase().includes("lazada")) return "Lazada";
        return merchantStr;
    };

    return (
        <div className="fade-up" style={{ maxWidth: '1100px', margin: '0 auto', padding: '30px 20px', paddingBottom: '80px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>📜 Lịch sử hoàn tiền</h1>
            <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '30px' }}>Theo dõi các đơn hàng và tiến độ duyệt hoa hồng của bạn</p>

            <div style={{ background: 'white', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '16px 20px', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Mã đơn hàng</th>
                            <th style={{ padding: '16px 20px', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Ngày mua</th>
                            <th style={{ padding: '16px 20px', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Nền tảng</th>
                            <th style={{ padding: '16px 20px', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Giá trị đơn</th>
                            <th style={{ padding: '16px 20px', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Hoa hồng</th>
                            <th style={{ padding: '16px 20px', borderBottom: '2px solid #f1f5f9', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order, i) => (
                            <tr key={i} style={{ transition: '0.2s', borderBottom: '1px solid #f8fafc' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                <td style={{ padding: '16px 20px' }}>
                                    <code style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', color: '#475569', fontWeight: 600 }}>{order.order_id || 'N/A'}</code>
                                </td>
                                <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '14px' }}>
                                    {order.time ? new Date(order.time).toLocaleString('vi-VN') : '--'}
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                    <span style={{
                                        background: getPlatformName(order.merchant) === 'TikTok' ? '#111' : getPlatformName(order.merchant) === 'Shopee' ? '#ffedd5' : '#e0f2fe',
                                        color: getPlatformName(order.merchant) === 'TikTok' ? '#fff' : getPlatformName(order.merchant) === 'Shopee' ? '#ea580c' : '#0284c7',
                                        padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 700
                                    }}>
                                        {getPlatformName(order.merchant)}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 20px', color: '#1e293b', fontWeight: 600 }}>
                                    {parseFloat(order.amount || 0).toLocaleString()}đ
                                </td>
                                <td style={{ padding: '16px 20px', color: '#10b981', fontWeight: 800 }}>
                                    +{parseFloat(order.cashback || 0).toLocaleString()}đ
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                    {order.status === 'pending' && <span style={{ background: '#fef3c7', color: '#b45309', padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 700 }}>⏳ Chờ xử lý</span>}
                                    {order.status === 'approved' && <span style={{ background: '#dcfce7', color: '#15803d', padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 700 }}>✅ Đã duyệt</span>}
                                    {order.status === 'rejected' && <span style={{ background: '#fee2e2', color: '#be123c', padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 700 }}>❌ Đã hủy</span>}
                                </td>
                            </tr>
                        ))}

                        {orders.length === 0 && !loading && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                                    <p style={{ margin: 0, fontSize: '15px' }}>Bạn chưa có giao dịch hoàn tiền nào.</p>
                                </td>
                            </tr>
                        )}

                        {loading && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '60px 20px' }}>
                                    <div style={{ width: '40px', height: '40px', background: '#f27b8a', borderRadius: '50%', margin: '0 auto', animation: 'pulse 1.5s infinite' }}></div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <FloatingCarrots />
        </div>
    );
};

export default History;