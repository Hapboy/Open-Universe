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
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}) {
    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    );
}
