import cn from "classnames";
import styles from "./Select.module.css";

export type SelectOption = string | { value: string; label: string };

export function normalizeOption(option: SelectOption): { value: string; label: string } {
    return typeof option === "string" ? { value: option, label: option } : option;
}

// Bare `<select>`, no label/wrapper — drop it inline next to buttons in a
// flex row. `SelectField` wraps this with a label for the common stacked
// case; use this directly when you need a compact one-line layout instead.
export function Select({
    value,
    onChange,
    options,
    disabled,
    className,
    title,
}: {
    value?: string | null;
    onChange: (value: string) => void;
    options: readonly SelectOption[];
    disabled?: boolean;
    className?: string;
    title?: string;
}) {
    const safe = value ?? "";
    return (
        <select
            className={cn(styles.select, className)}
            disabled={disabled}
            value={safe}
            title={title}
            onChange={(e) => onChange(e.target.value)}>
            {options.map(normalizeOption).map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}
