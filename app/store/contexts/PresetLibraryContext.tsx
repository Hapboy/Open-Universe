import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ENTITY_PRESET_SEEDS } from '../../data/presets.ts'
import type { EntityPresets } from '../../types.ts'
import { useToastContext } from './ToastContext.tsx'

const LIBRARY_STORAGE_KEY = 'hv_preset_library'
const LEGACY_GRAPH_STORAGE_KEY = 'hv_graph'

type PresetLibrary = Record<string, EntityPresets>

// One-time recovery of custom presets that were saved per-node (the old
// `params._presets`) before presets became a shared library, so upgrading
// doesn't silently drop anything a user already created.
function recoverLegacyPresets(): PresetLibrary {
  try {
    const raw = localStorage.getItem(LEGACY_GRAPH_STORAGE_KEY)
    if (!raw) return {}
    const nodes = JSON.parse(raw)?.nodes ?? []
    const recovered: PresetLibrary = {}
    for (const n of nodes) {
      const entityType = n?.data?.nodeType
      const legacyPresets = n?.data?.params?._presets
      if (!entityType || !legacyPresets || typeof legacyPresets !== 'object') continue
      recovered[entityType] = { ...(recovered[entityType] ?? {}), ...legacyPresets }
    }
    return recovered
  } catch {
    return {}
  }
}

function loadStoredLibrary(): PresetLibrary {
  let stored: PresetLibrary
  try {
    stored = JSON.parse(localStorage.getItem(LIBRARY_STORAGE_KEY) || '{}')
  } catch {
    stored = {}
  }
  const seeds = JSON.parse(JSON.stringify(ENTITY_PRESET_SEEDS)) as PresetLibrary
  const legacy = recoverLegacyPresets()
  const merged: PresetLibrary = {}
  for (const entityType of new Set([
    ...Object.keys(seeds),
    ...Object.keys(legacy),
    ...Object.keys(stored),
  ])) {
    merged[entityType] = {
      ...(seeds[entityType] ?? {}),
      ...(legacy[entityType] ?? {}),
      ...(stored[entityType] ?? {}),
    }
  }
  return merged
}

interface PresetLibraryCtx {
  library: PresetLibrary
  addPreset: (entityType: string, name: string, snapshot: Record<string, unknown>) => void
}

const Ctx = createContext<PresetLibraryCtx>(null!)
export const usePresetLibraryContext = () => useContext(Ctx)

export function PresetLibraryProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToastContext()
  const [library, setLibrary] = useState<PresetLibrary>(() => loadStoredLibrary())

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library))
      } catch {
        showToast('Не удалось сохранить пресеты локально (превышен лимит хранилища)')
      }
    }, 400)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [library, showToast])

  const addPreset = useCallback(
    (entityType: string, name: string, snapshot: Record<string, unknown>) => {
      setLibrary((lib) => ({
        ...lib,
        [entityType]: { ...(lib[entityType] ?? {}), [name]: snapshot },
      }))
    },
    []
  )

  const ctx: PresetLibraryCtx = { library, addPreset }

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}
