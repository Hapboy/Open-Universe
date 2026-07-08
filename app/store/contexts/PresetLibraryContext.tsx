import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { ENTITY_PRESET_SEEDS } from '../../data/presets.ts'
import type { EntityPresets } from '../../types.ts'
import { useToastContext } from './ToastContext.tsx'
import { readJSON, writeJSON } from '../../core/browserStorage.ts'

const LIBRARY_STORAGE_KEY = 'hv_preset_library'

type PresetLibrary = Record<string, EntityPresets>

function loadStoredLibrary(): PresetLibrary {
  const stored = readJSON<PresetLibrary>(LIBRARY_STORAGE_KEY, {})
  const seeds = JSON.parse(JSON.stringify(ENTITY_PRESET_SEEDS)) as PresetLibrary
  const merged: PresetLibrary = {}
  for (const entityType of new Set([...Object.keys(seeds), ...Object.keys(stored)])) {
    merged[entityType] = {
      ...(seeds[entityType] ?? {}),
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
      writeJSON(LIBRARY_STORAGE_KEY, library, () =>
        showToast('Не удалось сохранить пресеты локально (превышен лимит хранилища)')
      )
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
