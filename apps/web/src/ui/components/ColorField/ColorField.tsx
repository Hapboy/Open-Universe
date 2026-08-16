import { Input } from "@/ui/components/Input/Input.tsx";
import styles from "@/ui/components/ColorField/ColorField.module.css";

export function ColorField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className={styles.fld}>
            <span>{label}</span>
            <Input
                type="color"
                value={value || "#000000"}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
