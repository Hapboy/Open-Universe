import { getAppSnapshot } from '../store/AppContext.tsx';

// Art piece position in top-down view (matches renderer.ts topDown ART coords)
const ART = { x: 360, y: 48 };

// We update avatar position via a module-level mutable ref so game.ts doesn't
// need to import the full context (which would create a circular dep).
// PlayerPanel reads gameAv from context; game.ts calls setPlayerFn to update it.
let setPlayerFn: ((patch: { gameAv: { x: number; y: number } }) => void) | null = null;
let getGameAvFn: () => { x: number; y: number } = () => ({ x: 225, y: 235 });

export function initGame() {
  document.addEventListener('keydown', handleKey);
}

// Called from App.tsx once context is available
export function bindGameToContext(
  setPlayer: (patch: { gameAv: { x: number; y: number } }) => void,
  getGameAv: () => { x: number; y: number }
) {
  setPlayerFn = setPlayer;
  getGameAvFn = getGameAv;
}

export function moveActor(dx: number, dy: number): void {
  const snap = getAppSnapshot();
  if (snap?.player.playerMode !== 'game') return;

  const av = getGameAvFn();
  const nx = Math.max(78,  Math.min(402, av.x + dx));
  const ny = Math.max(36,  Math.min(189, av.y + dy));
  setPlayerFn?.({ gameAv: { x: nx, y: ny } });
  updateProximityHint(nx, ny);
}

export function actInteract(): void {
  const av = getGameAvFn();
  const d  = Math.hypot(av.x - ART.x, av.y - ART.y);
  const snap = getAppSnapshot();
  if (d < 70) {
    // showToast is not directly accessible here; we use a custom event instead
    document.dispatchEvent(new CustomEvent('game:toast', { detail: '«Минас Аветисян» — история, автор и связи во вселенной' }));
  }
}

function updateProximityHint(x: number, y: number): void {
  const d    = Math.hypot(x - ART.x, y - ART.y);
  const hint = document.getElementById('gameHint');
  if (hint) hint.style.display = d < 70 ? 'block' : 'none';
}

function handleKey(e: KeyboardEvent): void {
  const snap = getAppSnapshot();
  if (!snap || snap.player.playerMode !== 'game') return;
  const k = e.key.toLowerCase();
  if      (['arrowup',    'w'].includes(k)) { moveActor(0, -12);  e.preventDefault(); }
  else if (['arrowdown',  's'].includes(k)) { moveActor(0,  12);  e.preventDefault(); }
  else if (['arrowleft',  'a'].includes(k)) { moveActor(-12, 0);  e.preventDefault(); }
  else if (['arrowright', 'd'].includes(k)) { moveActor(12,  0);  e.preventDefault(); }
  else if (k === 'e') actInteract();
}

let holdTimer: ReturnType<typeof setInterval> | null = null;

export function startDpadMove(dir: string): void {
  stopDpadMove();
  const step = () => {
    if (dir === 'up')    moveActor(0, -9);
    else if (dir === 'down')  moveActor(0,  9);
    else if (dir === 'left')  moveActor(-9, 0);
    else if (dir === 'right') moveActor(9,  0);
  };
  step();
  holdTimer = setInterval(step, 90);
}

export function stopDpadMove(): void {
  if (holdTimer) { clearInterval(holdTimer); holdTimer = null; }
}
