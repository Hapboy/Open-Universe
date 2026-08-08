import cn from "classnames";
import styles from "@/ui/components/CategoryTagGroup/CategoryTagGroup.module.css";

export interface CategoryTagOption {
    key: string;
    label: string;
}

export function CategoryTagGroup({
    options,
    active,
    onToggle,
    allLabel = "Все",
    onToggleAll,
    isAllActive,
}: {
    options: CategoryTagOption[];
    active: Record<string, boolean>;
    onToggle: (key: string) => void;
    allLabel?: string;
    onToggleAll?: () => void;
    isAllActive?: boolean;
}) {
    return (
        <div className={styles.tagsContainer}>
            {options.map((opt) => (
                <button
                    key={opt.key}
                    type="button"
                    className={cn(styles.tagBtn, active[opt.key] && styles.tagBtnActive)}
                    onClick={() => onToggle(opt.key)}>
                    {opt.label}
                </button>
            ))}
            {onToggleAll && (
                <button
                    type="button"
                    className={cn(styles.tagBtn, isAllActive && styles.tagBtnActiveAll)}
                    onClick={onToggleAll}>
                    {allLabel}
                </button>
            )}
        </div>
    );
}
