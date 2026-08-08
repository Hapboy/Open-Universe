import { useRef, useState, useEffect } from "react";
import cn from "classnames";
import styles from "@/ui/components/DropdownWithPreviews/DropdownWithPreviews.module.css";

// Dropdown with an SVG preview thumbnail per option — for cases where a plain
// label isn't enough to distinguish options (e.g. haircut/tattoo/clothing
// silhouettes) and no icon font covers them. Renders as divs, not a native
// <select>, since <option> can't host arbitrary JSX.
export interface DropdownOption {
    value: string;
    label: string;
    previewSvg: React.ReactNode;
}

interface DropdownWithPreviewsProps {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: DropdownOption[];
}

export function DropdownWithPreviews({
    label,
    value,
    onChange,
    options,
}: DropdownWithPreviewsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    const selectedOption = options.find((opt) => opt.value === value) || options[0];

    return (
        <div className={styles.customSelectWrapper} ref={dropdownRef}>
            <span className={styles.selectLabel}>{label}</span>
            <div className={styles.selectTrigger} onClick={() => setIsOpen(!isOpen)}>
                {selectedOption && (
                    <div className={styles.selectedContent}>
                        <div className={styles.previewThumb}>{selectedOption.previewSvg}</div>
                        <span className={styles.selectedText}>{selectedOption.label}</span>
                    </div>
                )}
                <i
                    className={cn(
                        "ti ti-chevron-down",
                        styles.chevron,
                        isOpen && styles.chevronOpen,
                    )}
                />
            </div>
            {isOpen && (
                <div className={styles.selectDropdown}>
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            className={cn(
                                styles.selectOption,
                                opt.value === value && styles.selectOptionActive,
                            )}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}>
                            <div className={styles.previewThumb}>{opt.previewSvg}</div>
                            <span className={styles.optionText}>{opt.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
