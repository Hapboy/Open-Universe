import { useEffect, useState } from 'react'
import cn from 'classnames'
import { useUserContext } from '../../store/contexts/UserContext.tsx'
import { useToastContext } from '../../store/contexts/ToastContext.tsx'
import type { CurrentUser } from '../../types.ts'
import styles from './Modals.module.css'

function sideColor(side: string): string {
  if (side === 'urvakan') return 'var(--color-node-higgsfield)'
  if (side === 'rambalkoshe') return 'var(--color-node-util)'
  return 'var(--color-node-scene)'
}

// Open a modal by dispatching a custom event from Topbar buttons
// (buttons use data-open-modal attribute handled here)
export function Modals() {
  const { currentUser } = useUserContext()
  // Show onboarding on first load
  const [openModal, setOpenModal] = useState<'team' | 'onboard' | null>(() =>
    currentUser ? null : 'onboard'
  )

  useEffect(() => {
    // Listen for topbar buttons that use data-open-modal
    const handler = (e: MouseEvent) => {
      const btn = (e.target as Element).closest('[data-open-modal]') as HTMLElement | null
      if (btn?.dataset.openModal) {
        setOpenModal(btn.dataset.openModal as 'team')
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const close = () => setOpenModal(null)

  return (
    <>
      {openModal === 'onboard' && <OnboardModal onClose={close} />}
      {openModal === 'team' && <TeamModal onClose={close} />}
    </>
  )
}

// ── Onboarding ────────────────────────────────────────────────────────────────

function OnboardModal({ onClose }: { onClose: () => void }) {
  const { setCurrentUser } = useUserContext()
  const { showToast } = useToastContext()
  const [name, setName] = useState('')
  const [charName, setCharName] = useState('')
  const [side, setSide] = useState('urvakan')
  const [role, setRole] = useState('Режиссер')

  const handleRegister = () => {
    if (!name.trim() || !charName.trim()) {
      showToast('Заполните все текстовые поля!')
      return
    }
    const user: CurrentUser = { name: name.trim(), charName: charName.trim(), side, role }
    setCurrentUser(user)
    showToast(`Вы вошли под персонажем ${charName} во фракцию ${side.toUpperCase()}!`)
    onClose()
  }

  return (
    <div className={styles.modal}>
      <div className={styles.sheet}>
        <div className={styles.sheetH}>
          <h2>Войти в разработку</h2>
        </div>
        <div className={styles.sheetBody}>
          <p className={styles.sub}>
            Каждый разработчик создаёт своего персонажа, выбирает сторону и роль по текущему
            сценарию. Твой персонаж попадёт в финальный фильм вместе с вымышленными.
          </p>
          <div className={styles.fld}>
            <span>Имя разработчика</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите имя..."
            />
          </div>
          <div className={styles.fld}>
            <span>Имя персонажа во вселенной</span>
            <input
              type="text"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              placeholder="Введите имя персонажа..."
            />
          </div>
          <div className={styles.fld}>
            <span>Фракция / сторона</span>
            <select value={side} onChange={(e) => setSide(e.target.value)}>
              <option value="urvakan">Urvakan (Авангард, музыкальные архивы)</option>
              <option value="rambalkoshe">Rambalkoshe (Визуальное искусство, модерн)</option>
              <option value="moct">Moct (Современная архитектура, мосты культур)</option>
            </select>
          </div>
          <div className={styles.fld}>
            <span>Роль во вселенной</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Режиссер">Режиссер (Director)</option>
              <option value="Разработчик">Разработчик (Developer)</option>
              <option value="Художник">Художник (Artist)</option>
              <option value="Стилист">Стилист (Stylist)</option>
            </select>
          </div>
          <br />
          <button className={cn(styles.btn, styles.pri)} onClick={handleRegister}>
            Войти в команду
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Team ──────────────────────────────────────────────────────────────────────

function TeamModal({ onClose }: { onClose: () => void }) {
  const { team, currentUser } = useUserContext()
  const all = [...team, ...(currentUser ? [{ ...currentUser, isMe: true }] : [])]

  return (
    <div className={styles.modal}>
      <div className={styles.sheet}>
        <div className={styles.sheetH}>
          <h2>Команда разработки</h2>
          <button className={styles.x} onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        <div className={styles.sheetBody}>
          <div className={styles.devList}>
            {all.map((dev, i) => (
              <div key={i} className={styles.devItem}>
                <div className={styles.devAvatar} style={{ background: sideColor(dev.side) }}>
                  {dev.name.slice(0, 2).toUpperCase()}
                </div>
                <div className={styles.devInfo}>
                  <div className={styles.devName}>
                    {dev.name}
                    {dev.isMe && <strong> (Вы)</strong>}
                  </div>
                  <div className={styles.devChar}>
                    Персонаж: {dev.charName} · Роль: {dev.role}
                  </div>
                </div>
                <div className={cn(styles.devBadge, styles[dev.side])}>
                  {dev.side.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
