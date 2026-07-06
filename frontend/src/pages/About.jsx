import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/About.css";
import FloatingCarrots from "../components/FloatingCarrots";
import rabbit from "../assets/images/rabbit.png";

const About = ({ user }) => {
    const navigate = useNavigate();
    const guideRef = useRef(null);
    const [leaderboard, setLeaderboard] = useState([]);

    const userEmail = user?.email;
    useEffect(() => {
        fetch("https://tho-hoan-tien-backend.onrender.com/api/leaderboard")
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data.success) {
                    setLeaderboard(data.data);
                }
            })
            .catch((err) => console.error(err));
    }, []);

    return (
        <div className="about-container cute-theme">

            {/* Đã xóa Navbar ngang ở đây để nhường chỗ cho Sidebar */}

            {/* --- HERO SECTION --- */}
            <section className="hero-split slide-up-delay-1" style={{ paddingTop: '20px' }}>
                <div className="hero-content-left">
                    <div className="pill-badge floating-slow">✨ Bí kíp nhặt cà rốt</div>
                    <h1 className="hero-title-bubbly">
                        Mua sắm nhận hoàn tiền <br /> lên đến <span className="text-orange gradient-text">80% hoa hồng</span>
                    </h1>
                    <p className="hero-text-soft">
                        Vẫn chốt đơn ầm ầm trên sàn quen thuộc, chỉ thêm một nhịp chuyển link qua hang Thỏ là bạn đã gom lại được phần hoa hồng siêu to khổng lồ! 🥕
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
                            Bắt đầu ngay ➔
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
                        <div className="mini-badge badge-1 bouncing">🛍️ Shopee</div>
                        <div className="mini-badge badge-2 bouncing-delayed">🎁 TikTok</div>
                        <div className="mini-badge badge-3 bouncing">💙 Lazada</div>
                    </div>
                </div>
            </section>

            {/* --- THỐNG KÊ BENTO BOX --- */}
            <section className="stats-bento-section slide-up-delay-2">
                <div className="header-center">
                    <span className="pill-badge">🍄 Đội quân thỏ bông</span>
                    <h2>Đang cặm cụi tích lũy mỗi ngày</h2>
                </div>
                <div className="bento-grid">
                    <div className="bento-card bg-peach shadow-hover">
                        <div className="icon-wrapper bouncing">🐰</div>
                        <h3>1,200+</h3>
                        <p>Thỏ con gia nhập hang</p>
                    </div>
                    <div className="bento-card bg-mint shadow-hover">
                        <div className="icon-wrapper bouncing-delayed">📦</div>
                        <h3>25k+</h3>
                        <p>Đơn hàng đã gom</p>
                    </div>
                    <div className="bento-card bg-yellow shadow-hover">
                        <div className="icon-wrapper floating">💰</div>
                        <h3 className="gradient-text">142M+</h3>
                        <p>Hoa hồng đã chia</p>
                    </div>
                </div>
            </section>

            {/* --- HƯỚNG DẪN TIMELINE --- */}
            <section ref={guideRef} className="zigzag-steps-section slide-up-delay-3">
                <div className="header-center">
                    <span className="pill-badge">🐾 Dấu chân thỏ</span>
                    <h2>3 nhịp đơn giản để có quà</h2>
                </div>
                <div className="timeline-container">
                    <div className="timeline-item left">
                        <div className="timeline-dot shadow-hover">1</div>
                        <div className="timeline-content bubble-card">
                            <h4>Nhắm trúng mục tiêu 🎯</h4>
                            <p>Copy link món đồ bạn ưng ý nhất từ Shopee, Lazada hay TikTok Shop.</p>
                        </div>
                    </div>
                    <div className="timeline-item right">
                        <div className="timeline-dot shadow-hover">2</div>
                        <div className="timeline-content bubble-card">
                            <h4>Phù phép link qua Thỏ ✨</h4>
                            <p>Dán link vào hệ thống, Thỏ sẽ nhai và nhả ra một chiếc link xịn xò đã gắn mã của bạn.</p>
                        </div>
                    </div>
                    <div className="timeline-item left">
                        <div className="timeline-dot shadow-hover">3</div>
                        <div className="timeline-content bubble-card">
                            <h4>Chốt đơn và đợi lúa về 🌾</h4>
                            <p>Bấm mua qua link vừa tạo. Tiền hoàn sẽ rủng rỉnh rơi vào túi bạn trong 24 giờ tới.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- TOP USERS PODIUM --- */}
            {/* --- TOP USERS PODIUM --- */}
            <section className="podium-section slide-up-delay-4">
                <div className="header-center">
                    <span className="pill-badge">🏆 Bảng vàng cà rốt</span>
                    <h2>Những tay đua kiệt xuất nhất</h2>
                </div>

                <div className="podium-cute">

                    {/* Hạng 2 */}
                    {leaderboard[1] && (
                        <div className="podium-stand silver">
                            <div className="avatar-bubble floating-slow">
                                {leaderboard[1].avatar ? (
                                    <img
                                        src={leaderboard[1].avatar}
                                        alt={leaderboard[1].name}
                                    />
                                ) : (
                                    leaderboard[1].name[0].toUpperCase()
                                )}
                            </div>

                            <span className="rank-emoji">🥈</span>

                            <div className="podium-info">
                                <strong>{leaderboard[1].name}</strong>
                                <p className="money">
                                    {leaderboard[1].cashback.toLocaleString()} đ
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Hạng 1 */}
                    {leaderboard[0] && (
                        <div className="podium-stand gold center-stand">
                            <div className="avatar-bubble giant bouncing">
                                {leaderboard[0].avatar ? (
                                    <img
                                        src={leaderboard[0].avatar}
                                        alt={leaderboard[0].name}
                                    />
                                ) : (
                                    leaderboard[0].name[0].toUpperCase()
                                )}
                            </div>

                            <span className="rank-emoji floating">👑</span>

                            <div className="podium-info">
                                <strong>{leaderboard[0].name}</strong>

                                <p className="money highlight gradient-text">
                                    {leaderboard[0].cashback.toLocaleString()} đ
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Hạng 3 */}
                    {leaderboard[2] && (
                        <div className="podium-stand bronze">
                            <div
                                className="avatar-bubble floating-slow"
                                style={{ animationDelay: "1s" }}
                            >
                                {leaderboard[2].avatar ? (
                                    <img
                                        src={leaderboard[2].avatar}
                                        alt={leaderboard[2].name}
                                    />
                                ) : (
                                    leaderboard[2].name[0].toUpperCase()
                                )}
                            </div>

                            <span className="rank-emoji">🥉</span>

                            <div className="podium-info">
                                <strong>{leaderboard[2].name}</strong>

                                <p className="money">
                                    {leaderboard[2].cashback.toLocaleString()} đ
                                </p>
                            </div>
                        </div>
                    )}

                </div>
            </section>

            {/* --- CALL TO ACTION BONG BÓNG --- */}
            <section className="cta-bubble-section slide-up-delay-5">
                <div className="cta-bubble-content">
                    <h2>Đừng để rơi rớt cà rốt nữa nhé! 🥕</h2>
                    <p>Chỉ một thao tác nhỏ xíu trước khi chốt đơn là bạn đã tiết kiệm được ối tiền rồi đó.</p>
                    <button
                        className="btn-bubbly-primary large-btn shadow-hover"
                        onClick={() =>
                            user
                                ? navigate("/dashboard")
                                : navigate("/login")
                        }
                    >
                        Tham gia hang thỏ ngay ➔
                    </button>
                    {/* --- FOOTER CHÍNH SÁCH --- */}
                    <footer style={{ textAlign: 'center', padding: '30px', marginTop: '20px', fontSize: '14px', color: '#ffffffff' }}>
                        <span style={{ cursor: 'pointer', fontWeight: 600 }} onClick={() => navigate("/privacy-policy")}>
                            Chính sách bảo mật & Điều khoản sử dụng
                        </span>
                    </footer>
                </div>

            </section>
            <>
                <FloatingCarrots />
            </>

        </div>
    );
};

export default About;