import { useId } from "react";
import styles from "@/ui/components/EmotionalCurvePreview/EmotionalCurvePreview.module.css";

// Rotates a line around the diagram's center by trend angle, then bends it
// into the selected curve shape via a cubic bezier — ported from the old
// Timeline "Scene Arc" tab so the node's Арка group keeps the same preview.
function getCurvePath(emotionalTrend: number, curveType: string) {
    const angleRad = (emotionalTrend * Math.PI) / 400;
    const dx = 150 * Math.cos(angleRad);
    const dy = 150 * Math.sin(angleRad);
    const cx = 225;
    const cy = 55;
    const x1 = cx - dx;
    const y1 = cy + dy;
    const x2 = cx + dx;
    const y2 = cy - dy;

    if (curveType === "ease_in") {
        return `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.55} ${y1}, ${x2 - (x2 - x1) * 0.15} ${y2 - (y2 - y1) * 0.1}, ${x2} ${y2}`;
    }
    if (curveType === "ease_out") {
        return `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.15} ${y1 + (y2 - y1) * 0.1}, ${x2 - (x2 - x1) * 0.55} ${y2}, ${x2} ${y2}`;
    }
    if (curveType === "ease_in_out") {
        return `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.45} ${y1}, ${x2 - (x2 - x1) * 0.45} ${y2}, ${x2} ${y2}`;
    }
    return `M ${x1} ${y1} L ${x2} ${y2}`;
}

export function EmotionalCurvePreview({
    emotionalTrend,
    curveType,
}: {
    emotionalTrend: number;
    curveType: string;
}) {
    // Unique per instance so <marker>/<pattern> ids never collide if two
    // instances render at once (e.g. two output_scene nodes multi-selected).
    const uid = useId();
    const arrowId = `curve-arrow-${uid}`;
    const gridId = `curve-grid-${uid}`;

    return (
        <div className={styles.emotionalBox}>
            <svg className={styles.emotionalSvg} viewBox="0 0 450 110">
                <defs>
                    <marker
                        id={arrowId}
                        viewBox="0 0 10 10"
                        refX="5"
                        refY="5"
                        markerWidth="5"
                        markerHeight="5"
                        orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-text-primary)" />
                    </marker>
                    <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
                        <path
                            d="M 20 0 L 0 0 0 20"
                            fill="none"
                            stroke="rgba(241, 239, 232, 0.03)"
                            strokeWidth="1"
                        />
                    </pattern>
                </defs>
                <rect width="450" height="110" fill={`url(#${gridId})`} />
                <path
                    d={getCurvePath(emotionalTrend, curveType)}
                    stroke="var(--color-text-primary)"
                    strokeWidth="2.5"
                    markerEnd={`url(#${arrowId})`}
                    fill="none"
                />
                <text x="25" y="100" className={styles.svgText} textAnchor="start">
                    Положительные
                </text>
                <text x="425" y="18" className={styles.svgText} textAnchor="end">
                    Негативные
                </text>
                <text x="225" y="60" className={styles.svgLabelText} textAnchor="middle">
                    Эмоциональная линия
                </text>
            </svg>
        </div>
    );
}
