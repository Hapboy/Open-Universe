import { Popover } from "@/ui/components/Popover/Popover.tsx";
import styles from "@/ui/NodeCard/NodeMenu/NodeMenu.module.css";

export function NodeMenu({
    onDuplicate,
    onDelete,
    jsonPreviewVisible,
    onToggleJsonPreview,
}: {
    onDuplicate: () => void;
    onDelete: () => void;
    jsonPreviewVisible?: boolean;
    onToggleJsonPreview?: () => void;
}) {
    return (
        <Popover
            trigger={({ toggle }) => (
                <button
                    className={styles.menuBtn}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Ещё"
                    onClick={(e) => {
                        e.stopPropagation();
                        toggle();
                    }}>
                    <i className="ti ti-dots-vertical" />
                </button>
            )}>
            {(close) => (
                <div className={styles.menu} onMouseDown={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => {
                            onDuplicate();
                            close();
                        }}>
                        <i className="ti ti-copy" /> Дублировать
                    </button>
                    {onToggleJsonPreview && (
                        <button
                            onClick={() => {
                                onToggleJsonPreview();
                                close();
                            }}>
                            <i className={`ti ${jsonPreviewVisible ? "ti-eye-off" : "ti-eye"}`} />
                            {jsonPreviewVisible ? "Скрыть JSON превью" : "Показать JSON превью"}
                        </button>
                    )}
                    <button
                        className={styles.danger}
                        onClick={() => {
                            onDelete();
                            close();
                        }}>
                        <i className="ti ti-trash" /> Удалить
                    </button>
                </div>
            )}
        </Popover>
    );
}
