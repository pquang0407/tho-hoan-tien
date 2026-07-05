import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../assets/styles/Dashboard.css';
import FloatingCarrots from "../components/FloatingCarrots";

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
            // Bác nhớ check xem link API này đã đổi thành link local hay deploy nhé
            const res = await fetch(
                "https://tho-hoan-tien-backend.onrender.com/api/convert",
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
                setError("🐰 Gãy răng thỏ rồi! Link không được hoàn tiền.");
            } else {
                setError(`🐰 Gãy răng thỏ rồi! ${err.message}`);
            }
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <button
                    className="btn-back bubbly-hover"
                    onClick={() => navigate("/")}
                >
                    <span className="back-icon">←</span> Về trang chủ
                </button>
                {user?.email === "admin@gmail.com" && (
                    <button
                        className="btn-back bubbly-hover"
                        onClick={() => navigate("/admin")}
                    >
                        🔒 Admin
                    </button>
                )}
                <h1 className="page-title">Chuyển đổi link ✨</h1>
            </div>

            {/* Quote */}
            <div className="quote-box">
                <p>“Cùng nhau chia sẻ sản phẩm, cùng nhau tích lũy hoa hồng, và cùng nhau tạo thêm giá trị từ mỗi đơn hàng được ghi nhận.”</p>
                <span className="quote-author">THỎ - HOÀN TIỀN</span>
            </div>

            {/* Platform Tabs */}
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
                    <span className="beta-tag">BETA</span>
                </button>
            </div>

            {/* Input Box */}
            <div className="converter-box">
                <label>Link sản phẩm cần chuyển đổi</label>
                <div className="input-wrapper">
                    <span className="paste-icon">📋</span>
                    <input
                        type="text"
                        placeholder={
                            activeTab === "shopee"
                                ? "https://shopee.vn/..."
                                : activeTab === "lazada"
                                    ? "https://www.lazada.vn/..."
                                    : "https://shop.tiktok.com/..."
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
                        {isConverting ? 'Đang nhai link 🐰...' : '✨ Chuyển đổi'}
                    </button>
                </div>
            </div>

            {/* Báo lỗi */}
            {error && (
                <div className="error-box slide-up">
                    <span className="error-icon">⚠️</span> {error}
                </div>
            )}

            {/* Result Area */}
            {showResult && result && (
                <div className="result-area slide-up">
                    <div className="result-header">
                        <h3>Kết quả của bạn đây! 🎉</h3>
                    </div>

                    <div className="result-card">
                        <div className="success-status">
                            <span className="check-icon">✓</span> CHUYỂN ĐỔI THÀNH CÔNG
                        </div>

                        <div className="product-info">
                            <img
                                src={result.product.image}
                                alt={result.product.name}
                                className="product-img"
                            />
                            <div className="product-details">
                                <h4>{result.product.name}</h4>
                            </div>
                        </div>

                        {/* --- ĐÃ SỬA LẠI KHÚC NÀY ĐỂ RÀO TRƯỚC VỤ HOA HỒNG DỰ KIẾN --- */}
                        <div className="cashback-estimate">
                            <div className="estimate-left">
                                <span className="estimate-label">Hoa hồng dự kiến ⓘ</span>
                                <div className="estimate-amount">
                                    Lên đến {result.commission.cashback.toLocaleString()}đ
                                </div>
                                <div className="original-price">
                                    Giá sản phẩm: {result.product.price.toLocaleString()}đ
                                </div>
                            </div>

                            <div className="estimate-percent" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9, marginBottom: '-4px' }}>Tối đa</span>
                                <span style={{ fontSize: '28px' }}>{result.commission.cashback_percent}%</span>
                            </div>
                        </div>

                        <div className="cashback-note">
                            <b>Lưu ý từ Hang Thỏ 🐾</b>
                            <p>
                                Con số trên là mức hoàn tiền <strong>dự kiến tối đa</strong>. Số tiền thực tế nhận được có thể thay đổi thấp hơn tùy thuộc vào ngành hàng, tài khoản mua hàng (mới/cũ) và chính sách hoa hồng của sàn tại thời điểm bạn chốt đơn.
                            </p>
                        </div>
                        {/* ------------------------------------------------------------- */}

                        <button
                            className="btn-open-link bubbly-hover"
                            onClick={() => window.open(result.links.short, "_blank")}
                        >
                            🔗 Mở link chốt đơn ngay
                        </button>

                        <div className="action-footer">
                            <button
                                className="btn-secondary-action bubbly-hover"
                                onClick={() => navigator.clipboard.writeText(result.links.short)}
                            >
                                📋 Sao chép link
                            </button>
                            <button className="btn-secondary-action bubbly-hover">
                                📱 Lưu QR Code
                            </button>
                        </div>
                    </div>
                </div>

            )}
            <>
                <FloatingCarrots />
            </>
        </div>
    );
};

export default Dashboard;