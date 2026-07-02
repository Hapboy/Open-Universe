import { ToastProvider } from './contexts/ToastContext.tsx'
import { PwaProvider } from './contexts/PwaContext.tsx'
import { UserProvider } from './contexts/UserContext.tsx'
import { PlayerProvider } from './contexts/PlayerContext.tsx'
import { GraphProvider } from './contexts/GraphContext.tsx'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PwaProvider>
        <UserProvider>
          <PlayerProvider>
            <GraphProvider>{children}</GraphProvider>
          </PlayerProvider>
        </UserProvider>
      </PwaProvider>
    </ToastProvider>
  )
}
