export interface MiseEnSceneDiagram {
    label: string;
    src: string;
}

const BASE = "/assets/mise-en-scene";

// Ключ — "<peopleCount>_<cameraCount>", с потолком peopleCount на 4 и
// cameraCount на 3 (см. getMiseEnSceneDiagrams), чтобы группы на 5+ актёров
// и любые дополнительные камеры переиспользовали уже готовые "4_*" схемы.
export const MISE_EN_SCENE_DIAGRAMS: Record<string, MiseEnSceneDiagram[]> = {
    "2_1": [
        { label: "Оверхед, крупный план", src: `${BASE}/2p_1cam_overhead-close.jpg` },
        { label: "Оверхед, широкий план", src: `${BASE}/2p_1cam_overhead-wide.jpg` },
        { label: "Через плечо (рендер)", src: `${BASE}/2p_1cam_ots-render.jpg` },
    ],
    "2_2": [
        { label: "Профиль, пересечение линий", src: `${BASE}/2p_2cam_side-crossed.jpg` },
        { label: "Профиль, параллельные линии", src: `${BASE}/2p_2cam_side-parallel.jpg` },
        { label: "Оверхед, вариант A", src: `${BASE}/2p_2cam_overhead-a.jpg` },
        { label: "Оверхед, вариант B", src: `${BASE}/2p_2cam_overhead-b.jpg` },
    ],
    "3_2": [{ label: "Переговоры стоя (рендер)", src: `${BASE}/3p_2cam_render-standing.jpg` }],
    "3_3": [
        {
            label: "Стол, треугольник камер (оверхед)",
            src: `${BASE}/3p_3cam_overhead-triangle.jpg`,
        },
    ],
    "4_1": [
        { label: "Группа, широкий план (оверхед)", src: `${BASE}/6p_1cam_overhead-wide.jpg` },
        { label: "Группа, узкий план (оверхед)", src: `${BASE}/6p_1cam_overhead-narrow.jpg` },
        { label: "Группа, общий план (рендер)", src: `${BASE}/6p_1cam_render-wide.jpg` },
        { label: "Группа, средний план (рендер)", src: `${BASE}/6p_1cam_render-medium.jpg` },
        {
            label: "Группа, крупный план через плечо (рендер)",
            src: `${BASE}/6p_1cam_render-close.jpg`,
        },
    ],
    "4_2": [{ label: "Группа, 2 камеры (оверхед)", src: `${BASE}/6p_2cam_overhead.jpg` }],
    "4_3": [{ label: "Группа, 3 камеры (оверхед)", src: `${BASE}/6p_3cam_overhead.jpg` }],
};

export function getMiseEnSceneDiagrams(
    peopleCount: number,
    cameraCount: number,
): MiseEnSceneDiagram[] {
    const p = Math.min(peopleCount, 4);
    const c = Math.min(cameraCount, 3);
    return MISE_EN_SCENE_DIAGRAMS[`${p}_${c}`] ?? [];
}
