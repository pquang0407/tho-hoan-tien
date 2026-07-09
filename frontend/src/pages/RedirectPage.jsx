import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const RedirectPage = ({ platform }) => {
    const { code } = useParams();
    const [status, setStatus] = useState("loading");
    const [errorMsg, setErrorMsg] = useState("");
    const [targetUrl, setTargetUrl] = useState("");

    const getPlatformConfig = () => {
        switch (platform) {
            case "shopee":
                return { name: "Shopee", color: "#ff5722", icon: "🛍️" };
            case "tiktok":
                return { name: "TikTok Shop", color: "#000000", icon: "🎵" };
            case "lazada":
                return { name: "Lazada", color: "#0f156d", icon: "💙" };
            default:
                return { name: "cửa hàng", color: "#ff8f00", icon: "✨" };
        }
    };

    const config = getPlatformConfig();

    useEffect(() => {
        const fetchRedirect = async () => {
            try {
                const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
                const res = await fetch(`${API}/api/redirect/${code}`);
                const data = await res.json();

                if (res.ok && data.success && data.long_url) {
                    setTargetUrl(data.long_url);
                    setStatus("redirecting");
                    
                    // Thực hiện chuyển hướng sau 1.5 giây để người dùng trải nghiệm hiệu ứng đẹp
                    setTimeout(() => {
                        window.location.href = data.long_url;
                    }, 1200);
                } else {
                    setStatus("error");
                    setErrorMsg(data.detail || "Đường liên kết không tồn tại hoặc đã hết hạn.");
                }
            } catch (err) {
                console.error(err);
                setStatus("error");
                setErrorMsg("Không thể kết nối đến máy chủ đối soát.");
            }
        };

        fetchRedirect();
    }, [code]);

    return (
        <div style={styles.container}>
            {/* Background elements */}
            <div style={styles.carrot1}>🥕</div>
            <div style={styles.carrot2}>🥕</div>

            <div style={styles.card}>
                {status === "loading" && (
                    <>
                        <div style={styles.bunnyContainer}>
                            <span style={styles.bunnyIcon}>🐰</span>
                        </div>
                        <h2 style={styles.title}>Thỏ đang nhai link...</h2>
                        <p style={styles.desc}>
                            Đang kết nối an toàn đến máy chủ đối soát hoàn tiền của <strong>{config.name}</strong> {config.icon}
                        </p>
                        <div style={styles.loaderLine}>
                            <div style={{ ...styles.loaderProgress, backgroundColor: config.color }}></div>
                        </div>
                    </>
                )}

                {status === "redirecting" && (
                    <>
                        <div style={{ ...styles.bunnyContainer, animation: "bounce 0.6s infinite alternate" }}>
                            <span style={styles.bunnyIconRedirect}>🚀</span>
                        </div>
                        <h2 style={{ ...styles.title, color: config.color }}>Chuyển hướng thành công!</h2>
                        <p style={styles.desc}>
                            Đang mở ứng dụng <strong>{config.name}</strong> để bạn chốt đơn và nhận hoàn tiền...
                        </p>
                        <a href={targetUrl} style={{ ...styles.manualBtn, backgroundColor: config.color }}>
                            Bấm vào đây nếu không tự chuyển hướng
                        </a>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div style={styles.errorIconContainer}>
                            <span style={styles.bunnyIcon}>⚠️</span>
                        </div>
                        <h2 style={{ ...styles.title, color: "#d32f2f" }}>Liên kết lỗi</h2>
                        <p style={styles.desc}>{errorMsg}</p>
                        <button onClick={() => window.close()} style={styles.closeBtn}>
                            Đóng cửa sổ này
                        </button>
                    </>
                )}
            </div>

            {/* Custom Keyframe Animations */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes bunnyHop {
                    0% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-15px) scale(0.95); }
                    100% { transform: translateY(0) scale(1); }
                }
                @keyframes floatCarrot {
                    0% { transform: translateY(0) rotate(0deg); }
                    50% { transform: translateY(-12px) rotate(15deg); }
                    100% { transform: translateY(0) rotate(0deg); }
                }
                @keyframes progressLoader {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
            `}} />
        </div>
    );
};

const styles = {
    container: {
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #ffeef2 0%, #fff6f0 50%, #fff9e6 100%)",
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
        margin: 0,
        padding: 0,
    },
    carrot1: {
        position: "absolute",
        top: "15%",
        left: "10%",
        fontSize: "3rem",
        opacity: 0.15,
        animation: "floatCarrot 3.5s ease-in-out infinite"
    },
    carrot2: {
        position: "absolute",
        bottom: "15%",
        right: "10%",
        fontSize: "3rem",
        opacity: 0.15,
        animation: "floatCarrot 4.2s ease-in-out infinite"
    },
    card: {
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "24px",
        padding: "40px",
        width: "90%",
        maxWidth: "420px",
        boxShadow: "0 20px 40px rgba(255, 120, 150, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02)",
        textAlign: "center",
        border: "1px solid rgba(255, 255, 255, 0.6)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    bunnyContainer: {
        width: "90px",
        height: "90px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #fff3f5 0%, #ffe3e7 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: "24px",
        animation: "bunnyHop 1.2s ease-in-out infinite",
        boxShadow: "0 8px 16px rgba(255, 100, 130, 0.05)"
    },
    errorIconContainer: {
        width: "90px",
        height: "90px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: "24px",
        boxShadow: "0 8px 16px rgba(211, 47, 47, 0.05)"
    },
    bunnyIcon: {
        fontSize: "2.8rem"
    },
    bunnyIconRedirect: {
        fontSize: "2.6rem"
    },
    title: {
        fontSize: "1.6rem",
        fontWeight: 700,
        color: "#2d201c",
        margin: "0 0 12px 0",
    },
    desc: {
        fontSize: "0.98rem",
        color: "#6e5f5b",
        lineHeight: 1.5,
        margin: "0 0 28px 0"
    },
    loaderLine: {
        width: "100%",
        height: "6px",
        background: "#f0eceb",
        borderRadius: "3px",
        overflow: "hidden",
        position: "relative"
    },
    loaderProgress: {
        height: "100%",
        width: "0%",
        borderRadius: "3px",
        animation: "progressLoader 1.5s linear forwards"
    },
    manualBtn: {
        display: "inline-block",
        color: "#fff",
        textDecoration: "none",
        fontWeight: 600,
        fontSize: "0.95rem",
        padding: "14px 24px",
        borderRadius: "14px",
        boxShadow: "0 6px 16px rgba(0, 0, 0, 0.1)",
        border: "none",
        cursor: "pointer",
        transition: "all 0.2s"
    },
    closeBtn: {
        backgroundColor: "#2d201c",
        color: "#fff",
        fontWeight: 600,
        fontSize: "0.95rem",
        padding: "14px 24px",
        borderRadius: "14px",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 6px 16px rgba(0,0,0,0.05)"
    }
};

export default RedirectPage;
