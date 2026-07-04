import React, { useState, useEffect } from "react";
import "../assets/styles/Admin.css"; // Dùng chung CSS cho đồng bộ
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

    return (
        <div className="history-page fade-up">
            <h1 className="page-title">📜 Lịch sử mua hàng</h1>

            <div className="admin-data-section">
                <div className="table-responsive-wrapper">
                    <table className="custom-admin-table">
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Ngày mua</th>
                                <th>Nền tảng</th>
                                <th>Giá trị đơn</th>
                                <th>Hoàn tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order, i) => (
                                <tr key={i} className="table-row-hover">
                                    <td>
                                        <div className="product-cell">
                                            <strong>{order.product_name}</strong>
                                        </div>
                                    </td>
                                    <td className="time-cell">
                                        {order.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : '--'}
                                    </td>
                                    <td>
                                        <span className={`merchant-badge ${order.platform?.toLowerCase()}`}>
                                            {order.platform}
                                        </span>
                                    </td>
                                    <td className="amount-cell">{parseFloat(order.product_price || 0).toLocaleString()}đ</td>
                                    <td className="commission-cell">+{parseFloat(order.cashback || 0).toLocaleString()}đ</td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="empty-table-cell">
                                        <div className="empty-state">
                                            <p>Bạn chưa có đơn hàng nào.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <>
                <FloatingCarrots />
            </>
        </div>
    );
};

export default History;