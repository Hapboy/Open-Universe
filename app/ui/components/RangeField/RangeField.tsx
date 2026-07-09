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
}: {
    label: string;
    value?: number | null;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
}) {
    // legacy graphs may miss the param entirely — never crash on undefined
    const safe = value ?? min;
    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={safe}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    );
}
