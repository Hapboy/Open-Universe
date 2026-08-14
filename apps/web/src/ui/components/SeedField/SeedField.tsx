import { useState } from "react";
import { IconButton } from "@/ui/components/IconButton/IconButton.tsx";
import sharedStyles from "@/styles/shared.module.css";

// The "Сид (seed)" field shared by every Gemini provider's params — plain
// text input plus two inline icon actions: copy (always, whatever's
// currently in the field) and reroll (only where seed is actually
// functional — Nano Banana/Lyria; Imagen/Veo's field stays disabled and
// gets no `onReroll`, see core/seed.ts's SEED_CAPABLE_NODE_TYPES). Reroll
// bumps by a fixed +10000 and re-runs generation in one click (see the
// title text below and each caller's handleRerollSeed) — see the callers
// for what "re-run" means in each context (a standalone node's runNode vs
// output_scene's own handleGenerateImage).
export function SeedField({
    value,
    onChange,
    onBlur,
    onReroll,
    disabled,
    title,
}: {
    value: string;
    onChange?: (value: string) => void;
    onBlur?: (value: string) => void;
    onReroll?: () => void;
    disabled?: boolean;
    title?: string;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!value) return;
        void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        });
    };

    return (
        <div className={sharedStyles.fld} title={title}>
            <span>Сид (seed)</span>
            <div className={sharedStyles.presetRow}>
                <input
                    type="text"
                    className={sharedStyles.presetSelect}
                    placeholder="авто"
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    onBlur={(e) => onBlur?.(e.target.value)}
                />
                <IconButton
                    icon={copied ? "check" : "copy"}
                    onClick={handleCopy}
                    disabled={!value}
                    title="Скопировать сид"
                />
                {onReroll && (
                    <IconButton
                        icon="dice-5"
                        onClick={onReroll}
                        disabled={disabled}
                        title="Немного изменить (сид +10000) и перегенерировать"
                    />
                )}
            </div>
        </div>
    );
}
