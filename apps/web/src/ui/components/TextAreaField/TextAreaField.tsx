import cn from "classnames";
import { Textarea } from "@/ui/components/Textarea/Textarea.tsx";
import styles from "@/ui/components/TextAreaField/TextAreaField.module.css";

// Mirrors TextField's controlled/deferred-commit shape for multi-line text.
export function TextAreaField({
    label,
    value,
    defaultValue,
    onChange,
    onBlur,
    rows = 2,
    error,
    readOnly,
}: {
    label: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    onBlur?: (value: string) => void;
    rows?: number;
    error?: string;
    readOnly?: boolean;
}) {
    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <Textarea
                rows={rows}
                readOnly={readOnly}
                className={cn(error && styles.isInvalid)}
                {...(value !== undefined ? { value } : { defaultValue })}
                onChange={
                    readOnly ? undefined : onChange ? (e) => onChange(e.target.value) : undefined
                }
                onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
            />
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
