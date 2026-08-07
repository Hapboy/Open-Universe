import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

// Mirrors a node's store params (Record<string, unknown>) into an RHF form,
// keyed by a zod schema so `defaultValues`/re-syncs always cover exactly
// the fields the node type actually has.
//
// Store -> form sync per field:
// - Not dirty: sync straight from the store (covers external changes like a
//   MediaSlider history restore, and the initial mount).
// - Dirty, but the form's current value already equals what just arrived
//   from the store: this field's own edit was the thing that produced this
//   store write (e.g. its onBlur commit, or an immediate-commit select's
//   onChange) — `resetField` to clear its dirty flag and rebase its
//   defaultValue to the committed value, so it goes back to being sync-able
//   the next time something *else* changes the store (a later history
//   restore, a sibling field). Without this, a field would stay "dirty"
//   forever after its first edit and never pick up an external change again.
// - Dirty, and the form's current value differs from what arrived: a
//   genuine in-progress edit (typed, not yet blurred) unrelated to this
//   store write — left alone rather than clobbered.
//
// This hook only mirrors — callers still call updateNodeParam/updateNodeParams
// themselves to actually commit an edit to the store. The form's generic type
// is left to be inferred from `zodResolver(schema)` (rather than explicitly
// annotated as z.infer<Schema>) since zod v4's input/output generics don't
// otherwise unify cleanly with an independently-computed z.infer alias.
export function useNodeParamsForm<Schema extends z.ZodObject<z.ZodRawShape>>(
    schema: Schema,
    storeParams: Record<string, unknown>,
) {
    type Values = z.infer<Schema>;
    const keys = Object.keys(schema.shape) as (keyof Values & string)[];

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: schema.parse(storeParams),
    });

    useEffect(() => {
        const dirtyFields = form.formState.dirtyFields as Partial<Record<string, boolean>>;
        for (const key of keys) {
            const path = key as FieldPath<Values>;
            const next = storeParams[key];
            const current = form.getValues(path);
            if (dirtyFields[key]) {
                if (Object.is(current, next)) {
                    // `next`'s exact PathValue can't be inferred for a dynamic
                    // (non-literal) field path — safe here since `next` always
                    // comes from the same store object `schema.parse` already
                    // validated these keys' shapes against.
                    form.resetField(path, { defaultValue: next as never });
                }
                continue;
            }
            if (!Object.is(current, next)) {
                form.setValue(path, next as never, { shouldDirty: false });
            }
        }
        // Only re-sync when the store params object identity changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeParams]);

    return form;
}
