import cn from "classnames";
import { Input } from "@/ui/components/Input/Input.tsx";
import styles from "@/ui/components/NumberField/NumberField.module.css";

export function NumberField({
    label,
    value,
    min,
    max,
    step = 1,
    onChange,
    onBlur,
    disabled,
    error,
}: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: number) => void;
    onBlur?: () => void;
    disabled?: boolean;
    error?: string;
}) {
    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <Input
                type="number"
                className={cn(error && styles.isInvalid)}
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
                onBlur={onBlur}
            />
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
