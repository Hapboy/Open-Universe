# Frontend TODO

Running scratchpad for frontend work planned across future sessions — not
started yet unless noted otherwise. Add to this freely; it's not a decision
log (see `DECISIONS.md` for those) or a formal spec, just a place to not
lose track of things between sessions.

## Presets UI

- **Replace the inline preset dropdown with a modal.** Today, each entity
  node (`EntityParams.tsx` → `usePresetDatabase` in
  `apps/web/src/ui/NodeCard/params/shared.tsx`) shows a `<select>`-style
  dropdown of that entity type's saved presets directly in the node's params
  panel. Plan: replace this with a separate modal, opened via a new
  "Presets" button on the node (button doesn't exist yet — needs adding).

- **Split `params.presetId` into two separate fields.** Confirmed
  frontend-only — the backend never parses field names inside `scenes.graph`
  (stored verbatim as jsonb), so this needs no backend changes. Today one
  field does two jobs:
    1. Which saved library preset (if any) this node is currently linked to —
       `library[entityType][presetId]` in `PresetLibraryContext.tsx`.
    2. A stable identity fingerprint for the node itself, used by
       `SynapsesCanvas` (`apps/web/src/ui/Timeline/SynapsesCanvas/synapseData.ts`,
       the "Сеть судеб"/Network of Fates view) to detect recurrence of the
       "same" character/location across scenes — assigned via
       `crypto.randomUUID()` even when the node has no saved preset behind it
       (see the `useEffect` in `shared.tsx` around `params.presetId`).
       These need to stop being the same field: role 2 must keep working for
       nodes that never get explicitly saved as a reusable preset, which today's
       single-field design accidentally makes correct but is confusing to reason
       about.

- **Related bug, worth fixing alongside the modal rework:** `onAdd` in
  `shared.tsx` lets a preset get created with an empty name (no validation)
  — the dropdown then shows the raw UUID as its label
  (`label: (snap.name as string) || id`) since there's no fallback. Should
  require a non-empty name before creating a preset. (Diagnosed 2026-07-30 —
  not a backend issue, `PresetsModule` didn't exist yet at the time; this was
  local `localStorage['hv_preset_library']` test pollution from clicking "+"
  without typing a name.)
