import React from "react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button style={styles.backBtn} onClick={() => navigate("/")}>
                    <span style={{ marginRight: '8px' }}>←</span> Về trang chủ
                </button>
            </div>

            <div style={styles.content}>
                <h1 style={styles.title}>Chính sách bảo mật</h1>
                <p style={styles.subtitle}>
                    Cập nhật lần cuối: 27/04/2026. Chính sách này mô tả cách Thỏ Hoàn Tiền thu thập, sử dụng và bảo vệ dữ liệu khi người dùng sử dụng website, đăng nhập Google và nhận email hệ thống.
                </p>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>1. Mục đích của ứng dụng</h3>
                    <p style={styles.cardText}>Thỏ Hoàn Tiền là công cụ hỗ trợ người dùng chuyển đổi liên kết mua sắm từ các sàn thương mại điện tử thành liên kết affiliate để hệ thống ghi nhận đơn hàng, theo dõi hoa hồng và chia lại tiền hoàn cho người dùng.</p>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>2. Dữ liệu chúng tôi thu thập</h3>
                    <p style={styles.cardText}>Chúng tôi có thể lưu email, tên hiển thị, ảnh đại diện Google, lịch sử chuyển đổi link, đơn hàng affiliate, số dư hoàn tiền, thông tin rút tiền và tùy chọn thông báo của người dùng. Với Gmail API, hệ thống chỉ dùng quyền gửi email để gửi OTP, xác thực tài khoản và thông báo giao dịch.</p>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>3. Cách sử dụng dữ liệu</h3>
                    <p style={styles.cardText}>Dữ liệu được dùng để xác thực đăng nhập, gửi email hệ thống, ghi nhận đơn hàng, tính tiền hoàn, xử lý yêu cầu rút tiền, chăm sóc tài khoản và bảo vệ hệ thống khỏi gian lận.</p>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>4. Chia sẻ dữ liệu</h3>
                    <p style={styles.cardText}>Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ khi cần vận hành dịch vụ, tuân thủ pháp luật, xử lý thanh toán/rút tiền, hoặc làm việc với các nền tảng affiliate liên quan đến đơn hàng của người dùng.</p>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>5. Bảo mật và lưu trữ</h3>
                    <p style={styles.cardText}>Chúng tôi áp dụng các biện pháp hợp lý để bảo vệ dữ liệu, giới hạn quyền truy cập nội bộ và chỉ lưu dữ liệu trong thời gian cần thiết cho mục đích vận hành, đối soát, kế toán hoặc tuân thủ pháp luật.</p>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>6. Quyền của người dùng</h3>
                    <p style={styles.cardText}>Người dùng có thể yêu cầu xem, cập nhật hoặc xóa dữ liệu cá nhân bằng cách liên hệ đội ngũ hỗ trợ. Một số dữ liệu giao dịch có thể cần được lưu lại để phục vụ đối soát, chống gian lận hoặc nghĩa vụ pháp lý.</p>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>7. Liên hệ</h3>
                    <p style={styles.cardText}>Nếu có câu hỏi về chính sách bảo mật hoặc dữ liệu cá nhân, vui lòng liên hệ qua email hỗ trợ được hiển thị trên trang OAuth consent hoặc kênh hỗ trợ chính thức của Thỏ Hoàn Tiền.</p>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: "#fcfcfc", minHeight: "100vh", color: "#333", paddingBottom: "60px" },
    header: { padding: "20px 40px", backgroundColor: "white", borderBottom: "1px solid #eaeaea", position: "sticky", top: 0, zIndex: 10 },
    backBtn: { background: "none", border: "none", color: "#f27b8a", fontWeight: "bold", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center" },
    content: { maxWidth: "800px", margin: "40px auto", padding: "0 20px" },
    title: { fontSize: "32px", fontWeight: "900", marginBottom: "10px" },
    subtitle: { fontSize: "15px", color: "#666", lineHeight: "1.6", marginBottom: "40px" },
    card: { backgroundColor: "white", border: "1px solid #f0f0f0", borderRadius: "16px", padding: "24px", marginBottom: "20px", boxShadow: "0 4px 15px rgba(0,0,0,0.02)" },
    cardTitle: { margin: "0 0 10px 0", fontSize: "18px", fontWeight: "800" },
    cardText: { margin: 0, fontSize: "15px", color: "#555", lineHeight: "1.6" }
};

export default PrivacyPolicy;