import type { CSSProperties, ReactNode } from "react";
import cn from "classnames";
import styles from "./RangeField.module.css";

// Always controlled (unlike the old inline `defaultValue` sliders) so the
// displayed position stays correct when the value changes from outside the
// slider itself — e.g. loading a different saved preset.
export function RangeField({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    color,
}: {
    label: ReactNode;
    value?: number | null;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
    // Optional color-coded fill (e.g. green/amber/red by value) — when set,
    // the fill is painted as a gradient directly on the native track (and
    // echoed as the thumb's glow via the same CSS var) instead of separate
    // overlay divs, so the thumb and the fill can never drift out of sync.
    color?: string;
}) {
    // legacy graphs may miss the param entirely — never crash on undefined
    const safe = value ?? min;
    const percent = ((safe - min) / (max - min)) * 100;

    return (
        <div className={styles.fld}>
            <span>{label}</span>
            {/* Matches the control-row height of TextField/SelectField/etc.
                (padding + line-height there works out to ~36px) so a thin
                slider track centers at the same y as a tall <select>, rather
                than sitting flush under the label. */}
            <div className={styles.controlRow}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={safe}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={cn(color && styles.coloredInput)}
                    style={
                        color
                            ? ({
                                  "--range-color": color,
                                  "--range-percent": `${percent}%`,
                              } as CSSProperties)
                            : undefined
                    }
                />
            </div>
        </div>
    );
}
