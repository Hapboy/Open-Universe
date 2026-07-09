import styles from "./DateRangeField.module.css";

export function DateRangeField({
    label,
    from,
    to,
    onChangeFrom,
    onChangeTo,
}: {
    label: string;
    from: string;
    to: string;
    onChangeFrom: (value: string) => void;
    onChangeTo: (value: string) => void;
}) {
    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <div className={styles.pair}>
                <input
                    type="datetime-local"
                    step={1}
                    value={from}
                    onChange={(e) => onChangeFrom(e.target.value)}
                />
                <input
                    type="datetime-local"
                    step={1}
                    value={to}
                    onChange={(e) => onChangeTo(e.target.value)}
                />
            </div>
        </div>
    );
}
