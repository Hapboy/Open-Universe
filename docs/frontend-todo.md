# Frontend TODO

Running scratchpad for frontend work planned across future sessions — not
started yet unless noted otherwise. Add to this freely; it's not a decision
log (see `DECISIONS.md` for those) or a formal spec, just a place to not
lose track of things between sessions.

## Node Editor

- **Undo/redo for the graph editor.** No history support today — GraphContext
  has no `undo`/`redo`, so a mistake (wrong preset click, deleted node,
  overwritten params) is unrecoverable without a manual fix. React Flow's own
  docs cover the standard approach: keep a history stack of past
  `nodes`/`edges` snapshots (or patches) in GraphContext, push on every
  committed change, wire Ctrl+Z/Ctrl+Shift+Z. Worth scoping carefully —
  GraphContext mutates `nodes`/`edges` from a lot of call sites
  (updateNodeParam, setNodePhotos, duplicateNode, connect/disconnect, etc.),
  so the snapshot point needs to be chosen to avoid either missing changes or
  spamming the history with every keystroke.
