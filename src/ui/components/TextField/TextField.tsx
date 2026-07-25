import cn from "classnames";
import styles from "./TextField.module.css";

// Supports both interaction styles used across the app: fully controlled
// (`value` + `onChange`, fires every keystroke) and deferred-commit
// (`defaultValue` + `onBlur`, avoids a graph update per keystroke).
export function TextField({
    label,
    value,
    defaultValue,
    onChange,
    onBlur,
    disabled,
    placeholder,
    title,
    className,
    autoFocus,
    type = "text",
}: {
    label?: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    onBlur?: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    title?: string;
    className?: string;
    autoFocus?: boolean;
    type?: "text" | "password";
}) {
    return (
        <div className={cn(styles.fld, className)} title={title}>
            {label && <span>{label}</span>}
            <input
                type={type}
                disabled={disabled}
                placeholder={placeholder}
                autoFocus={autoFocus}
                {...(value !== undefined ? { value } : { defaultValue })}
                onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
            />
        </div>
    );
}
