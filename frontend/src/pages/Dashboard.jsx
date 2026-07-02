import React, { useState } from 'react';
import { auth } from "../firebase";
import '../assets/styles/Dashboard.css';

const Dashboard = ({ changePage }) => {
    const [activeTab, setActiveTab] = useState('shopee');
    const [linkInput, setLinkInput] = useState('');
    const [isConverting, setIsConverting] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    const handleConvert = async () => {
        if (!linkInput) return;

        setIsConverting(true);
        setShowResult(false);
        setError("");

        const user = auth.currentUser;

        if (!user) {
            alert("Vui lòng đăng nhập");
            return;
        }

        try {
            const res = await fetch("https://tho-hoan-tien-backend.onrender.com/api/convert", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_email: user.email,
                    original_url: linkInput,
                    platform: activeTab,
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Có lỗi xảy ra");
            }

            setResult(data);
            setShowResult(true);

        } catch (err) {
            setError(err.message);
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
                    onClick={() => changePage("about")}
                >
                    <span className="back-icon">←</span> Về trang chủ
                </button>
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

            {/* Báo lỗi (Đã thêm CSS cho phần này) */}
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

                        <div className="cashback-estimate">
                            <div className="estimate-left">
                                <span className="estimate-label">Bé thỏ nhặt được (Dự kiến) ⓘ</span>
                                <div className="estimate-amount">
                                    ≈ {result.commission.cashback.toLocaleString()}đ
                                </div>
                                <div className="original-price">
                                    Giá sản phẩm: {result.product.price.toLocaleString()}đ
                                </div>
                            </div>
                            <div className="estimate-percent">
                                {result.commission.cashback_percent}%
                            </div>
                        </div>

                        <div className="cashback-note">
                            <b>Lưu ý từ Hang Thỏ 🐾</b>
                            <p>
                                Số tiền hoàn được ước tính theo mức hoa hồng hiện tại.
                                Khoản hoàn cuối cùng sẽ được xác nhận sau khi đơn hàng
                                được AccessTrade và sàn thương mại duyệt thành công.
                            </p>
                        </div>

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
        </div>
    );
};

export default Dashboard;