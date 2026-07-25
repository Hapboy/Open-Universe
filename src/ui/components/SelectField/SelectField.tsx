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
}: {
    label: string;
    value?: string | null;
    onChange: (value: string) => void;
    options: readonly SelectOption[];
    disabled?: boolean;
    title?: string;
}) {
    return (
        <div className={styles.fld} title={title}>
            <span>{label}</span>
            <Select value={value} onChange={onChange} options={options} disabled={disabled} />
        </div>
    );
}
