import React, { useState, useEffect } from "react";
import "../assets/styles/Wallet.css";
import FloatingCarrots from "../components/FloatingCarrots";

// Elegant SVGs
const ArrowUpRightIcon = () => (
    <svg className="btn-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
    </svg>
);

const Wallet = ({ user }) => {
    const [balance, setBalance] = useState(0);
    const [pending, setPending] = useState(0);
    const [withdrawn, setWithdrawn] = useState(0);
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
            setPending(data.pending || 0);
            setWithdrawn(data.withdrawn || 0);
        } catch (err) {
            console.error("Lỗi ví:", err);
        }
    };

    const fetchHistory = async () => {
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
        try {
            const res = await fetch(`${API}/api/user/withdrawals/history?email=${user.email}`);
            const data = await res.json();
            if (data.success) {
                setWithdrawHistory(data.data || []);
            }
        } catch (err) {
            console.error("Lỗi lịch sử rút:", err);
        }
    };

    useEffect(() => {
        if (user?.email) {
            fetchWallet();
            fetchHistory();
        }
    }, [user]);

    const handleWithdraw = async () => {
        const val = parseFloat(amount);
        if (!amount || isNaN(val)) return alert("Vui lòng nhập số tiền hợp lệ!");
        if (val < 100000) return alert("Số tiền rút tối thiểu là 100.000đ");
        if (val > balance) return alert("Số dư khả dụng không đủ. Vui lòng đợi các đơn hàng chờ duyệt được hoàn tất.");
        if (!bankName || !accountNumber || !accountHolder) return alert("Vui lòng điền đầy đủ thông tin ngân hàng");

        const isConfirm = window.confirm(`Bạn có chắc chắn muốn rút ${val.toLocaleString("vi-VN")}đ về tài khoản ${bankName} không?`);
        if (!isConfirm) return;

        alert("Yêu cầu rút tiền đang được xử lý, Thỏ đang thực hiện chuyển khoản cho bạn 🐰🥕");

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
        <div className="wallet-page fade-in">
            <h1 className="page-title">💰 Ví Tiền Hoàn Tích Lũy</h1>

            {/* Stats Row Bento Card Container */}
            <div className="wallet-stats-grid">
                {/* Pending balance card */}
                <div className="wallet-stat-card card-pending">
                    <div className="stat-card-title">⏳ Đang chờ duyệt</div>
                    <h2 className="stat-card-value text-amber">{pending.toLocaleString("vi-VN")}đ</h2>
                    <p className="stat-card-desc">Tiền hoa hồng tạm tính từ đơn hàng mới phát sinh. Chờ đối soát từ sàn TMĐT.</p>
                </div>

                {/* Available balance card */}
                <div className="wallet-stat-card card-available">
                    <div className="stat-card-title text-white-opacity">✅ Số dư khả dụng</div>
                    <h2 className="stat-card-value text-white">{balance.toLocaleString("vi-VN")}đ</h2>
                    <div className="progress-bar-container-new">
                        <div className="progress-bar-fill-new" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="stat-card-desc text-white-opacity-soft">
                        {balance < 100000 
                            ? `Cần thêm ${(100000 - balance).toLocaleString("vi-VN")}đ nữa để rút tiền (Tối thiểu 100.000đ)` 
                            : "Đã đạt hạn mức tối thiểu! Bạn có thể rút tiền ngay."}
                    </p>
                </div>

                {/* Total withdrawn card */}
                <div className="wallet-stat-card card-withdrawn">
                    <div className="stat-card-title">💸 Tổng đã rút</div>
                    <h2 className="stat-card-value text-blue">{withdrawn.toLocaleString("vi-VN")}đ</h2>
                    <p className="stat-card-desc">Tổng số tiền hoàn tích lũy bạn đã thực hiện rút thành công về tài khoản.</p>
                </div>
            </div>

            {/* Form Section Container */}
            <div className="wallet-grid-layout">
                <div className="withdrawal-form-card">
                    <h3 className="withdrawal-form-title">Tạo yêu cầu rút tiền</h3>
                    <div className="withdrawal-form-inputs">
                        <div className="form-group-item">
                            <label className="input-label-styled">Số tiền cần rút</label>
                            <input 
                                type="number" 
                                placeholder="Số tiền (VND, tối thiểu 100.000đ)" 
                                value={amount} 
                                onChange={(e) => setAmount(e.target.value)} 
                                className="styled-input-field"
                            />
                        </div>
                        <div className="form-group-item">
                            <label className="input-label-styled">Chọn ngân hàng nhận</label>
                            <div className="select-wrapper-custom">
                                <select className="wallet-select" onChange={(e) => setBankName(e.target.value)} value={bankName}>
                                    <option value="">-- Chọn ngân hàng --</option>
                                    {banks.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group-item">
                            <label className="input-label-styled">Số tài khoản</label>
                            <input 
                                type="text" 
                                placeholder="Nhập số tài khoản ngân hàng" 
                                value={accountNumber} 
                                onChange={(e) => setAccountNumber(e.target.value)} 
                                className="styled-input-field"
                            />
                        </div>
                        <div className="form-group-item">
                            <label className="input-label-styled">Tên chủ tài khoản</label>
                            <input 
                                type="text" 
                                placeholder="VIET HOA KHONG DAU (Ví dụ: NGUYEN VAN A)" 
                                value={accountHolder} 
                                onChange={(e) => setAccountHolder(e.target.value)} 
                                className="styled-input-field"
                            />
                        </div>
                    </div>
                    <button className="btn-bubbly-primary full-width-btn" onClick={handleWithdraw}>
                        <ArrowUpRightIcon />
                        <span>Gửi yêu cầu rút tiền</span>
                    </button>
                </div>
            </div>

            {/* History Table Container */}
            <div className="wallet-history-section mt-40">
                <h3 className="history-section-title">📜 Lịch sử rút tiền</h3>
                <div className="history-table-wrapper-responsive">
                    <table className="premium-history-table">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Số tiền rút</th>
                                <th>Ngân hàng nhận</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {withdrawHistory.map((w, i) => (
                                <tr key={i} className="history-table-row">
                                    <td className="time-col">{w.date}</td>
                                    <td className="amount-col">{w.amount.toLocaleString("vi-VN")}đ</td>
                                    <td className="bank-col">{w.bank}</td>
                                    <td>
                                        <span className={`status-badge ${w.status === 'pending' ? 'waiting' : w.status === 'approved' ? 'approved' : 'rejected'}`}>
                                            <span className="badge-glow-dot"></span>
                                            {w.status === "pending" && "Đang chờ duyệt"}
                                            {w.status === "approved" && "Đã chuyển khoản"}
                                            {w.status === "rejected" && "Bị từ chối"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {withdrawHistory.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="empty-history-cell">
                                        <div className="empty-history-view">
                                            <span className="empty-icon-bunny">🐰</span>
                                            <p>Bạn chưa có giao dịch rút tiền nào được tạo.</p>
                                        </div>
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