import { Select, type SelectOption } from "../Select/Select.tsx";
import styles from "./SelectField.module.css";

export type { SelectOption };

export function SelectField({
    label,
    value,
    onChange,
    options,
    disabled,
    title,
    error,
}: {
    label: string;
    value?: string | null;
    onChange: (value: string) => void;
    options: readonly SelectOption[];
    disabled?: boolean;
    title?: string;
    error?: string;
}) {
    return (
        <div className={styles.fld} title={title}>
            <span>{label}</span>
            <Select
                value={value}
                onChange={onChange}
                options={options}
                disabled={disabled}
                className={error ? styles.isInvalid : undefined}
            />
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
