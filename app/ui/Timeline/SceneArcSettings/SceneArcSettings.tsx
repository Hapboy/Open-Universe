import cn from "classnames";
import { useGraphContext } from "../../../store/contexts/GraphContext.tsx";
import { useNarrativeContext } from "../../../store/contexts/NarrativeContext.tsx";
import styles from "../Timeline.module.css";

const storyPhases = [
    { key: "exposition", label: "Экспозиция" },
    { key: "inciting", label: "Завязка" },
    { key: "rising", label: "Развитие" },
    { key: "climax", label: "Кульминация" },
    { key: "resolution", label: "Развязка" },
] as const;

const loreOptions = [
    { key: "ara_past", label: "Прошлое Ары" },
    { key: "sevan_mystery", label: "Секрет Севана" },
    { key: "kond_secret", label: "Тайны Конда" },
    { key: "anomaly", label: "Аномалия лора" },
];

const pacingLabels = {
    slow: "Медленный",
    moderate: "Умеренный",
    fast: "Быстрый",
    action: "Динамичный",
} as const;

const conflictTargetLabels = {
    man_vs_man: "человек против человека",
    man_vs_nature: "человек против природы",
    man_vs_society: "человек против общества",
} as const;

export function SceneArcSettings() {
    const { activeSceneId } = useGraphContext();
    const { getSceneNarrativeSettings, updateNarrativeSettings } = useNarrativeContext();
    // Defensive: Timeline's empty-state gate already prevents this component
    // from rendering when there's no active scene.
    if (!activeSceneId) return null;
    const activeSettings = getSceneNarrativeSettings(activeSceneId);

    // Calculate dynamic curve path rotating around center (225, 55)
    const getCurvePath = () => {
        const angleRad = (activeSettings.emotionalTrend * Math.PI) / 400;
        const dx = 150 * Math.cos(angleRad);
        const dy = 150 * Math.sin(angleRad);
        const cx = 225;
        const cy = 55;
        const x1 = cx - dx;
        const y1 = cy + dy;
        const x2 = cx + dx;
        const y2 = cy - dy;

        if (activeSettings.curveType === "ease_in") {
            return `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.55} ${y1}, ${x2 - (x2 - x1) * 0.15} ${y2 - (y2 - y1) * 0.1}, ${x2} ${y2}`;
        }
        if (activeSettings.curveType === "ease_out") {
            return `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.15} ${y1 + (y2 - y1) * 0.1}, ${x2 - (x2 - x1) * 0.55} ${y2}, ${x2} ${y2}`;
        }
        if (activeSettings.curveType === "ease_in_out") {
            return `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.45} ${y1}, ${x2 - (x2 - x1) * 0.45} ${y2}, ${x2} ${y2}`;
        }
        return `M ${x1} ${y1} L ${x2} ${y2}`;
    };

    // Tension level dynamic visual styling
    const getTensionColor = (level: number) => {
        if (level < 30) return "#5DCAA5"; // Green
        if (level < 70) return "#EF9F27"; // Amber
        return "#D4537E"; // Neon Red
    };

    const toggleLoreRevelation = (key: string) => {
        const list = activeSettings.loreRevelations || [];
        const updated = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
        updateNarrativeSettings(activeSceneId, { loreRevelations: updated });
    };

    return (
        <div className={styles.arcSettingsWrapper}>
            <div className={styles.settingsGrid}>
                {/* Column 1: Emotional Curve & Tension Gauge */}
                <div className={styles.arcCol}>
                    <div className={styles.columnHeader}>
                        <i className="ti ti-trending-up" />
                        <span>Эмоциональный тренд и Напряжение</span>
                    </div>

                    <div className={styles.emotionalBox}>
                        <svg className={styles.emotionalSvg} viewBox="0 0 450 110">
                            <defs>
                                <marker
                                    id="arrow"
                                    viewBox="0 0 10 10"
                                    refX="5"
                                    refY="5"
                                    markerWidth="5"
                                    markerHeight="5"
                                    orient="auto">
                                    <path
                                        d="M 0 0 L 10 5 L 0 10 z"
                                        fill="var(--color-text-primary)"
                                    />
                                </marker>
                                <pattern
                                    id="grid"
                                    width="20"
                                    height="20"
                                    patternUnits="userSpaceOnUse">
                                    <path
                                        d="M 20 0 L 0 0 0 20"
                                        fill="none"
                                        stroke="rgba(241, 239, 232, 0.03)"
                                        strokeWidth="1"
                                    />
                                </pattern>
                            </defs>
                            <rect width="450" height="110" fill="url(#grid)" />
                            <path
                                d={getCurvePath()}
                                stroke="var(--color-text-primary)"
                                strokeWidth="2.5"
                                markerEnd="url(#arrow)"
                                fill="none"
                            />
                            <text x="25" y="100" className={styles.svgText} textAnchor="start">
                                Положительные
                            </text>
                            <text x="425" y="18" className={styles.svgText} textAnchor="end">
                                Негативные
                            </text>
                            <text
                                x="225"
                                y="60"
                                className={styles.svgLabelText}
                                textAnchor="middle">
                                Эмоциональная линия
                            </text>
                        </svg>
                    </div>

                    <div className={styles.arcSlidersRow}>
                        <div className={styles.sliderBox}>
                            <span className={styles.sliderLabel}>
                                Угол тренда: {activeSettings.emotionalTrend}%
                            </span>
                            <input
                                type="range"
                                min="-100"
                                max="100"
                                value={activeSettings.emotionalTrend}
                                onChange={(e) =>
                                    updateNarrativeSettings(activeSceneId, {
                                        emotionalTrend: Number(e.target.value),
                                    })
                                }
                                className={styles.settingsSlider}
                            />
                        </div>

                        <div className={styles.sliderBox}>
                            <span className={styles.sliderLabel}>Форма кривой:</span>
                            <select
                                value={activeSettings.curveType}
                                onChange={(e) =>
                                    updateNarrativeSettings(activeSceneId, {
                                        curveType: e.target.value as
                                            "linear" | "ease_in" | "ease_out" | "ease_in_out",
                                    })
                                }
                                className={styles.curveSelect}>
                                <option value="linear">Линейная</option>
                                <option value="ease_in">Ускорение</option>
                                <option value="ease_out">Замедление</option>
                                <option value="ease_in_out">S-образная</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.sliderBox} style={{ marginTop: "2px" }}>
                        <span className={styles.sliderLabel}>
                            Напряжение:{" "}
                            <span
                                style={{
                                    color: getTensionColor(activeSettings.tensionLevel),
                                    fontWeight: "bold",
                                }}>
                                {activeSettings.tensionLevel}%
                            </span>
                        </span>
                        <div className={styles.tensionSliderContainer}>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={activeSettings.tensionLevel}
                                onChange={(e) =>
                                    updateNarrativeSettings(activeSceneId, {
                                        tensionLevel: Number(e.target.value),
                                    })
                                }
                                className={styles.settingsSlider}
                            />
                            <div
                                className={styles.tensionGlowBar}
                                style={{
                                    width: `${activeSettings.tensionLevel}%`,
                                    backgroundColor: getTensionColor(activeSettings.tensionLevel),
                                    boxShadow: `0 0 8px ${getTensionColor(activeSettings.tensionLevel)}`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Column 2: Story Beat Steps & Pacing Chips */}
                <div className={styles.arcCol}>
                    <div className={styles.columnHeader}>
                        <i className="ti ti-git-commit" />
                        <span>Фаза сюжета и Ритм</span>
                    </div>

                    {/* Horizontal Story Beat Steps selector */}
                    <div className={styles.storyBeatWrapper}>
                        <div className={styles.beatProgressLine} />
                        <div className={styles.beatSteps}>
                            {storyPhases.map((phase) => {
                                const isActive = activeSettings.storyPhase === phase.key;
                                return (
                                    <div
                                        key={phase.key}
                                        className={cn(
                                            styles.beatStep,
                                            isActive && styles.beatStepActive,
                                        )}
                                        onClick={() =>
                                            updateNarrativeSettings(activeSceneId, {
                                                storyPhase: phase.key,
                                            })
                                        }>
                                        <div className={styles.beatNode}>
                                            {isActive && <div className={styles.beatNodePulse} />}
                                        </div>
                                        <span className={styles.beatLabel}>{phase.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pacing selection pills */}
                    <div className={styles.pacingContainer}>
                        <span className={styles.pacingTitle}>Ритм сцены (Pacing)</span>
                        <div className={styles.pacingPills}>
                            {(["slow", "moderate", "fast", "action"] as const).map((mode) => {
                                const isActive = activeSettings.pacing === mode;
                                return (
                                    <button
                                        key={mode}
                                        className={cn(
                                            styles.pacingPill,
                                            isActive && styles.pacingPillActive,
                                        )}
                                        onClick={() =>
                                            updateNarrativeSettings(activeSceneId, { pacing: mode })
                                        }>
                                        {pacingLabels[mode]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Column 3: Conflict Matrix & Lore Revelation Checkboxes */}
                <div className={styles.arcCol}>
                    <div className={styles.columnHeader}>
                        <i className="ti ti-git-fork" />
                        <span>Конфликт и раскрытие Лор-тайн</span>
                    </div>

                    {/* Custom Conflict Grid layout */}
                    <div className={styles.conflictMatrixWrapper}>
                        <div className={styles.conflictMatrixHeader}>Конфликт сцены</div>
                        <div className={styles.conflictMatrixGrid}>
                            <div className={styles.conflictLeftCol}>
                                <button
                                    className={cn(
                                        styles.conflictBtnLeft,
                                        activeSettings.conflictType === "physical" &&
                                            styles.conflictBtnLeftActive,
                                    )}
                                    onClick={() =>
                                        updateNarrativeSettings(activeSceneId, {
                                            conflictType: "physical",
                                        })
                                    }>
                                    {activeSettings.conflictType === "physical" && (
                                        <i className="ti ti-arrow-right" />
                                    )}
                                    <span>Физический</span>
                                </button>
                                <button
                                    className={cn(
                                        styles.conflictBtnLeft,
                                        activeSettings.conflictType === "psychological" &&
                                            styles.conflictBtnLeftActive,
                                    )}
                                    onClick={() =>
                                        updateNarrativeSettings(activeSceneId, {
                                            conflictType: "psychological",
                                        })
                                    }>
                                    {activeSettings.conflictType === "psychological" && (
                                        <i className="ti ti-arrow-right" />
                                    )}
                                    <span>Психологический</span>
                                </button>
                            </div>

                            <div className={styles.conflictRightCol}>
                                {(["man_vs_man", "man_vs_nature", "man_vs_society"] as const).map(
                                    (target) => {
                                        const isActive = activeSettings.conflictTarget === target;
                                        return (
                                            <button
                                                key={target}
                                                className={cn(
                                                    styles.conflictBtnRight,
                                                    isActive && styles.conflictBtnRightActive,
                                                )}
                                                onClick={() =>
                                                    updateNarrativeSettings(activeSceneId, {
                                                        conflictTarget: target,
                                                    })
                                                }>
                                                {conflictTargetLabels[target]}
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Lore checkbox badges */}
                    <div className={styles.loreWrapper}>
                        <span className={styles.loreTitle}>Открытия Лор-линий</span>
                        <div className={styles.loreBadges}>
                            {loreOptions.map((opt) => {
                                const isChecked = (activeSettings.loreRevelations || []).includes(
                                    opt.key,
                                );
                                return (
                                    <button
                                        key={opt.key}
                                        className={cn(
                                            styles.loreBadge,
                                            isChecked && styles.loreBadgeActive,
                                        )}
                                        onClick={() => toggleLoreRevelation(opt.key)}>
                                        <i
                                            className={cn(
                                                isChecked ? "ti ti-checkbox" : "ti ti-square",
                                            )}
                                        />
                                        <span>{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
