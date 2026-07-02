import { useMemo, useState } from "react";
import carrot from "../assets/images/carrot_1.gif";
import coin from "../assets/images/coin.gif";
import "../assets/styles/FloatingCarrots.css";

const TOTAL = 5;

export default function FloatingCarrots() {
    const [explode, setExplode] = useState(Array(TOTAL).fill(false));

    const carrots = useMemo(
        () =>
            Array.from({ length: TOTAL }, () => ({
                left: 5 + Math.random() * 90,
                delay: Math.random() * 8,
                duration: 8 + Math.random() * 5,
                size: 32 + Math.random() * 12,
            })),
        []
    );

    const handleCatch = (i) => {
        if (explode[i]) return;

        const arr = [...explode];
        arr[i] = true;
        setExplode(arr);

        setTimeout(() => {
            arr[i] = false;
            setExplode([...arr]);
        }, 900);
    };

    return (
        <div className="carrot-container">
            {carrots.map((item, i) => (
                <div
                    key={i}
                    className={`carrot-wrapper ${explode[i] ? "explode" : ""}`}
                    style={{
                        left: `${item.left}%`,
                        width: item.size,
                        animationDelay: `${item.delay}s`,
                        animationDuration: `${item.duration}s`
                    }}
                    onMouseEnter={() => handleCatch(i)}
                >
                    <img src={carrot} className="carrot" alt="" />
                    <img src={coin} className="coin" alt="" />

                    <div className="money">+1đ</div>
                    <div className="spark">✨</div>
                </div>
            ))}
        </div>
    );
}