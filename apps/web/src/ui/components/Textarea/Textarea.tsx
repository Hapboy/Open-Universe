import cn from "classnames";
import type { TextareaHTMLAttributes } from "react";

// Bare `<textarea>`, no label/wrapper — textarea counterpart to Input.tsx.
// Also carries `nowheel` (not just `nodrag`) since a field tall enough to
// scroll internally shouldn't zoom the canvas instead while the user
// scrolls its content.
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={cn("nodrag", "nowheel", className)} {...rest} />;
}
