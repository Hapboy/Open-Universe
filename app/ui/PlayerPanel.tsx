import { useCallback, useEffect, useRef } from 'react';
import { useAppContext } from '../store/AppContext.tsx';
import { buildSceneSvg, fmtTime, sceneAt, SCENES, TOTAL_DURATION } from '../core/renderer.ts';
import { startDpadMove, stopDpadMove, actInteract } from './game.ts';
import type { CamMode } from '../types.ts';

// ── Shared SVG player hook ────────────────────────────────────────────────────

function usePlayerSvg(svgId: string) {
  const { player, team, currentUser } = useAppContext();
  const customImage = (window as Window & { customRenderImage?: string | null }).customRenderImage;

  useEffect(() => {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    svg.innerHTML = buildSceneSvg({ player, team, currentUser, customRenderImage: customImage });
  });
}

// ── Playback loop ─────────────────────────────────────────────────────────────

export function usePlaybackLoop() {
  const { player, setPlayer } = useAppContext();
  const playerRef = useRef(player);
  playerRef.current = player;

  useEffect(() => {
    const id = setInterval(() => {
      if (!playerRef.current.isPlaying) return;
      const t = playerRef.current.movieTime + 2;
      setPlayer({
        movieTime: t >= TOTAL_DURATION ? 0 : t,
        activeSceneIndex: sceneAt(t >= TOTAL_DURATION ? 0 : t),
      });
    }, 100);
    return () => clearInterval(id);
  }, [setPlayer]);
}

// ── Mini player (inspector sidebar) ──────────────────────────────────────────

