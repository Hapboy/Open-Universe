import cn from "classnames";
import { CircleLoader } from "@/ui/components/CircleLoader/CircleLoader.tsx";
import styles from "@/ui/components/IconButton/IconButton.module.css";

// Collapses the disabled/title plumbing + "swap the icon for CircleLoader
// while busy" pattern that used to be hand-rolled at every icon-only button
// (PhotoGallerySection's generate button, MediaPickerButton, PresetsField's
// save button, ...). `icon` is a Tabler Icons suffix, e.g. "wand" for
// `ti ti-wand`.
export function IconButton({
    icon,
    variant = "default",
    loading,
    disabled,
    title,
    type = "button",
    className,
    onClick,
}: {
    icon: string;
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
            className={cn(styles.iconBtn, "nodrag", variant === "primary" && styles.pri, className)}
            disabled={disabled || loading}
            title={title}
            onClick={onClick}>
            {loading ? <CircleLoader /> : <i className={`ti ti-${icon}`} />}
        </button>
    );
}
