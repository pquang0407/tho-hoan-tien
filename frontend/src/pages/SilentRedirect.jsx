import React, { useEffect } from "react";
import { useParams } from "react-router-dom";

const SilentRedirect = () => {
    const { code } = useParams();

    useEffect(() => {
        const doRedirect = async () => {
            try {
                const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
                const res = await fetch(`${API}/api/redirect/${code}`);
                const data = await res.json();
                
                if (res.ok && data.success && data.long_url) {
                    // Chuyển hướng lập tức
                    window.location.replace(data.long_url);
                } else {
                    // Nếu link lỗi, đưa về trang chủ
                    window.location.replace("/");
                }
            } catch (err) {
                console.error(err);
                window.location.replace("/");
            }
        };
        doRedirect();
    }, [code]);

    return null; // Trả về giao diện trống hoàn toàn
};

export default SilentRedirect;
