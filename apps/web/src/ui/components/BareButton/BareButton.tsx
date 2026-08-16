import cn from "classnames";
import type { ButtonHTMLAttributes } from "react";

// Bare `<button>`, no imposed layout/styling — for custom-styled controls
// (segmented toggles, tag pills, chips, dropdown triggers) that need full
// control over their own appearance and can't use Button.tsx's opinionated
// full-width row style. Centralizes `nodrag` the same way Input/Textarea do
// for their tags, instead of repeating it at every such call site.
export function BareButton({
    className,
    type = "button",
    ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type={type} className={cn("nodrag", className)} {...rest} />;
}
