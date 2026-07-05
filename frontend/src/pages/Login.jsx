import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/Login.css";
import FloatingCarrots from "../components/FloatingCarrots";
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const Login = () => {
    const navigate = useNavigate();
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false);

    const handleGoogleLogin = async () => {
        if (!isAgreed) return; // Bảo vệ 2 lớp
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            navigate("/");
        } catch (error) {
            console.error(error);
            alert("Đăng nhập thất bại!");
        }
    };

    // Hàm kiểm tra User đã cuộn xuống cuối chưa
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        // Cộng thêm 2px sai số làm tròn của một số trình duyệt
        if (scrollTop + clientHeight >= scrollHeight - 2) {
            setHasScrolledToBottom(true);
        }
    };

    return (
        <div className="login-container cute-theme">
            {/* --- NỬA TRÁI: BANNER THÔNG ĐIỆP --- */}
            <div className="login-left">
                <div className="login-brand">
                    <span className="brand-icon floating">🐰</span>
                    <div className="brand-text">
                        <strong>Thỏ – hoàn tiền</strong>
                        <span>Đăng nhập nhanh để lưu cà rốt</span>
                    </div>
                </div>

                <div className="login-hero-text slide-right">
                    <h1>Đăng nhập một lần,<br />theo dõi hoa hồng dễ hơn mỗi ngày.</h1>
                    <p>Chỉ cần gmail. Không cần mật khẩu, không mất thời gian làm quen lại từ đầu.</p>
                </div>

                <div className="login-quote floating-slow">
                    <p>“Hoa hồng được cộng dồn từ những chia sẻ đều đặn, và chúng tôi muốn đồng hành cùng bạn trên chặng đường nhặt cà rốt đó.”</p>
                    <span className="quote-author">THỎ - HOÀN TIỀN</span>
                </div>
            </div>

            {/* --- NỬA PHẢI: FORM ĐĂNG NHẬP --- */}
            <div className="login-right">
                <div className="back-link-wrapper">
                    <a href="#" className="back-link bubbly-hover" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
                        <span className="back-arrow">←</span> Về trang giới thiệu
                    </a>
                </div>

                <div className="login-card slide-up">
                    <div className="login-header">
                        <h2>Đăng nhập với Google 🌸</h2>
                        <p>Vui lòng đọc điều khoản để bắt đầu nhặt cà rốt.</p>
                    </div>

                    {/* --- KHUNG CHÍNH SÁCH BẢO MẬT CUỘN ĐƯỢC --- */}
                    <div className={`policy-scroll-box ${hasScrolledToBottom ? 'scrolled' : ''}`} onScroll={handleScroll}>
                        <strong>Chính sách bảo mật Thỏ Hoàn Tiền</strong>
                        <p>1. <b>Mục đích:</b> Chúng tôi là công cụ hỗ trợ chuyển đổi liên kết affiliate để ghi nhận hoa hồng mua sắm.</p>
                        <p>2. <b>Thu thập dữ liệu:</b> Lưu email, ảnh đại diện Google, và lịch sử tạo link/đơn hàng của bạn.</p>
                        <p>3. <b>Chia sẻ & Bảo mật:</b> Chúng tôi cam kết KHÔNG bán dữ liệu cá nhân. Thông tin chỉ dùng để vận hành trả thưởng và đối soát với sàn thương mại điện tử.</p>
                        <p>4. <b>Quyền lợi:</b> Bằng việc sử dụng hệ thống, bạn hiểu rõ hoa hồng là số tiền ước tính và sẽ được thanh toán sau khi sàn duyệt thành công.</p>
                        <br />
                        <p style={{ textAlign: 'center', fontWeight: 'bold', color: '#f27b8a' }}><i>(Bạn đã đọc hết nội dung)</i></p>
                    </div>

                    {/* --- CHECKBOX XÁC NHẬN --- */}
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
                            <span style={{ color: 'var(--orange-primary)', cursor: 'pointer', marginLeft: '4px' }} onClick={() => navigate("/privacy-policy")}>
                                Chính sách bảo mật
                            </span>
                        </label>
                    </div>

                    {/* --- NÚT ĐĂNG NHẬP --- */}
                    <button
                        className={`btn-google full-width bubbly-hover ${!isAgreed ? 'btn-disabled' : ''}`}
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={!isAgreed}
                    >
                        <svg className="google-icon bouncing-soft" width="22" height="22" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        Đăng nhập bằng Google
                    </button>

                    {!hasScrolledToBottom && (
                        <p style={{ fontSize: '12px', color: '#e11d48', marginTop: '12px', fontWeight: '600' }}>
                            * Vui lòng cuộn đọc hết chính sách phía trên để Đăng nhập.
                        </p>
                    )}
                </div>
            </div>
            <FloatingCarrots />
        </div>
    );
};

export default Login;