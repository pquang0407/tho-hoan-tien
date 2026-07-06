import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../assets/styles/Dashboard.css';
import FloatingCarrots from "../components/FloatingCarrots";

// Beautiful SVG Icons
const BackIcon = () => (
    <svg className="btn-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
    </svg>
);

const LockIcon = () => (
    <svg className="btn-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
    </svg>
);

const ClipboardIcon = () => (
    <svg className="paste-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
    </svg>
);

const CheckCircleIcon = () => (
    <svg className="success-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
);

const WarningIcon = () => (
    <svg className="warning-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
    </svg>
);

const Dashboard = ({ user }) => {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState("shopee");
    const [linkInput, setLinkInput] = useState("");
    const [isConverting, setIsConverting] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    if (!user) {
        navigate("/login");
        return null;
    }

    const handleConvert = async () => {
        if (!linkInput) return;

        setIsConverting(true);
        setShowResult(false);
        setError("");

        try {
            const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
            const res = await fetch(
                `${API}/api/convert`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        user_email: user.email,
                        original_url: linkInput,
                        platform: activeTab,
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Có lỗi xảy ra");
            }

            setResult(data);
            setShowResult(true);
        } catch (err) {
            console.error(err);

            if (err.message === "Failed to fetch") {
                setError("Hệ thống không phản hồi. Vui lòng kiểm tra lại liên kết sản phẩm.");
            } else {
                setError(`${err.message}`);
            }
        } finally {
            setIsConverting(false);
        }
    };

    const adminEmails = [
        import.meta.env.VITE_ADMIN_EMAIL,
        import.meta.env.VITE_ADMIN_EMAIL2
    ].filter(Boolean);

    const isAdmin = user && adminEmails.includes(user.email);

    return (
        <div className="dashboard-container">
            {/* Header Navigation */}
            <div className="dashboard-header">
                <div className="dashboard-header-left">
                    <button
                        className="btn-back bubbly-hover"
                        onClick={() => navigate("/")}
                    >
                        <BackIcon />
                        <span>Trang Chủ</span>
                    </button>
                </div>
                <h1 className="page-title-main">Chuyển đổi link hoàn tiền ✨</h1>
            </div>

            {/* Inspirational Quote Card */}
            <div className="quote-box">
                <p>“Vẫn mua sắm trên các sàn bạn thích, chỉ thêm một bước nhỏ qua hang Thỏ để rinh về khoản hoa hồng tích lũy cực lớn từ mỗi đơn hàng.”</p>
                <span className="quote-author">Thỏ Hoàn Tiền 🐰</span>
            </div>

            {/* Platform Selection Tabs */}
            <div className="platform-tabs">
                <button
                    className={`tab-btn ${activeTab === 'shopee' ? 'active' : ''}`}
                    onClick={() => setActiveTab('shopee')}
                >
                    <span className="tab-icon">🛍️</span> Shopee
                </button>
                <button
                    className={`tab-btn ${activeTab === 'lazada' ? 'active' : ''}`}
                    onClick={() => setActiveTab('lazada')}
                >
                    <span className="tab-icon">💙</span> Lazada
                </button>
                <button
                    className={`tab-btn ${activeTab === 'tiktok' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tiktok')}
                >
                    <span className="tab-icon">🎵</span> TikTok Shop
                    <span className="beta-tag-new">HOT</span>
                </button>
            </div>

            {/* Input Conversion Box */}
            <div className="converter-box">
                <label className="converter-input-label">Dán link sản phẩm muốn mua vào đây:</label>
                <div className="input-wrapper">
                    <ClipboardIcon />
                    <input
                        type="text"
                        placeholder={
                            activeTab === "shopee"
                                ? "https://shopee.vn/product-name.i.12345..."
                                : activeTab === "lazada"
                                    ? "https://www.lazada.vn/products/name-i12345..."
                                    : "https://shop.tiktok.com/view/product/1234567..."
                        }
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                    />
                    {linkInput && (
                        <button className="clear-btn" onClick={() => setLinkInput('')}>✕</button>
                    )}
                    <button
                        className={`btn-convert ${isConverting ? 'loading' : ''}`}
                        onClick={handleConvert}
                        disabled={isConverting || !linkInput}
                    >
                        {isConverting ? 'Thỏ đang nhai link...' : '✨ Tạo link hoàn tiền'}
                    </button>
                </div>
            </div>

            {/* Error Notification Alert */}
            {error && (
                <div className="error-box slide-up">
                    <WarningIcon />
                    <span>🐰 Ôi! {error}</span>
                </div>
            )}

            {/* Result Showcase Card */}
            {showResult && result && (
                <div className="result-area slide-up">
                    <div className="result-header">
                        <h3>Liên kết của bạn đã sẵn sàng! 🎉</h3>
                    </div>

                    <div className="result-card">
                        <div className="success-status">
                            <CheckCircleIcon />
                            <span>ĐÃ GẮN MÃ HOÀN TIỀN THÀNH CÔNG</span>
                        </div>

                        <div className="product-info">
                            <img
                                src={result.product.image}
                                alt={result.product.name}
                                className="product-img"
                            />
                            <div className="product-details">
                                <h4 className="product-details-title">{result.product.name}</h4>
                            </div>
                        </div>

                        {/* Cashback Estimation details */}
                        <div className="cashback-estimate">
                            <div className="estimate-left">
                                <span className="estimate-label">Hoa hồng tích lũy ước tính ⓘ</span>
                                <div className="estimate-amount highlight-gradient-text">
                                    ≈ {Number(result.commission.cashback || 0).toLocaleString("vi-VN")} đ
                                </div>
                                <div className="original-price">
                                    Giá bán trên sàn: {Number(result.product.price || 0).toLocaleString("vi-VN")}đ
                                </div>
                            </div>
                        </div>

                        {/* Terms and conditions info */}
                        <div className="cashback-note">
                            <b>Lưu ý từ Hang Thỏ 🐾</b>
                            <p>
                                Số tiền hoàn bên trên là mức <strong>ước tính tối đa</strong>. Số tiền tích lũy thực tế nhận được có thể thay đổi tùy thuộc vào ngành hàng, ưu đãi của sàn, và việc bạn có áp dụng mã giảm giá khác lúc thanh toán hay không.
                            </p>
                        </div>

                        {/* Main Call to Action buttons */}
                        <button
                            className="btn-open-link bubbly-hover"
                            onClick={() => window.open(result.links.short, "_blank")}
                        >
                            🛍️ Đi đến sàn chốt đơn ngay
                        </button>

                        <div className="action-footer">
                            <button
                                className="btn-secondary-action bubbly-hover"
                                onClick={() => {
                                    navigator.clipboard.writeText(result.links.short);
                                    alert("Đã sao chép link rút gọn thành công!");
                                }}
                            >
                                📋 Sao chép link
                            </button>
                            <button
                                className="btn-secondary-action bubbly-hover"
                                onClick={() => alert("QR Code đang được tạo, bạn chờ xíu nhé!")}
                            >
                                📱 Tạo mã QR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <FloatingCarrots />
        </div>
    );
};

export default Dashboard;