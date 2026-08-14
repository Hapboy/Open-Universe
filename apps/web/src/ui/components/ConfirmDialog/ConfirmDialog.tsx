import { useEffect } from "react";
import { Button } from "@/ui/components/Button/Button.tsx";
import styles from "@/ui/components/ConfirmDialog/ConfirmDialog.module.css";

// Generic yes/no confirmation overlay for destructive actions that have no
// undo (see e.g. SceneTrackView.tsx's scene delete) — the app otherwise has
// no confirm-before-destructive-action convention, every other delete
// (deleteNode, preset removal, ...) fires immediately. Render via
// `createPortal(..., document.body)` at the call site, same convention as
// MediaLibrary.tsx's modal shell — not built into this component since not
// every caller necessarily needs the portal (e.g. one already rendering at
// document body's top level).
export function ConfirmDialog({
    title,
    message,
    confirmLabel = "Удалить",
    onConfirm,
    onCancel,
}: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onCancel]);

    return (
        <div
            className={styles.modal}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}>
            <div className={styles.sheet}>
                <div className={styles.sheetH}>
                    <h2>{title}</h2>
                </div>
                <div className={styles.sheetBody}>
                    <p className={styles.message}>{message}</p>
                    <div className={styles.actions}>
                        <Button onClick={onCancel}>Отмена</Button>
                        <Button className={styles.danger} onClick={onConfirm}>
                            {confirmLabel}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
