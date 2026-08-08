import type { DropdownOption } from "@/ui/components/DropdownWithPreviews/DropdownWithPreviews.tsx";
import type { Haircut, Tattoo, Accessory, CharacterClothingItem } from "@hayverse/shared";

// Character-only option data for DropdownWithPreviews — no Tabler icon
// captures haircut/tattoo/clothing silhouettes precisely, so these use
// hand-drawn SVG previews instead.

export const haircutOptions: (DropdownOption & { value: Haircut })[] = [
    {
        value: "Короткая",
        label: "Короткая",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <circle cx="12" cy="13" r="5" />
                <path d="M9 9 C9 7, 15 7, 15 9" />
                <path d="M10 8 L10 6" />
                <path d="M14 8 L14 6" />
            </svg>
        ),
    },
    {
        value: "Каре",
        label: "Каре",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <circle cx="12" cy="13" r="5" />
                <path d="M7 11 C7 7, 17 7, 17 11 V15" />
            </svg>
        ),
    },
    {
        value: "Длинная",
        label: "Длинная",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <circle cx="12" cy="11" r="5" />
                <path d="M7 9 C7 5, 17 5, 17 9 V20 C17 20, 15 18, 12 18 C9 18, 7 20, 7 20 Z" />
            </svg>
        ),
    },
    {
        value: "Косы",
        label: "Косы",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <circle cx="12" cy="10" r="5" />
                <path d="M7 8 C7 5, 17 5, 17 8" />
                <path d="M8 15 L7 18 L8 21" />
                <path d="M16 15 L17 18 L16 21" />
            </svg>
        ),
    },
    {
        value: "С дредами",
        label: "С дредами",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <circle cx="12" cy="11" r="5" />
                <path d="M6 7 L4 12" />
                <path d="M8 6 L6 14" />
                <path d="M16 6 L18 14" />
                <path d="M18 7 L20 12" />
                <path d="M12 5 L12 8" />
            </svg>
        ),
    },
];

export const tattooOptions: (DropdownOption & { value: Tattoo })[] = [
    {
        value: "Нет",
        label: "Нет",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <rect x="6" y="6" width="12" height="12" rx="2" />
                <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
        ),
    },
    {
        value: "Геометрия",
        label: "Геометрия",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <rect x="6" y="6" width="12" height="12" rx="2" />
                <polygon points="12,8 16,15 8,15" fill="rgba(239,159,39,0.2)" />
            </svg>
        ),
    },
    {
        value: "Рукав",
        label: "Рукав",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <rect x="6" y="6" width="12" height="12" rx="2" />
                <path d="M8 8 C8 8, 10 16, 16 16" strokeDasharray="2 2" />
                <path d="M10 6 C10 6, 12 14, 14 12" strokeDasharray="1 1" />
            </svg>
        ),
    },
    {
        value: "Минимализм",
        label: "Минимализм",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <rect x="6" y="6" width="12" height="12" rx="2" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
        ),
    },
];

export const accessoryOptions: (DropdownOption & { value: Accessory })[] = [
    {
        value: "Нет",
        label: "Нет",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <circle cx="12" cy="12" r="6" />
            </svg>
        ),
    },
    {
        value: "Очки",
        label: "Очки",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <circle cx="8" cy="12" r="3" />
                <circle cx="16" cy="12" r="3" />
                <line x1="11" y1="12" x2="13" y2="12" />
                <path d="M5 12 L3 10" />
                <path d="M19 12 L21 10" />
            </svg>
        ),
    },
    {
        value: "Серьги",
        label: "Серьги",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <circle cx="12" cy="10" r="4" />
                <circle cx="7" cy="14" r="1.5" />
                <circle cx="17" cy="14" r="1.5" />
            </svg>
        ),
    },
    {
        value: "Шарф",
        label: "Шарф",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <path d="M8 8 C12 6, 16 6, 16 8 C16 11, 8 11, 8 14 C8 17, 16 17, 16 14" />
            </svg>
        ),
    },
];

export const clothingOptions: (DropdownOption & { value: CharacterClothingItem })[] = [
    {
        value: "Пальто",
        label: "Пальто",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <path d="M7 8 V20 H17 V8 L12 12 Z" />
                <line x1="12" y1="12" x2="12" y2="20" />
            </svg>
        ),
    },
    {
        value: "Куртка",
        label: "Куртка",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <path d="M6 9 L12 6 L18 9 V18 H6 Z" />
                <line x1="12" y1="6" x2="12" y2="18" strokeWidth="2" />
            </svg>
        ),
    },
    {
        value: "Костюм",
        label: "Костюм",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <path d="M6 7 L12 11 L18 7 V20 H6 Z" />
                <path d="M12 11 L10 15 H14 Z" fill="currentColor" />
            </svg>
        ),
    },
    {
        value: "Свитер",
        label: "Свитер",
        previewSvg: (
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5">
                <path d="M7 9 C7 7, 17 7, 17 9 V19 H7 Z" />
                <path d="M10 9 V19 M14 9 V19" strokeDasharray="2 1" />
            </svg>
        ),
    },
];
