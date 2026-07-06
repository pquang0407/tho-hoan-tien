import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/About.css";
import FloatingCarrots from "../components/FloatingCarrots";
import rabbit from "../assets/images/rabbit.png";

const About = ({ user }) => {
    const navigate = useNavigate();
    const guideRef = useRef(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

    const userEmail = user?.email;
    
    useEffect(() => {
        const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
        setLoadingLeaderboard(true);
        fetch(`${API}/api/leaderboard`)
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    setLeaderboard(data.data || []);
                }
            })
            .catch((err) => {
                console.error("Lỗi lấy dữ liệu bảng xếp hạng:", err);
            })
            .finally(() => {
                setLoadingLeaderboard(false);
            });
    }, []);

    return (
        <div className="about-container cute-theme">
            {/* --- HERO SECTION --- */}
            <section className="hero-split slide-up-delay-1" style={{ paddingTop: '20px' }}>
                <div className="hero-content-left">
                    <div className="pill-badge floating-slow">✨ Bí kíp tích cà rốt</div>
                    <h1 className="hero-title-bubbly">
                        Mua sắm nhận hoàn tiền <br /> lên đến <span className="text-orange gradient-text">80% hoa hồng</span>
                    </h1>
                    <p className="hero-text-soft">
                        Vẫn chốt đơn hàng ngày trên các sàn TMĐT quen thuộc, chỉ cần dán link qua hang Thỏ để rinh ngay phần hoa hồng tích lũy siêu hấp dẫn! 🥕
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
                    <span className="pill-badge">🍄 Hang thỏ nhộn nhịp</span>
                    <h2>Cộng đồng đang tích lũy mỗi ngày</h2>
                </div>
                <div className="bento-grid">
                    <div className="bento-card bg-peach-gradient shadow-hover">
                        <div className="icon-wrapper bouncing">🐰</div>
                        <h3 className="bento-stat-num">1,200+</h3>
                        <p className="bento-stat-label">Thỏ con gia nhập hang</p>
                    </div>
                    <div className="bento-card bg-mint-gradient shadow-hover">
                        <div className="icon-wrapper bouncing-delayed">📦</div>
                        <h3 className="bento-stat-num">25k+</h3>
                        <p className="bento-stat-label">Đơn hàng hoàn tất</p>
                    </div>
                    <div className="bento-card bg-yellow-gradient shadow-hover">
                        <div className="icon-wrapper floating">💰</div>
                        <h3 className="bento-stat-num gradient-text">142M+</h3>
                        <p className="bento-stat-label">Tiền hoàn đã rút</p>
                    </div>
                </div>
            </section>

            {/* --- INSTRUCTIONS TIMELINE --- */}
            <section ref={guideRef} className="zigzag-steps-section slide-up-delay-3">
                <div className="header-center">
                    <span className="pill-badge">🐾 3 Bước Nhận Quà</span>
                    <h2>Nhận tiền hoàn cực nhanh chóng</h2>
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
                            <h4>Phù phép link qua Thỏ ✨</h4>
                            <p>Dán link vào công cụ chuyển đổi trên trang Bảng điều khiển, Thỏ sẽ tạo ngay link mua hàng gắn mã hoàn tiền dành riêng cho bạn.</p>
                        </div>
                    </div>
                    <div className="timeline-item left">
                        <div className="timeline-dot shadow-hover">3</div>
                        <div className="timeline-content bubble-card">
                            <h4>Chốt đơn & Rút ví rủng rỉnh 🌾</h4>
                            <p>Tiến hành đặt mua qua link hoàn tiền. Số tiền tích lũy sẽ được tự động cộng vào Ví Thỏ để bạn rút về tài khoản ngân hàng!</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- TOP LEADERBOARD PODIUM --- */}
            <section className="podium-section slide-up-delay-4">
                <div className="header-center">
                    <span className="pill-badge">🏆 Bảng vàng vinh danh</span>
                    <h2>Những thợ săn cà rốt đỉnh nhất</h2>
                </div>

                {loadingLeaderboard ? (
                    <div className="leaderboard-status-msg">
                        <div className="mini-pulse-dot"></div>
                        <span>Đang đồng bộ bảng vàng...</span>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="leaderboard-empty-box">
                        <span className="empty-icon">🐰</span>
                        <p>Bảng vàng đang đợi những đơn hàng đầu tiên được duyệt!</p>
                    </div>
                ) : (
                    <div className="podium-cute">
                        {/* Hạng 2 - Silver */}
                        {leaderboard[1] && (
                            <div className="podium-stand silver">
                                <div className="avatar-bubble floating-slow">
                                    {leaderboard[1].avatar ? (
                                        <img src={leaderboard[1].avatar} alt="avatar" />
                                    ) : (
                                        <span>{(leaderboard[1].name || leaderboard[1].email || "U")[0].toUpperCase()}</span>
                                    )}
                                </div>

                                <div className="rank-badge">🥈 Á Quân</div>

                                <div className="podium-info">
                                    <strong className="podium-username">{leaderboard[1].name || leaderboard[1].email?.split('@')[0]}</strong>
                                    <div className="money-pill">
                                        {Number(leaderboard[1].cashback || 0).toLocaleString("vi-VN")} đ
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Hạng 1 - Gold */}
                        {leaderboard[0] && (
                            <div className="podium-stand gold center-stand">
                                <div className="avatar-bubble giant bouncing">
                                    {leaderboard[0].avatar ? (
                                        <img src={leaderboard[0].avatar} alt="avatar" />
                                    ) : (
                                        <span>{(leaderboard[0].name || leaderboard[0].email || "U")[0].toUpperCase()}</span>
                                    )}
                                </div>

                                <div className="rank-badge gold-badge">👑 Quán Quân</div>

                                <div className="podium-info">
                                    <strong className="podium-username gold-user">{leaderboard[0].name || leaderboard[0].email?.split('@')[0]}</strong>
                                    <div className="money-pill highlight">
                                        {Number(leaderboard[0].cashback || 0).toLocaleString("vi-VN")} đ
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Hạng 3 - Bronze */}
                        {leaderboard[2] && (
                            <div className="podium-stand bronze">
                                <div className="avatar-bubble floating-slow" style={{ animationDelay: "1s" }}>
                                    {leaderboard[2].avatar ? (
                                        <img src={leaderboard[2].avatar} alt="avatar" />
                                    ) : (
                                        <span>{(leaderboard[2].name || leaderboard[2].email || "U")[0].toUpperCase()}</span>
                                    )}
                                </div>

                                <div className="rank-badge">🥉 Quý Quân</div>

                                <div className="podium-info">
                                    <strong className="podium-username">{leaderboard[2].name || leaderboard[2].email?.split('@')[0]}</strong>
                                    <div className="money-pill">
                                        {Number(leaderboard[2].cashback || 0).toLocaleString("vi-VN")} đ
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* --- CALL TO ACTION --- */}
            <section className="cta-bubble-section slide-up-delay-5">
                <div className="cta-bubble-content">
                    <h2>Đừng bỏ lỡ tiền hoàn từ hôm nay! 🥕</h2>
                    <p>Thao tác đơn giản chưa tới 10 giây giúp bạn tiết kiệm hàng triệu đồng mua sắm mỗi tháng.</p>
                    <button
                        className="btn-bubbly-primary large-btn shadow-hover"
                        onClick={() =>
                            user
                                ? navigate("/dashboard")
                                : navigate("/login")
                        }
                    >
                        Tham gia Hang Thỏ ngay ➔
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