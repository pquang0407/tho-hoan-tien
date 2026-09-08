import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/About.css";
import FloatingCarrots from "../components/FloatingCarrots";
import rabbit from "../assets/images/rabbit.png";

const About = ({ user }) => {
    const navigate = useNavigate();
    const guideRef = useRef(null);

    const userEmail = user?.email;

    return (
        <div className="about-container cute-theme">
            {/* --- HERO SECTION --- */}
            <section className="hero-split slide-up-delay-1" style={{ paddingTop: '20px' }}>
                <div className="hero-content-left">
                    <div className="pill-badge floating-slow">✨ Bí kíp Săn Deal & Voucher</div>
                    <h1 className="hero-title-bubbly">
                        Săn Deal & Voucher Giảm Giá <br /> lên đến <span className="text-orange gradient-text">80% ưu đãi</span>
                    </h1>
                    <p className="hero-text-soft">
                        Vẫn chốt đơn hàng ngày trên các sàn TMĐT quen thuộc, chỉ cần dán link qua Thỏ Săn Deal để rinh ngay phần ưu đãi & voucher tích lũy siêu hấp dẫn! 🎁
                    </p>
                    <div className="action-group">
                        <button
                            className="btn-bubbly-primary shadow-hover giant-btn"
                            onClick={() =>
                                userEmail
                                    ? navigate("/dashboard")
                                    : navigate("/login")
                            }
                        >
                            Bắt đầu chốt đơn ➔
                        </button>
                        <button
                            className="btn-bubbly-outline shadow-hover giant-btn"
                            onClick={() =>
                                guideRef.current?.scrollIntoView({
                                    behavior: "smooth"
                                })
                            }
                        >
                            Xem cách chơi
                        </button>
                    </div>
                </div>
                <div className="hero-visual-right">
                    <div className="floating-rabbit-box">
                        <img
                            src={rabbit}
                            alt="Rabbit"
                            className="hero-rabbit floating"
                        />
                        <div className="mini-badge badge-1 bouncing-slow">🛍️ Shopee</div>
                        <div className="mini-badge badge-2 bouncing-delayed">🎁 TikTok Shop</div>
                        <div className="mini-badge badge-3 bouncing-slow">💙 Lazada</div>
                    </div>
                </div>
            </section>

            {/* --- BENTO BOX STATISTICS --- */}
            <section className="stats-bento-section slide-up-delay-2">
                <div className="header-center">
                    <span className="pill-badge">🍄 Cộng đồng Thỏ Săn Deal</span>
                    <h2>Cộng đồng săn deal mỗi ngày</h2>
                </div>
                <div className="bento-grid">
                    <div className="bento-card bg-peach-gradient shadow-hover">
                        <div className="icon-wrapper bouncing">🐰</div>
                        <h3 className="bento-stat-num">1,200+</h3>
                        <p className="bento-stat-label">Thợ săn gia nhập cộng đồng</p>
                    </div>
                    <div className="bento-card bg-mint-gradient shadow-hover">
                        <div className="icon-wrapper bouncing-delayed">📦</div>
                        <h3 className="bento-stat-num">25k+</h3>
                        <p className="bento-stat-label">Lượt săn deal thành công</p>
                    </div>
                    <div className="bento-card bg-yellow-gradient shadow-hover">
                        <div className="icon-wrapper floating">🎁</div>
                        <h3 className="bento-stat-num gradient-text">142M+</h3>
                        <p className="bento-stat-label">Ưu đãi & Voucher đã nhận</p>
                    </div>
                </div>
            </section>

            {/* --- INSTRUCTIONS TIMELINE --- */}
            <section ref={guideRef} className="zigzag-steps-section slide-up-delay-3">
                <div className="header-center">
                    <span className="pill-badge">🐾 3 Bước Săn Deal & Voucher</span>
                    <h2>Nhận mã giảm giá cực nhanh chóng</h2>
                </div>
                <div className="timeline-container">
                    <div className="timeline-item left">
                        <div className="timeline-dot shadow-hover">1</div>
                        <div className="timeline-content bubble-card">
                            <h4>Nhắm trúng sản phẩm 🎯</h4>
                            <p>Sao chép đường dẫn (link) sản phẩm bạn muốn mua từ ứng dụng Shopee, Lazada hoặc TikTok Shop.</p>
                        </div>
                    </div>
                    <div className="timeline-item right">
                        <div className="timeline-dot shadow-hover">2</div>
                        <div className="timeline-content bubble-card">
                            <h4>Dán link lấy mã qua Thỏ ✨</h4>
                            <p>Dán link vào công cụ chuyển đổi trên trang Bảng điều khiển, Thỏ sẽ tìm ngay link mua hàng chứa voucher giảm giá tốt nhất cho bạn.</p>
                        </div>
                    </div>
                    <div className="timeline-item left">
                        <div className="timeline-dot shadow-hover">3</div>
                        <div className="timeline-content bubble-card">
                            <h4>Chốt đơn & Nhận voucher quà tặng 🌾</h4>
                            <p>Tiến hành đặt mua qua link săn deal. Điểm thưởng tích lũy sẽ được tự động cộng vào Ví Thỏ để bạn đổi voucher & quà tặng!</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CALL TO ACTION --- */}
            <section className="cta-bubble-section slide-up-delay-5">
                <div className="cta-bubble-content">
                    <h2>Săn deal & nhận voucher ngay hôm nay! 🎁</h2>
                    <p>Thao tác đơn giản chưa tới 10 giây giúp bạn tiết kiệm hàng triệu đồng mua sắm mỗi tháng.</p>
                    <button
                        className="btn-bubbly-primary large-btn shadow-hover"
                        onClick={() =>
                            user
                                ? navigate("/dashboard")
                                : navigate("/login")
                        }
                    >
                        Khám phá Thỏ Săn Deal ngay ➔
                    </button>
                    {/* --- FOOTER CHÍNH SÁCH --- */}
                    <footer className="about-footer-nav">
                        <span className="policy-link-hover" onClick={() => navigate("/privacy-policy")}>
                            Chính sách bảo mật & Điều khoản sử dụng
                        </span>
                    </footer>
                </div>
            </section>
            
            <FloatingCarrots />
        </div>
    );
};

export default About;