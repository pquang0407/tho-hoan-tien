import React, { useState, useEffect } from "react";
import "../assets/styles/Wallet.css";
import FloatingCarrots from "../components/FloatingCarrots";

const Wallet = ({ user }) => {
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState("");
    const [bankName, setBankName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [accountHolder, setAccountHolder] = useState("");

    const banks = [
        "Vietcombank", "Techcombank", "MB Bank", "BIDV", "VietinBank",
        "ACB", "VPBank", "Sacombank", "TPBank", "Momo"
    ];

    useEffect(() => {
        const fetchWallet = async () => {
            const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const res = await fetch(`${API}/api/user/wallet?email=${user.email}`);
            const data = await res.json();
            setBalance(data.balance || 0);
        };
        fetchWallet();
    }, [user]);

    const handleWithdraw = async () => {
        const val = parseFloat(amount);
        if (val < 100000) return alert("Số tiền rút tối thiểu là 100.000đ");
        if (val > balance) return alert("Số dư không đủ");
        if (!bankName || !accountNumber || !accountHolder) return alert("Vui lòng điền đầy đủ thông tin ngân hàng");

        const fullBankInfo = `${bankName} - STK: ${accountNumber} - CTK: ${accountHolder}`;
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

        const res = await fetch(`${API}/api/withdrawals`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_email: user.email, amount: val, bank_info: fullBankInfo })
        });

        if (res.ok) alert("Gửi yêu cầu rút tiền thành công!");
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
                    <input type="number" placeholder="Số tiền (min 100.000đ)" onChange={(e) => setAmount(e.target.value)} />

                    {/* Chọn ngân hàng */}
                    <select className="wallet-select" onChange={(e) => setBankName(e.target.value)} value={bankName}>
                        <option value="">-- Chọn ngân hàng --</option>
                        {banks.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>

                    <input type="text" placeholder="Số tài khoản" onChange={(e) => setAccountNumber(e.target.value)} />
                    <input type="text" placeholder="Tên chủ tài khoản" onChange={(e) => setAccountHolder(e.target.value)} />

                    <button className="btn-bubbly-primary full-width" onClick={handleWithdraw}>Gửi yêu cầu rút tiền</button>
                </div>
            </div>
            <FloatingCarrots />
        </div>
    );
};
export default Wallet;