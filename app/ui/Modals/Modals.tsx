import { useEffect, useState } from 'react'
import cn from 'classnames'
import { useUserContext } from '../../store/contexts/UserContext.tsx'
import { useToastContext } from '../../store/contexts/ToastContext.tsx'
import type { CurrentUser } from '../../types.ts'
import { SelectField } from '../components/SelectField/SelectField.tsx'
import { TextField } from '../components/TextField/TextField.tsx'
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
          <TextField
            label="Имя разработчика"
            value={name}
            onChange={setName}
            placeholder="Введите имя..."
          />
          <TextField
            label="Имя персонажа во вселенной"
            value={charName}
            onChange={setCharName}
            placeholder="Введите имя персонажа..."
          />
          <SelectField
            label="Фракция / сторона"
            value={side}
            onChange={setSide}
            options={[
              { value: 'urvakan', label: 'Urvakan (Авангард, музыкальные архивы)' },
              { value: 'rambalkoshe', label: 'Rambalkoshe (Визуальное искусство, модерн)' },
              { value: 'moct', label: 'Moct (Современная архитектура, мосты культур)' },
            ]}
          />
          <SelectField
            label="Роль во вселенной"
            value={role}
            onChange={setRole}
            options={[
              { value: 'Режиссер', label: 'Режиссер (Director)' },
              { value: 'Разработчик', label: 'Разработчик (Developer)' },
              { value: 'Художник', label: 'Художник (Artist)' },
              { value: 'Стилист', label: 'Стилист (Stylist)' },
            ]}
          />
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
