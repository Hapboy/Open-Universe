import cn from "classnames";
import styles from "./TextAreaField.module.css";

// Mirrors TextField's controlled/deferred-commit shape for multi-line text.
export function TextAreaField({
    label,
    value,
    defaultValue,
    onChange,
    onBlur,
    rows = 2,
    error,
}: {
    label: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    onBlur?: (value: string) => void;
    rows?: number;
    error?: string;
}) {
    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <textarea
                rows={rows}
                className={cn(error && styles.isInvalid)}
                {...(value !== undefined ? { value } : { defaultValue })}
                onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
            />
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
