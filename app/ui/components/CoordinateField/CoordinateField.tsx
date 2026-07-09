import styles from "./CoordinateField.module.css";

export interface Coordinates {
    lat: number | null;
    lon: number | null;
}

function parseCoord(raw: string): number | null {
    return raw === "" ? null : Number(raw);
}

export function CoordinateField({
    label,
    value,
    onChange,
}: {
    label: string;
    value?: Coordinates | null;
    onChange: (value: Coordinates) => void;
}) {
    // legacy graphs may miss the param entirely — never crash on undefined
    const safe: Coordinates = value ?? { lat: null, lon: null };
    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <div className={styles.pair}>
                <input
                    type="number"
                    placeholder="Широта"
                    min={-90}
                    max={90}
                    step="any"
                    value={safe.lat ?? ""}
                    onChange={(e) => onChange({ ...safe, lat: parseCoord(e.target.value) })}
                />
                <input
                    type="number"
                    placeholder="Долгота"
                    min={-180}
                    max={180}
                    step="any"
                    value={safe.lon ?? ""}
                    onChange={(e) => onChange({ ...safe, lon: parseCoord(e.target.value) })}
                />
            </div>
        </div>
    );
}
