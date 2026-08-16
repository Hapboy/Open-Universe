import cn from "classnames";
import type { InputHTMLAttributes } from "react";

// Bare `<input>`, no label/wrapper — same role as Select.tsx for `<select>`.
// TextField/NumberField/CoordinateField/DateRangeField/SeedField/ColorField/
// RangeField all render this instead of a raw `<input>`, so the `nodrag`
// class (blocks React Flow from starting a node drag off a mousedown inside
// a field) lives here once instead of being repeated at every call site.
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cn("nodrag", className)} {...rest} />;
}
