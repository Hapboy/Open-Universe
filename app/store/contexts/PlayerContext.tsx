import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { PlayerState } from '../../types.ts'

const INITIAL_PLAYER: PlayerState = {
  isPlaying: false,
  movieTime: 330,
  activeSceneIndex: 3,
  playerMode: 'film',
  cam: 'classic',
  pal: 0,
  dlg: true,
  tempo: 32,
  gameAv: { x: 225, y: 235 },
  gameSavedT: 330,
}

interface PlayerCtx {
  player: PlayerState
  setPlayer: (patch: Partial<PlayerState>) => void
}

const Ctx = createContext<PlayerCtx>(null!)
export const usePlayerContext = () => useContext(Ctx)

// Imperative getter for use in vanilla TS files (game.ts)
let _snapshot: (() => { player: PlayerState }) | null = null
export const getAppSnapshot = () => _snapshot?.()

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [player, setPlayerBase] = useState<PlayerState>(INITIAL_PLAYER)

  const setPlayer = useCallback((patch: Partial<PlayerState>) => {
    setPlayerBase((s) => ({ ...s, ...patch }))
  }, [])

  const ctx: PlayerCtx = { player, setPlayer }

  useEffect(() => {
    _snapshot = () => ({ player: ctx.player })
  })

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}
