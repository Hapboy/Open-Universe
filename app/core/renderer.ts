import { SCENES, TOTAL_DURATION } from '../data/scenes.ts';
import type { Palette, PlayerState, TeamMember, CurrentUser } from '../types.ts';

const PALS: Palette[] = [
  { sky:'#FAEEDA', orb:'#EF9F27', ground:'#C0DD97', wall:'#F0997B', brick:'#D85A30', frame:'#633806', fig:'#534AB7', art:'#0F6E56', sofa:'#BA7517' },
  { sky:'#E6F1FB', orb:'#B5D4F4', ground:'#D3D1C7', wall:'#85B7EB', brick:'#378ADD', frame:'#0C447C', fig:'#185FA5', art:'#1D9E75', sofa:'#888780' },
  { sky:'#26215C', orb:'#CECBF6', ground:'#1c1c2e', wall:'#3C3489', brick:'#534AB7', frame:'#AFA9EC', fig:'#F0997B', art:'#5DCAA5', sofa:'#7F77DD' },
  { sky:'#D3D1C7', orb:'#F1EFE8', ground:'#B4B2A9', wall:'#888780', brick:'#5F5E5A', frame:'#2C2C2A', fig:'#2C2C2A', art:'#444441', sofa:'#5F5E5A' }
];

