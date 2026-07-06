import React from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/PrivacyPolicy.css";

// SVG Back Arrow Icon
const BackIcon = () => (
    <svg className="btn-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
    </svg>
);

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="policy-page fade-in">
            {/* Header Sticky Bar */}
            <div className="policy-header">
                <button className="btn-back bubbly-hover" onClick={() => navigate("/")}>
                    <BackIcon />
                    <span>Về trang chủ</span>
                </button>
            </div>

            {/* Document Content */}
            <div className="policy-content">
                <h1 className="policy-title">Chính sách bảo mật</h1>
                <p className="policy-subtitle">
                    Cập nhật lần cuối: 27/04/2026. Chính sách này mô tả cách Thỏ Hoàn Tiền thu thập, sử dụng và bảo vệ dữ liệu cá nhân khi người dùng sử dụng website, thực hiện liên kết Google và nhận thông báo giao dịch.
                </p>

                <div className="policy-card-item">
                    <h3 className="policy-card-title">1. Mục đích của ứng dụng</h3>
                    <p className="policy-card-text">
                        Thỏ Hoàn Tiền là nền tảng hỗ trợ người dùng chuyển đổi các đường dẫn mua sắm (Shopee, Lazada, TikTok Shop) thành liên kết tiếp thị liên kết (affiliate). Hệ thống ghi nhận đơn hàng, đối soát hoa hồng và tự động tích lũy số dư để hoàn lại phần lớn tiền hoa hồng cho người đặt mua.
                    </p>
                </div>

                <div className="policy-card-item">
                    <h3 className="policy-card-title">2. Dữ liệu thu thập</h3>
                    <p className="policy-card-text">
                        Chúng tôi thu thập email, tên hiển thị, hình ảnh đại diện Google khi bạn đăng ký/đăng nhập. Ngoài ra, hệ thống lưu giữ lịch sử tạo link rút gọn, đơn hàng phát sinh, số dư tích lũy khả dụng, tổng số tiền đã rút và thông tin tài khoản ngân hàng để thực hiện đối soát và chi trả phần thưởng.
                    </p>
                </div>

                <div className="policy-card-item">
                    <h3 className="policy-card-title">3. Cách sử dụng thông tin</h3>
                    <p className="policy-card-text">
                        Dữ liệu thu thập được sử dụng để xác thực tài khoản, ghi nhận và đồng bộ các đơn hàng hoàn tiền từ AccessTrade, kiểm soát tính minh bạch của số dư, xử lý các yêu cầu rút tiền về ngân hàng của thành viên và hỗ trợ kỹ thuật khi gặp sự cố đơn hàng.
                    </p>
                </div>

                <div className="policy-card-item">
                    <h3 className="policy-card-title">4. Cam kết bảo mật & Chia sẻ dữ liệu</h3>
                    <p className="policy-card-text">
                        Chúng tôi cam kết <strong>KHÔNG</strong> bán, cho thuê hoặc chia sẻ dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích thương mại. Thông tin chỉ được chuyển đến đối tác affiliate (AccessTrade/Sàn TMĐT) nhằm đối soát khớp đơn hàng hoàn tiền và các cơ quan pháp luật khi có yêu cầu chính thức.
                    </p>
                </div>

                <div className="policy-card-item">
                    <h3 className="policy-card-title">5. Lưu trữ và Xóa dữ liệu</h3>
                    <p className="policy-card-text">
                        Thông tin của bạn được lưu trữ an toàn trên hệ thống cơ sở dữ liệu Firestore của Google Firebase. Người dùng có quyền yêu cầu trích xuất thông tin hoặc xóa vĩnh viễn tài khoản cá nhân cùng các dữ liệu liên quan bằng cách gửi yêu cầu hỗ trợ qua các kênh chính thức của Thỏ Hoàn Tiền.
                    </p>
                </div>

                <div className="policy-card-item">
                    <h3 className="policy-card-title">6. Quyền lợi và Nghĩa vụ thành viên</h3>
                    <p className="policy-card-text">
                        Thành viên hiểu rõ số tiền hoàn hiển thị lúc chuyển đổi link là số dư ước tính. Hoa hồng thực tế sẽ được phê duyệt và cộng vào số dư khả dụng sau khi sàn TMĐT hoàn tất đối soát chu kỳ (thường từ 30 - 45 ngày) và không phát sinh yêu cầu đổi trả, hủy đơn hàng.
                    </p>
                </div>

                <div className="policy-card-item">
                    <h3 className="policy-card-title">7. Thông tin liên hệ</h3>
                    <p className="policy-card-text">
                        Nếu có bất kỳ thắc mắc nào liên quan đến Chính sách bảo mật hoặc các khiếu nại về tiền hoàn đơn hàng, vui lòng gửi email về địa chỉ hiển thị trong phần thông tin đăng ký hoặc nhắn tin trực tiếp qua các nhóm cộng đồng chính thức của chúng tôi.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;