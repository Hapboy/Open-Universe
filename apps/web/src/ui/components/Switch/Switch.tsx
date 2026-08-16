import cn from "classnames";
import styles from "@/ui/components/Switch/Switch.module.css";

export function Switch({
    label,
    value,
    onChange,
    disabled,
    title,
}: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    title?: string;
}) {
    return (
        <div className={styles.fld} title={title}>
            <span>{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={value}
                disabled={disabled}
                className={cn(styles.track, "nodrag", value && styles.isOn)}
                onClick={() => onChange(!value)}>
                <span className={styles.thumb} />
            </button>
        </div>
    );
}