export function fmtTime(s: number): string {
  s = Math.max(0, Math.round(s));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

export interface RenderCtx {
  player: PlayerState;
  team: TeamMember[];
  currentUser: CurrentUser | null;
  customRenderImage?: string | null;
}

export function buildSceneSvg(ctx: RenderCtx): string {
  const p = PALS[ctx.player.pal ?? 0];
  return ctx.player.cam === 'top'
    ? topDown(p, ctx.player)
    : eyeLevel(p, ctx.player.cam === 'side', ctx.player.cam === 'one', ctx.player, ctx.team, ctx.currentUser, ctx.customRenderImage);
}

function eyeLevel(
  p: Palette,
  mirror: boolean,
  one: boolean,
  player: PlayerState,
  team: TeamMember[],
  currentUser: CurrentUser | null,
  customRenderImage?: string | null
): string {
  const isGame = player.playerMode === 'game';
  const fx = isGame ? player.gameAv.x : 120;
  const fy = isGame ? Math.max(212, Math.min(280, player.gameAv.y)) : 238;

  let g = '';
  g += `<rect x="0" y="0" width="480" height="300" fill="${p.sky}"/>`;
  g += `<circle cx="${mirror ? 83 : 405}" cy="64" r="20" fill="${p.orb}" opacity="0.9"/>`;
  g += `<rect x="0" y="208" width="480" height="92" fill="${p.ground}"/>`;

  const bx = mirror ? 30 : 270;
  g += `<rect x="${bx}" y="70" width="180" height="138" fill="${p.wall}"/>`;
  g += `<rect x="${bx}" y="62" width="180" height="12" fill="${p.brick}"/>`;

  const wx = bx + 112;
  g += `<rect x="${wx}" y="96" width="46" height="56" fill="${p.sky}" stroke="${p.frame}" stroke-width="3"/>`;
  g += `<path d="M${wx} 96 q23 -20 46 0" fill="none" stroke="${p.frame}" stroke-width="3"/>`;

  const ax = bx + 25;
  g += `<rect x="${ax}" y="104" width="38" height="30" fill="${p.art}" stroke="${p.frame}" stroke-width="2"/>`;
  g += `<path d="M${ax} 130 l10 -14 l8 10 l9 -12 l11 16 z" fill="${p.sky}" opacity="0.5"/>`;

  g += `<rect x="90" y="190" width="115" height="18" rx="5" fill="${p.sofa}"/>`;
  g += `<rect x="90" y="182" width="115" height="10" rx="4" fill="${p.frame}" opacity="0.4"/>`;

  if (customRenderImage) {
    g += `<g opacity="0.95">
      <rect x="30" y="40" width="420" height="170" rx="10" fill="#222" stroke="${p.frame}" stroke-width="2"/>
      <image href="${customRenderImage}" x="34" y="44" width="412" height="162" preserveAspectRatio="xMidYMid slice"/>
      <rect x="40" y="50" width="130" height="24" rx="4" fill="rgba(0,0,0,0.6)"/>
      <text x="50" y="66" fill="#fff" font-size="10" font-family="sans-serif">Higgsfield Soul Live</text>
    </g>`;
  }

  g += drawActor(fx, fy, p.fig, '#E8B07A', 'Ара Гехецик');

  if (!isGame) {
    if (player.activeSceneIndex === 7) {
      let sx = fx + 55;
      team.forEach((dev, idx) => {
        g += drawActor(sx, 240 + (idx % 2) * 5, sideColor(dev.side), '#D8995F', dev.charName, dev.role);
        sx += 50;
      });
      if (currentUser) {
        g += drawActor(sx, 242, sideColor(currentUser.side), '#EBB98C', `${currentUser.charName} (Вы)`, currentUser.role, true);
      }
    } else {
      g += drawActor(fx + 50, fy + 4, '#378ADD', '#E6A878', 'Анаит');
    }
  }

  return g;
}

function topDown(p: Palette, player: PlayerState): string {
  const isGame = player.playerMode === 'game';
  const ax = isGame ? Math.max(78, Math.min(402, player.gameAv.x)) : 240;
  const ay = isGame ? Math.max(36, Math.min(189, player.gameAv.y)) : 112;

  let g = '';
  g += `<rect x="0" y="0" width="480" height="300" fill="${p.ground}"/>`;
  g += `<rect x="68" y="26" width="344" height="174" fill="${p.wall}" opacity="0.45" stroke="${p.frame}" stroke-width="3"/>`;
  g += `<rect x="90" y="45" width="90" height="35" rx="5" fill="${p.sofa}"/>`;
  g += `<rect x="323" y="26" width="52" height="8" fill="${p.art}"/>`;
  g += `<rect x="225" y="192" width="45" height="8" fill="${p.frame}" opacity="0.4"/>`;
  g += `<circle cx="360" cy="48" r="5" fill="${p.art}"/>`;
  g += `<circle cx="${ax}" cy="${ay}" r="9" fill="${p.fig}"/>`;
  g += `<path d="M${ax} ${ay - 13} l5 7 l-10 0 z" fill="${p.fig}"/>`;
  return g;
}

function sideColor(side: string): string {
  if (side === 'urvakan')     return 'var(--color-node-higgsfield)';
  if (side === 'rambalkoshe') return 'var(--color-node-util)';
  return 'var(--color-node-scene)';
}

function drawActor(
  x: number, feetY: number,
  clothesColor: string, skinColor: string,
  name: string, role = '', highlight = false
): string {
  const h = 32;
  const outline = highlight ? `stroke="#ef9f27" stroke-width="2"` : '';

  let g = `<g>
    <line x1="${x}" y1="${feetY - h}" x2="${x}" y2="${feetY - h * 0.45}" stroke="${clothesColor}" stroke-width="8" stroke-linecap="round" ${outline}/>
    <circle cx="${x}" cy="${feetY - h - 5}" r="6" fill="${skinColor}" ${outline}/>
    <line x1="${x}" y1="${feetY - h * 0.45}" x2="${x - 6}" y2="${feetY}" stroke="${clothesColor}" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="${x}" y1="${feetY - h * 0.45}" x2="${x + 6}" y2="${feetY}" stroke="${clothesColor}" stroke-width="4.5" stroke-linecap="round"/>`;

  const r = role.toLowerCase();
  if (r === 'разработчик' || r === 'developer') {
    g += `<rect x="${x + 4}" y="${feetY - 22}" width="10" height="7" rx="1" fill="#bbb"/>`;
    g += `<line x1="${x + 4}" y1="${feetY - 15}" x2="${x + 14}" y2="${feetY - 15}" stroke="#999" stroke-width="2"/>`;
  } else if (r === 'художник' || r === 'artist') {
    g += `<circle cx="${x - 10}" cy="${feetY - 16}" r="4" fill="#a4d" opacity="0.8"/>`;
  } else if (r === 'режиссер' || r === 'director') {
    g += `<polygon points="${x + 4},${feetY - 24} ${x + 14},${feetY - 28} ${x + 14},${feetY - 20}" fill="#ef9f27"/>`;
  }

  g += `
    <rect x="${x - 24}" y="${feetY - h - 22}" width="48" height="10" rx="2" fill="rgba(20,20,20,0.8)"/>
    <text x="${x}" y="${feetY - h - 14}" fill="#fff" font-size="6.5" font-family="sans-serif" text-anchor="middle" font-weight="600">${name}</text>
  </g>`;

  return g;
}

export function sceneAt(movieTime: number): number {
  return Math.min(SCENES.length - 1, Math.floor(movieTime / (TOTAL_DURATION / SCENES.length)));
}

export { SCENES, TOTAL_DURATION };