export function MiniPlayer() {
  const { player, setPlayer, showToast } = useAppContext();
  const scene = SCENES[player.activeSceneIndex];

  usePlayerSvg('inspSvg');

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(TOTAL_DURATION, ((e.clientX - rect.left) / rect.width) * TOTAL_DURATION));
    setPlayer({ movieTime: t, activeSceneIndex: sceneAt(t) });
  };

  const pct = (player.movieTime / TOTAL_DURATION) * 100;

  return (
    <div className="insp-section" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="insp-h"><i className="ti ti-video" /> Генеративный плеер</div>
      <div className="player-container">
        <div className="player-view">
          <svg id="inspSvg" viewBox="0 0 480 300" />
          <div className="player-overlay player-tc" id="inspTC">{fmtTime(player.movieTime)}</div>
          <div className="player-overlay player-sc" id="inspSC">{scene?.num} · {scene?.title}</div>
          {player.dlg && (
            <div className="player-overlay player-sub" id="inspSub">{scene?.sub}</div>
          )}
        </div>
        <div className="player-controls">
          <button
            className="play-btn"
            onClick={() => setPlayer({ isPlaying: !player.isPlaying })}
          >
            <i className={`ti ${player.isPlaying ? 'ti-player-pause' : 'ti-player-play'}`} />
          </button>
          <div className="scrub-bar" id="inspScrub" onClick={handleScrub}>
            <div className="scrub-progress" style={{ width: `${pct}%` }} />
            <div className="scrub-handle"   style={{ left:  `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Full player panel ─────────────────────────────────────────────────────────

const CAM_OPTS: { id: CamMode; icon: string; label: string }[] = [
  { id: 'classic', icon: 'ti-video',            label: 'классика'  },
  { id: 'top',     icon: 'ti-grid-dots',         label: 'вид сверху'},
  { id: 'side',    icon: 'ti-layout-align-left', label: 'сбоку'    },
  { id: 'one',     icon: 'ti-track',             label: 'один кадр'},
];

const PAL_OPTS = [
  { id: 0, icon: 'ti-sun',      label: 'тёплое утро'   },
  { id: 1, icon: 'ti-mist',     label: 'холодный туман' },
  { id: 2, icon: 'ti-moon',     label: 'ночь'           },
  { id: 3, icon: 'ti-contrast', label: 'ч/б'            },
];

export function PlayerPanel() {
  const { player, setPlayer, showToast, team, currentUser } = useAppContext();
  const scene = SCENES[player.activeSceneIndex];
  const isGame = player.playerMode === 'game';
  const pct = (player.movieTime / TOTAL_DURATION) * 100;

  usePlayerSvg('playerSvg');

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(TOTAL_DURATION, ((e.clientX - rect.left) / rect.width) * TOTAL_DURATION));
    setPlayer({ movieTime: t, activeSceneIndex: sceneAt(t) });
  };

  const enterGame = useCallback(() => {
    setPlayer({ playerMode: 'game', isPlaying: false, gameSavedT: player.movieTime, cam: 'top' });
  }, [player.movieTime, setPlayer]);

  const exitGame = useCallback(() => {
    setPlayer({ playerMode: 'film', movieTime: player.gameSavedT, isPlaying: true, cam: 'classic' });
  }, [player.gameSavedT, setPlayer]);

  return (
    <div className="full-player">
      {/* Top bar */}
      <div className="full-player-top">
        <div className="seg-btn" style={{ width: 'auto' }}>
          <button
            className={player.playerMode === 'film' ? 'on' : ''}
            onClick={() => setPlayer({ playerMode: 'film' })}
          >
            <i className="ti ti-movie" /> Фильм
          </button>
          <button
            className={player.playerMode === 'game' ? 'on' : ''}
            onClick={() => setPlayer({ playerMode: 'game' })}
          >
            <i className="ti ti-device-gamepad-2" /> Игра
          </button>
        </div>
        <span className="gen-status">
          <span className="gen-dot" /> генерируется в реальном времени
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-git-branch" /> main · v4
        </span>
      </div>

      {/* Viewport */}
      <div className="full-player-view">
        <svg id="playerSvg" viewBox="0 0 480 300" />
        <div className="player-overlay player-tc">{fmtTime(player.movieTime)}</div>
        <div className="player-overlay player-sc">{scene?.num} · {scene?.title}</div>
        {player.dlg && <div className="player-overlay player-sub">{scene?.sub}</div>}

        {isGame && (
          <div className="game-hud">
            <div className="game-obj"><i className="ti ti-target" /> Задача: дойти до картины Минаса</div>
            <div className="game-energy">
              <span className="game-energy-lab">энергия</span>
              <div className="energy-bar"><div className="energy-fill" style={{ width: '78%' }} /></div>
            </div>
            <div className="game-hint" id="gameHint" style={{ display: 'none' }}><b>E</b> осмотреть «Минас Аветисян»</div>
            <div className="dpad">
              <span />
              <button data-d="up"    aria-label="вверх"   onPointerDown={e => { e.preventDefault(); startDpadMove('up');    }} onPointerUp={stopDpadMove} onPointerLeave={stopDpadMove}><i className="ti ti-chevron-up" /></button>
              <span />
              <button data-d="left"  aria-label="влево"   onPointerDown={e => { e.preventDefault(); startDpadMove('left');  }} onPointerUp={stopDpadMove} onPointerLeave={stopDpadMove}><i className="ti ti-chevron-left" /></button>
              <button data-d="act"   aria-label="действие" style={{ background: 'rgba(93,202,165,0.45)' }} onClick={actInteract}><i className="ti ti-hand-finger" /></button>
              <button data-d="right" aria-label="вправо"  onPointerDown={e => { e.preventDefault(); startDpadMove('right'); }} onPointerUp={stopDpadMove} onPointerLeave={stopDpadMove}><i className="ti ti-chevron-right" /></button>
              <span />
              <button data-d="down"  aria-label="вниз"    onPointerDown={e => { e.preventDefault(); startDpadMove('down');  }} onPointerUp={stopDpadMove} onPointerLeave={stopDpadMove}><i className="ti ti-chevron-down" /></button>
              <span />
            </div>
          </div>
        )}
      </div>

      {/* Transport bar */}
      {!isGame && (
        <div className="full-player-trans">
          <button className="play-btn" onClick={() => setPlayer({ isPlaying: !player.isPlaying })}>
            <i className={`ti ${player.isPlaying ? 'ti-player-pause' : 'ti-player-play'}`} />
          </button>
          <div className="scrub-bar" onClick={handleScrub}>
            <div className="scrub-progress" style={{ width: `${pct}%` }} />
            <div className="scrub-handle"   style={{ left:  `${pct}%` }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            {fmtTime(player.movieTime)} / 14:32
          </span>
        </div>
      )}

      {/* Controls */}
      <div className="full-player-ctrls">
        <div className="fp-grid">
          <div className="fld" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ minWidth: 56, margin: 0, flexShrink: 0 }}>Темп</span>
            <input
              type="range" min={0} max={100} step={1} value={player.tempo}
              style={{ flex: 1 }}
              onChange={e => setPlayer({ tempo: +e.target.value })}
            />
            <output style={{ minWidth: 84, textAlign: 'right', fontSize: 12, fontWeight: 500 }}>
              {player.tempo < 25 ? 'спокойный' : player.tempo < 55 ? 'размеренный' : player.tempo < 80 ? 'живой' : 'динамичный'}
            </output>
          </div>
          <div className="fld" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ minWidth: 56, margin: 0, flexShrink: 0 }}>Диалоги</span>
            <div className="seg-btn" style={{ width: 'auto', flex: 1 }}>
              <button className={player.dlg ? 'on' : ''} onClick={() => setPlayer({ dlg: true })} style={{ flex: 1 }}>есть</button>
              <button className={!player.dlg ? 'on' : ''} onClick={() => setPlayer({ dlg: false })} style={{ flex: 1 }}>без слов</button>
            </div>
          </div>
        </div>
        <div className="fld">
          <span>Камера</span>
          <div className="chip-group">
            {CAM_OPTS.map(c => (
              <button
                key={c.id}
                className={`chip${player.cam === c.id ? ' on' : ''}`}
                onClick={() => setPlayer({ cam: c.id })}
              >
                <i className={`ti ${c.icon}`} /> {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="fld">
          <span>Палитра</span>
          <div className="chip-group">
            {PAL_OPTS.map(p => (
              <button
                key={p.id}
                className={`chip${player.pal === p.id ? ' on' : ''}`}
                onClick={() => setPlayer({ pal: p.id })}
              >
                <i className={`ti ${p.icon}`} /> {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="fp-actions">
          {!isGame && (
            <button className="btn" style={{ width: 'auto', padding: '8px 14px' }} onClick={enterGame}>
              <i className="ti ti-device-gamepad-2" /> Войти в игру
            </button>
          )}
          {isGame && (
            <button className="btn" style={{ width: 'auto', padding: '8px 14px' }} onClick={exitGame}>
              <i className="ti ti-arrow-back-up" /> Вернуться в фильм
            </button>
          )}
          {!isGame && (
            <button className="btn" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => showToast('Перезапуск генерации текущего момента...')}>
              <i className="ti ti-refresh" /> Переснять момент
            </button>
          )}
          {isGame && (
            <button className="btn" style={{ width: 'auto', padding: '8px 14px' }} onClick={() => showToast('Геймплей сохранён как форк для pull-request...')}>
              <i className="ti ti-git-fork" /> Сохранить форк
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
