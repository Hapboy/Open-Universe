import type { ReactNode } from "react";
import cn from "classnames";
import { CircleLoader } from "../CircleLoader/CircleLoader.tsx";
import styles from "./Button.module.css";

// Full-width text button — see IconButton for the icon-only counterpart.
// `icon` is a Tabler Icons suffix, e.g. "plus" for `ti ti-plus`.
export function Button({
    children,
    icon,
    variant = "default",
    loading,
    disabled,
    title,
    type = "button",
    className,
    onClick,
}: {
    children: ReactNode;
    icon?: string;
    variant?: "default" | "primary";
    loading?: boolean;
    disabled?: boolean;
    title?: string;
    type?: "button" | "submit";
    className?: string;
    onClick?: () => void;
}) {
    return (
        <button
            type={type}
            className={cn(styles.btn, variant === "primary" && styles.pri, className)}
            disabled={disabled || loading}
            title={title}
            onClick={onClick}>
            {loading ? <CircleLoader /> : icon && <i className={`ti ti-${icon}`} />}
            {children}
        </button>
    );
}
