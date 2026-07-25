import styles from "./DateRangeField.module.css";

export function DateRangeField({
    fromLabel,
    toLabel,
    from,
    to,
    onChangeFrom,
    onChangeTo,
}: {
    fromLabel: string;
    toLabel: string;
    from: string;
    to: string;
    onChangeFrom: (value: string) => void;
    onChangeTo: (value: string) => void;
}) {
    return (
        <div className={styles.pair}>
            <div className={styles.fld}>
                <span>{fromLabel}</span>
                <input
                    type="datetime-local"
                    step={1}
                    value={from}
                    onChange={(e) => onChangeFrom(e.target.value)}
                />
            </div>
            <div className={styles.fld}>
                <span>{toLabel}</span>
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
