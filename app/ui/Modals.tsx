import { useEffect, useState } from 'react';
import { useAppContext } from '../store/AppContext.tsx';
import type { CurrentUser } from '../types.ts';

function sideColor(side: string): string {
  if (side === 'urvakan')     return 'var(--color-node-higgsfield)';
  if (side === 'rambalkoshe') return 'var(--color-node-util)';
  return 'var(--color-node-scene)';
}

// Open a modal by dispatching a custom event from Topbar buttons
// (buttons use data-open-modal attribute handled here)
export function Modals() {
  const [openModal, setOpenModal] = useState<'team' | 'onboard' | null>(null);
  const { currentUser } = useAppContext();

  useEffect(() => {
    // Show onboarding on first load
    if (!currentUser) setOpenModal('onboard');
  }, []);

  useEffect(() => {
    // Listen for topbar buttons that use data-open-modal
    const handler = (e: MouseEvent) => {
      const btn = (e.target as Element).closest('[data-open-modal]') as HTMLElement | null;
      if (btn?.dataset.openModal) {
        setOpenModal(btn.dataset.openModal as 'team');
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const close = () => setOpenModal(null);

  return (
    <>
      {openModal === 'onboard' && <OnboardModal onClose={close} />}
      {openModal === 'team'    && <TeamModal    onClose={close} />}
    </>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────

function OnboardModal({ onClose }: { onClose: () => void }) {
  const { setCurrentUser, showToast } = useAppContext();
  const [name, setName]         = useState('');
  const [charName, setCharName] = useState('');
  const [side, setSide]         = useState('urvakan');
  const [role, setRole]         = useState('Режиссер');

  const handleRegister = () => {
    if (!name.trim() || !charName.trim()) {
      showToast('Заполните все текстовые поля!');
      return;
    }
    const user: CurrentUser = { name: name.trim(), charName: charName.trim(), side, role };
    setCurrentUser(user);
    showToast(`Вы вошли под персонажем ${charName} во фракцию ${side.toUpperCase()}!`);
    onClose();
  };

  return (
    <div className="modal">
      <div className="sheet">
        <div className="sheet-h"><h2>Войти в разработку</h2></div>
        <div className="sheet-body">
          <p className="sub">Каждый разработчик создаёт своего персонажа, выбирает сторону и роль по текущему сценарию. Твой персонаж попадёт в финальный фильм вместе с вымышленными.</p>
          <div className="fld">
            <span>Имя разработчика</span>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Введите имя..." />
          </div>
          <div className="fld">
            <span>Имя персонажа во вселенной</span>
            <input type="text" value={charName} onChange={e => setCharName(e.target.value)} placeholder="Введите имя персонажа..." />
          </div>
          <div className="fld">
            <span>Фракция / сторона</span>
            <select value={side} onChange={e => setSide(e.target.value)}>
              <option value="urvakan">Urvakan (Авангард, музыкальные архивы)</option>
              <option value="rambalkoshe">Rambalkoshe (Визуальное искусство, модерн)</option>
              <option value="moct">Moct (Современная архитектура, мосты культур)</option>
            </select>
          </div>
          <div className="fld">
            <span>Роль во вселенной</span>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="Режиссер">Режиссер (Director)</option>
              <option value="Разработчик">Разработчик (Developer)</option>
              <option value="Художник">Художник (Artist)</option>
              <option value="Стилист">Стилист (Stylist)</option>
            </select>
          </div>
          <br />
          <button className="btn pri" onClick={handleRegister}>Войти в команду</button>
        </div>
      </div>
    </div>
  );
}

// ── Team ──────────────────────────────────────────────────────────────────────

function TeamModal({ onClose }: { onClose: () => void }) {
  const { team, currentUser } = useAppContext();
  const all = [...team, ...(currentUser ? [{ ...currentUser, isMe: true }] : [])];

  return (
    <div className="modal">
      <div className="sheet">
        <div className="sheet-h">
          <h2>Команда разработки</h2>
          <button className="x" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className="sheet-body">
          <div className="dev-list">
            {all.map((dev, i) => (
              <div key={i} className="dev-item">
                <div className="dev-avatar" style={{ background: sideColor(dev.side) }}>
                  {dev.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="dev-info">
                  <div className="dev-name">{dev.name}{dev.isMe && <strong> (Вы)</strong>}</div>
                  <div className="dev-char">Персонаж: {dev.charName} · Роль: {dev.role}</div>
                </div>
                <div className={`dev-badge ${dev.side}`}>{dev.side.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
