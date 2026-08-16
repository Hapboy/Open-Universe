import cn from "classnames";
import { BareButton } from "@/ui/components/BareButton/BareButton.tsx";
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
                <BareButton
                    key={opt.key}
                    className={cn(styles.tagBtn, active[opt.key] && styles.tagBtnActive)}
                    onClick={() => onToggle(opt.key)}>
                    {opt.label}
                </BareButton>
            ))}
            {onToggleAll && (
                <BareButton
                    className={cn(styles.tagBtn, isAllActive && styles.tagBtnActiveAll)}
                    onClick={onToggleAll}>
                    {allLabel}
                </BareButton>
            )}
        </div>
    );
}
