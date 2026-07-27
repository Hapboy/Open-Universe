import cn from "classnames";
import { useToastContext } from "../../store/contexts/ToastContext.tsx";
import styles from "./Toast.module.css";

export function Toast() {
    const { toast } = useToastContext();
    if (!toast) return null;
    return <div className={cn(styles.toast, styles.visible)}>{toast}</div>;
}
