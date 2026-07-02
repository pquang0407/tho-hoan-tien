import React, { useState } from "react";
import "../assets/styles/Login.css";

import { auth } from "../firebase";

import {
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";

const Login = ({ changePage, setIsLoggedIn }) => {
    const [email, setEmail] = useState('');

    const handleEmailLogin = (e) => {
        e.preventDefault();

        if (!email) return;

        localStorage.setItem("userEmail", email);
        localStorage.setItem("displayName", email.split("@")[0]);
        localStorage.removeItem("photoURL");

        setIsLoggedIn(true);

        // Quay về About
        changePage("about");
    };
    const handleGoogleLogin = async () => {
        try {

            const provider = new GoogleAuthProvider();

            const result = await signInWithPopup(auth, provider);

            const user = result.user;

            localStorage.setItem("userEmail", user.email || "");
            localStorage.setItem("displayName", user.displayName || "");
            localStorage.setItem("photoURL", user.photoURL || "");

            setIsLoggedIn(true);

            // Quay về trang About
            changePage("about");

        } catch (error) {

            console.error(error);

            alert("Đăng nhập thất bại!");

        }
    };

    return (
        <div className="login-container">
            {/* --- NỬA TRÁI: BANNER THÔNG ĐIỆP --- */}
            <div className="login-left">
                <div className="login-brand">
                    <span className="brand-icon">🐰</span>
                    <div className="brand-text">
                        <strong>Thỏ – hoàn tiền</strong>
                        <span>Đăng nhập nhanh để lưu cà rốt</span>
                    </div>
                </div>

                <div className="login-hero-text">
                    <h1>Đăng nhập một lần,<br />theo dõi hoa hồng dễ hơn mỗi ngày.</h1>
                    <p>Chỉ cần email để nhận mã OTP. Không cần mật khẩu, không mất thời gian làm quen lại từ đầu.</p>
                </div>

                <div className="login-quote">
                    <p>“Hoa hồng được cộng dồn từ những chia sẻ đều đặn, và chúng tôi muốn đồng hành cùng bạn trên chặng đường nhặt cà rốt đó.”</p>
                    <span className="quote-author">THỎ - HOÀN TIỀN</span>
                </div>
            </div>

            {/* --- NỬA PHẢI: FORM ĐĂNG NHẬP --- */}
            <div className="login-right">
                <div className="back-link-wrapper">
                    {/* Quay lại About */}
                    <a href="#" className="back-link" onClick={(e) => { e.preventDefault(); changePage('about'); }}>
                        ← Về trang giới thiệu
                    </a>
                </div>

                <div className="login-card">
                    <div className="login-header">
                        <h2>Chào mừng bạn quay lại 🌸</h2>
                        <p>Nhập email để nhận mã đăng nhập.</p>
                    </div>

                    <form className="login-form" onSubmit={handleEmailLogin}>
                        <div className="input-group">
                            <label>Địa chỉ email</label>
                            <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-bubbly-primary full-width">
                            <span className="btn-icon">✉️</span> Gửi mã đăng nhập
                        </button>
                    </form>

                    <div className="divider">
                        <span>hoặc</span>
                    </div>

                    <button className="btn-google full-width" type="button" onClick={handleGoogleLogin}>
                        <svg className="google-icon" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        Đăng nhập bằng Google
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;