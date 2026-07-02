import { createContext, useCallback, useContext, useState } from 'react'
import type { CurrentUser, TeamMember } from '../../types.ts'

const INITIAL_TEAM: TeamMember[] = [
  { name: 'Арам', charName: 'Аракс', side: 'moct', role: 'Разработчик', isMe: false },
  { name: 'Сона', charName: 'Ани', side: 'urvakan', role: 'Стилист', isMe: false },
  { name: 'Карен', charName: 'Давид', side: 'rambalkoshe', role: 'Художник', isMe: false },
]

interface UserCtx {
  currentUser: CurrentUser | null
  setCurrentUser: (u: CurrentUser) => void
  team: TeamMember[]
}

const Ctx = createContext<UserCtx>(null!)
export const useUserContext = () => useContext(Ctx)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserBase] = useState<CurrentUser | null>(
    JSON.parse(localStorage.getItem('hv_current_user') || 'null')
  )

  const setCurrentUser = useCallback((u: CurrentUser) => {
    localStorage.setItem('hv_current_user', JSON.stringify(u))
    setCurrentUserBase(u)
  }, [])

  const ctx: UserCtx = { currentUser, setCurrentUser, team: INITIAL_TEAM }

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}
