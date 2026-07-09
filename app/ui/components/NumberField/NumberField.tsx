import styles from "./NumberField.module.css";

export function NumberField({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    disabled,
}: {
    label: string;
    value?: number | null;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}) {
    // legacy graphs may miss the param entirely — never crash on undefined
    const safe = value ?? 0;
    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={safe}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    );
}
