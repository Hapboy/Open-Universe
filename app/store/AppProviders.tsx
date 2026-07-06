import { ToastProvider } from './contexts/ToastContext.tsx'
import { PresetLibraryProvider } from './contexts/PresetLibraryContext.tsx'
import { PwaProvider } from './contexts/PwaContext.tsx'
import { UserProvider } from './contexts/UserContext.tsx'
import { GraphProvider } from './contexts/GraphContext.tsx'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <PresetLibraryProvider>
        <PwaProvider>
          <UserProvider>
            <GraphProvider>{children}</GraphProvider>
          </UserProvider>
        </PwaProvider>
      </PresetLibraryProvider>
    </ToastProvider>
  )
}
