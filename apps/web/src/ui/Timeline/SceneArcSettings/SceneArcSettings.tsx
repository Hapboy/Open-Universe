import cn from "classnames";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import { useNarrativeContext } from "@/store/contexts/NarrativeContext.tsx";
import { CONFLICT_TARGETS } from "@hayverse/shared";
import styles from "@/ui/Timeline/Timeline.module.css";

const loreOptions = [
    { key: "ara_past", label: "Прошлое Ары" },
    { key: "sevan_mystery", label: "Секрет Севана" },
    { key: "kond_secret", label: "Тайны Конда" },
    { key: "anomaly", label: "Аномалия лора" },
];

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

    const toggleLoreRevelation = (key: string) => {
        const list = activeSettings.loreRevelations || [];
        const updated = list.includes(key) ? list.filter((k) => k !== key) : [...list, key];
        updateNarrativeSettings(activeSceneId, { loreRevelations: updated });
    };

    return (
        <div className={styles.arcSettingsWrapper}>
            <div className={styles.settingsGrid}>
                {/* Conflict Matrix & Lore Revelation Checkboxes — the other two
                    arc columns (emotional trend/tension, story phase/pacing)
                    now live on the Output Scene node's own "Арка" tag group. */}
                <div className={styles.arcCol}>
                    <div className={styles.columnHeader}>
                        <i className="ti ti-git-fork" />
                        <span>Конфликт и раскрытие Лор-тайн</span>
                    </div>

                    <div className={styles.conflictLoreRow}>
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
                                    {CONFLICT_TARGETS.map((target) => {
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
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className={styles.loreWrapper}>
                            <span className={styles.loreTitle}>Открытия Лор-линий</span>
                            <div className={styles.loreBadges}>
                                {loreOptions.map((opt) => {
                                    const isChecked = (
                                        activeSettings.loreRevelations || []
                                    ).includes(opt.key);
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
        </div>
    );
}
