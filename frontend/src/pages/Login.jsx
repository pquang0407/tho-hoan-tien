import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/Login.css";
import FloatingCarrots from "../components/FloatingCarrots";
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// SVG Back Arrow Icon
const BackIcon = () => (
    <svg className="btn-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
    </svg>
);

const Login = () => {
    const navigate = useNavigate();
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false);

    const handleGoogleLogin = async () => {
        if (!isAgreed) return; // Second layer security check
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate("/");
        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            alert("Đăng nhập thất bại!");
        }
    };

    // Check if the user has scrolled to the bottom of the terms box
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        // Adjust for browser rounding issues (+2px)
        if (scrollTop + clientHeight >= scrollHeight - 2) {
            setHasScrolledToBottom(true);
        }
    };

    return (
        <div className="login-container cute-theme">
            {/* --- LEFT SIDE: BRAND BANNER PANEL --- */}
            <div className="login-left">
                <div className="login-brand">
                    <span className="brand-icon-bunny floating">🐰</span>
                    <div className="brand-text">
                        <strong>Thỏ Hoàn Tiền</strong>
                        <span>Tích lũy cà rốt từ mỗi đơn hàng</span>
                    </div>
                </div>

                <div className="login-hero-text slide-right">
                    <h1>Đăng nhập một lần,<br />tiết kiệm trọn đời.</h1>
                    <p>Đăng nhập bảo mật thông qua tài khoản Google. Không mật khẩu rườm rà, giao diện tối giản dễ sử dụng.</p>
                </div>

                <div className="login-quote floating-slow">
                    <p>“Cộng hưởng từ những đơn hàng nhỏ nhất, Thỏ giúp bạn thu lại phần hoa hồng xứng đáng để mua sắm thông thái hơn mỗi ngày.”</p>
                    <span className="quote-author">Thỏ Hoàn Tiền 🐰</span>
                </div>
            </div>

            {/* --- RIGHT SIDE: LOGIN FORM CARD --- */}
            <div className="login-right">
                <div className="back-link-wrapper">
                    <a href="#" className="back-link bubbly-hover" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
                        <BackIcon />
                        <span>Về trang chủ</span>
                    </a>
                </div>

                <div className="login-card slide-up">
                    <div className="login-header">
                        <h2>Đăng Nhập Hang Thỏ 🌸</h2>
                        <p>Vui lòng đọc điều khoản sử dụng bên dưới để bắt đầu.</p>
                    </div>

                    {/* --- SCROLLABLE PRIVACY POLICY WIDGET --- */}
                    <div className={`policy-scroll-box ${hasScrolledToBottom ? 'scrolled' : ''}`} onScroll={handleScroll}>
                        <strong>Chính sách điều khoản Thỏ Hoàn Tiền</strong>
                        <p>1. <b>Mục đích hoạt động:</b> Thỏ Hoàn Tiền hỗ trợ tích hợp link affiliate cá nhân để đối soát đơn hàng và chia sẻ hoàn tiền chiết khấu.</p>
                        <p>2. <b>Bảo mật thông tin:</b> Chúng tôi lưu email và lịch sử tạo link. Cam kết KHÔNG chia sẻ dữ liệu cho bên thứ ba ngoài việc đối soát hoa hồng.</p>
                        <p>3. <b>Thời gian đối soát:</b> Hoa hồng mua sắm hiển thị là mức ước tính, sẽ được sàn TMĐT phê duyệt chính thức sau 30-45 ngày.</p>
                        <p>4. <b>Chống gian lận:</b> Nghiêm cấm các hành vi đặt đơn ảo, bùng hàng nhằm trục lợi. Tài khoản vi phạm sẽ bị khóa vĩnh viễn.</p>
                        <br />
                        <p className="scrolled-end-text"><i>(Bạn đã đọc hết nội dung điều khoản)</i></p>
                    </div>

                    {/* --- TERMS CHECKBOX --- */}
                    <div className={`checkbox-wrapper ${!hasScrolledToBottom ? 'disabled' : ''}`}>
                        <input
                            type="checkbox"
                            id="agreeCheck"
                            disabled={!hasScrolledToBottom}
                            checked={isAgreed}
                            onChange={(e) => setIsAgreed(e.target.checked)}
                        />
                        <label htmlFor="agreeCheck">
                            Tôi đã đọc và đồng ý với 
                            <span className="policy-link-inline" onClick={() => navigate("/privacy-policy")}>
                                Chính sách bảo mật
                            </span>
                        </label>
                    </div>

                    {/* --- GOOGLE LOGIN BUTTON --- */}
                    <button
                        className={`btn-google full-width bubbly-hover ${!isAgreed ? 'btn-disabled' : ''}`}
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={!isAgreed}
                    >
                        <svg className="google-icon-svg bouncing-soft" width="22" height="22" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        <span>Đăng nhập bằng Google</span>
                    </button>

                    {!hasScrolledToBottom && (
                        <p className="scroll-warning-text">
                            * Vui lòng cuộn hết hộp điều khoản phía trên để kích hoạt Đăng nhập.
                        </p>
                    )}
                </div>
            </div>
            <FloatingCarrots />
        </div>
    );
};

export default Login;