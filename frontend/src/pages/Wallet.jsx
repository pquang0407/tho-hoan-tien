import React, { useState, useEffect } from "react";
import "../assets/styles/Wallet.css";
import FloatingCarrots from "../components/FloatingCarrots";

const Wallet = ({ user }) => {
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountHolder, setAccountHolder] = useState("");

    // State quản lý lịch sử rút tiền
    const [withdrawHistory, setWithdrawHistory] = useState([]);

    const banks = [
        "Vietcombank", "Techcombank", "MB Bank", "BIDV", "VietinBank",
        "ACB", "VPBank", "Sacombank", "TPBank", "Momo", "ZaloPay"
    ];

    const fetchWallet = async () => {
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
        try {
            const res = await fetch(`${API}/api/user/wallet?email=${user.email}`);
            const data = await res.json();
            setBalance(data.balance || 0);
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
        if (val > balance) return alert("Số dư không đủ");
        if (!bankName || !accountNumber || !accountHolder) return alert("Vui lòng điền đầy đủ thông tin ngân hàng");

        // Xác nhận Yes/No trước khi rút
        const isConfirm = window.confirm(`Bạn có chắc chắn muốn rút ${val.toLocaleString()}đ về tài khoản ${bankName} không?`);
        if (!isConfirm) return;

        // Câu thông báo dễ thương khi chọn Yes
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
                // Tải lại dữ liệu ví và lịch sử sau khi rút thành công
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

            <div className="wallet-grid">
                <div className="bento-item wallet-main-card">
                    <div className="bento-info">
                        <span>Số dư khả dụng</span>
                        <h1>{balance.toLocaleString()}đ</h1>
                        <div className="progress-container">
                            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                        </div>
                        <p>{balance < 100000 ? `Còn thiếu ${(100000 - balance).toLocaleString()}đ để rút` : "Đã đủ điều kiện rút tiền!"}</p>
                    </div>
                </div>

                <div className="withdrawal-form admin-data-section">
                    <h3>Yêu cầu rút tiền</h3>
                    <input type="number" placeholder="Số tiền (min 100.000đ)" value={amount} onChange={(e) => setAmount(e.target.value)} />

                    <select className="wallet-select" onChange={(e) => setBankName(e.target.value)} value={bankName}>
                        <option value="">-- Chọn ngân hàng --</option>
                        {banks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>

                    <input type="text" placeholder="Số tài khoản" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                    <input type="text" placeholder="Tên chủ tài khoản" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} />

                    <button className="btn-bubbly-primary full-width" onClick={handleWithdraw}>Gửi yêu cầu rút tiền</button>
                </div>
            </div>

            {/* --- BẢNG LỊCH SỬ RÚT TIỀN CỦA USER --- */}
            <div className="admin-data-section" style={{ marginTop: '40px', padding: '30px', borderRadius: '30px', background: 'white' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>📜 Lịch sử rút tiền</h3>
                <div className="wallet-table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="wallet-history-table">
                        <thead>
                            <tr>
                                <th>Thời Gian</th>
                                <th>Số Tiền</th>
                                <th>Ngân Hàng Nhận</th>
                                <th>Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {withdrawHistory.map((w, i) => (
                                <tr key={i}>
                                    <td style={{ color: '#64748b' }}>{w.date}</td>
                                    <td style={{ fontWeight: 'bold', color: '#1e293b' }}>{w.amount.toLocaleString()}đ</td>
                                    <td style={{ color: '#475569', fontSize: '14px' }}>{w.bank}</td>
                                    <td>
                                        {w.status === "pending" && <span className="status-badge pending">⏳ Đang chờ duyệt</span>}
                                        {w.status === "approved" && <span className="status-badge approved">✅ Đã chuyển khoản</span>}
                                        {w.status === "rejected" && <span className="status-badge rejected">❌ Đã từ chối</span>}
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
