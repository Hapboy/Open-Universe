import { useState } from "react";
import { Input } from "@/ui/components/Input/Input.tsx";
import { IconButton } from "@/ui/components/IconButton/IconButton.tsx";
import { Switch } from "@/ui/components/Switch/Switch.tsx";
import sharedStyles from "@/styles/shared.module.css";

// The "Сид (seed)" field shared by every Gemini provider's params — plain
// text input plus a copy action (always, whatever's currently in the
// field) and, where seed is actually functional (Nano Banana/Lyria;
// Imagen/Veo's field stays disabled, see core/seed.ts's
// SEED_CAPABLE_NODE_TYPES), a "Случайный" toggle. The reroll button itself
// now lives on the generation-history slider next to delete (NodeCard.tsx/
// UtilParams.tsx/EntityParams.tsx), not here — this field only controls
// whether plain Generate keeps reusing the stored seed (off) or mints a
// fresh one every time (on, the default — see core/seed.ts's
// resolvedSeedPatch).
export function SeedField({
    value,
    onChange,
    onBlur,
    randomize,
    onRandomizeChange,
    disabled,
    title,
}: {
    value: string;
    onChange?: (value: string) => void;
    onBlur?: (value: string) => void;
    randomize?: boolean;
    onRandomizeChange?: (value: boolean) => void;
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
                <Input
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
                {onRandomizeChange && (
                    <Switch
                        label="Случайный"
                        value={randomize ?? true}
                        onChange={onRandomizeChange}
                        disabled={disabled}
                        title="При генерации всегда подбирать новый сид, даже если он уже задан"
                    />
                )}
            </div>
        </div>
    );
}
