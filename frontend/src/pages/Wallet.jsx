import React, { useState, useEffect } from "react";
import "../assets/styles/Wallet.css";
import FloatingCarrots from "../components/FloatingCarrots";

const Wallet = ({ user }) => {
    const [balance, setBalance] = useState(0);
    const [pending, setPending] = useState(0); // THÊM STATE ĐỂ LƯU TIỀN PENDING
    const [withdrawn, setWithdrawn] = useState(0); // THÊM STATE ĐỂ LƯU TỔNG TIỀN ĐÃ RÚT
    const [amount, setAmount] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountHolder, setAccountHolder] = useState("");

    const [withdrawHistory, setWithdrawHistory] = useState([]);

    const banks = [
        "Vietcombank", "Techcombank", "MB Bank", "BIDV", "VietinBank",
        "ACB", "VPBank", "Sacombank", "TPBank", "Momo"
    ];

    const fetchWallet = async () => {
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
        try {
            const res = await fetch(`${API}/api/user/wallet?email=${user.email}`);
            const data = await res.json();
            setBalance(data.balance || 0);
            setPending(data.pending || 0); // LẤY TIỀN PENDING TỪ API
            setWithdrawn(data.withdrawn || 0); // LẤY TIỀN ĐÃ RÚT
        } catch (err) { console.error(err); }
    };

    const fetchHistory = async () => {
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
        try {
            const res = await fetch(`${API}/api/user/withdrawals/history?email=${user.email}`);
            const data = await res.json();
            if (data.success) {
                setWithdrawHistory(data.data);
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (user?.email) {
            fetchWallet();
            fetchHistory();
        }
    }, [user]);

    const handleWithdraw = async () => {
        const val = parseFloat(amount);
        if (val < 100000) return alert("Số tiền rút tối thiểu là 100.000đ");
        if (val > balance) return alert("Số dư khả dụng không đủ. Vui lòng đợi các đơn hàng chờ duyệt được hoàn tất.");
        if (!bankName || !accountNumber || !accountHolder) return alert("Vui lòng điền đầy đủ thông tin ngân hàng");

        const isConfirm = window.confirm(`Bạn có chắc chắn muốn rút ${val.toLocaleString()}đ về tài khoản ${bankName} không?`);
        if (!isConfirm) return;

        alert("Bạn đợi xíu, thỏ đang bank cà rốt cho bạn 🐰🥕");

        const fullBankInfo = `${bankName} - STK: ${accountNumber} - CTK: ${accountHolder}`;
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

        try {
            const res = await fetch(`${API}/api/withdrawals`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: user.email, amount: val, bank_info: fullBankInfo })
            });

            if (res.ok) {
                setAmount("");
                setAccountNumber("");
                setAccountHolder("");
                fetchWallet();
                fetchHistory();
            } else {
                const errorData = await res.json();
                alert(`Lỗi: ${errorData.detail}`);
            }
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra khi gửi yêu cầu.");
        }
    };

    const progress = Math.min((balance / 100000) * 100, 100);

    return (
        <div className="wallet-page fade-up">
            <h1 className="page-title">💰 Ví Tiền Hoàn</h1>

            {/* THIẾT KẾ LẠI KHỐI HIỂN THỊ VÍ ĐỂ MINH BẠCH TIỀN BẠC CHO USER */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}>⏳ ĐANG CHỜ DUYỆT</div>
                    <h2 style={{ fontSize: '28px', margin: 0, color: '#f59e0b' }}>{pending.toLocaleString()}đ</h2>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', lineHeight: 1.4 }}>Tiền từ các đơn hàng mới phát sinh. Cần chờ đối soát để rút.</p>
                </div>

                <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '24px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', opacity: 0.9 }}>✅ SỐ DƯ KHẢ DỤNG</div>
                    <h2 style={{ fontSize: '32px', margin: 0 }}>{balance.toLocaleString()}đ</h2>
                    <div style={{ background: 'rgba(255,255,255,0.2)', height: '6px', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                        <div style={{ background: 'white', width: `${progress}%`, height: '100%' }}></div>
                    </div>
                    <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.9 }}>{balance < 100000 ? `Cố lên! Còn ${(100000 - balance).toLocaleString()}đ nữa là rút được` : "Bạn đã có thể rút tiền!"}</p>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}>💸 TỔNG ĐÃ RÚT</div>
                    <h2 style={{ fontSize: '28px', margin: 0, color: '#3b82f6' }}>{withdrawn.toLocaleString()}đ</h2>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', lineHeight: 1.4 }}>Tổng số tiền bạn đã nhận thành công về tài khoản.</p>
                </div>
            </div>

            <div className="wallet-grid">
                <div className="withdrawal-form admin-data-section" style={{ gridColumn: 'span 2' }}>
                    <h3>Yêu cầu rút tiền</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <input type="number" placeholder="Số tiền (tối thiểu 100.000đ)" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        <select className="wallet-select" onChange={(e) => setBankName(e.target.value)} value={bankName}>
                            <option value="">-- Chọn ngân hàng --</option>
                            {banks.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <input type="text" placeholder="Số tài khoản" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                        <input type="text" placeholder="Tên chủ tài khoản" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />
                    </div>
                    <button className="btn-bubbly-primary full-width" style={{ marginTop: '20px' }} onClick={handleWithdraw}>🚀 Rút ngay cà rốt về túi</button>
                </div>
            </div>

            <div className="admin-data-section" style={{ marginTop: '40px', padding: '30px', borderRadius: '30px', background: 'white' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>📜 Lịch sử rút tiền</h3>
                <div className="wallet-table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="wallet-history-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '15px', borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>Thời Gian</th>
                                <th style={{ padding: '15px', borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>Số Tiền</th>
                                <th style={{ padding: '15px', borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>Ngân Hàng Nhận</th>
                                <th style={{ padding: '15px', borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {withdrawHistory.map((w, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '15px', color: '#64748b' }}>{w.date}</td>
                                    <td style={{ padding: '15px', fontWeight: 'bold', color: '#1e293b' }}>{w.amount.toLocaleString()}đ</td>
                                    <td style={{ padding: '15px', color: '#475569', fontSize: '14px' }}>{w.bank}</td>
                                    <td style={{ padding: '15px' }}>
                                        {w.status === "pending" && <span style={{ background: '#fef3c7', color: '#b45309', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>⏳ Đang chờ duyệt</span>}
                                        {w.status === "approved" && <span style={{ background: '#dcfce7', color: '#15803d', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>✅ Đã chuyển khoản</span>}
                                        {w.status === "rejected" && <span style={{ background: '#fee2e2', color: '#be123c', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>❌ Đã từ chối</span>}
                                    </td>
                                </tr>
                            ))}
                            {withdrawHistory.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                        Bạn chưa có giao dịch rút tiền nào.
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
export default Wallet;