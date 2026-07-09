import { useToastContext } from "../../store/contexts/ToastContext.tsx";
import styles from "./Toast.module.css";

export function Toast() {
    const { toast } = useToastContext();
    if (!toast) return null;
    return (
        <div className={styles.toast} style={{ opacity: 1, transform: "translateY(0)" }}>
            {toast}
        </div>
    );
}
