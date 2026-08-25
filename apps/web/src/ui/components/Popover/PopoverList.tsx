import cn from "classnames";
import styles from "@/ui/components/Popover/PopoverList.module.css";

export interface PopoverListItem {
    id: string;
    label: string;
    icon?: string; // Tabler icon suffix, e.g. "plus" for `ti ti-plus`
    disabled?: boolean;
}

type PopoverListSelection =
    | { multiple?: false; value: string | null; onChange: (id: string) => void }
    | { multiple: true; value: string[]; onChange: (value: string[]) => void };

export type PopoverListProps = PopoverListSelection & {
    items: PopoverListItem[];
    onRequestClose?: () => void; // called after a pick, single-select mode only
};

export function PopoverList(props: PopoverListProps) {
    const { items, onRequestClose } = props;

    const isSelected = (id: string) =>
        props.multiple ? props.value.includes(id) : props.value === id;

    const pick = (id: string) => {
        if (props.multiple) {
            const next = props.value.includes(id)
                ? props.value.filter((v) => v !== id)
                : [...props.value, id];
            props.onChange(next);
        } else {
            props.onChange(id);
            onRequestClose?.();
        }
    };

    return (
        <div className={styles.list}>
            {items.map((item) => (
                <button
                    key={item.id}
                    className={cn(styles.item, isSelected(item.id) && styles.selected)}
                    disabled={item.disabled}
                    onClick={() => pick(item.id)}>
                    {item.icon && <i className={`ti ti-${item.icon}`} />}
                    <span className={styles.label}>{item.label}</span>
                    {props.multiple && isSelected(item.id) && (
                        <i className={cn("ti ti-check", styles.check)} />
                    )}
                </button>
            ))}
        </div>
    );
}
