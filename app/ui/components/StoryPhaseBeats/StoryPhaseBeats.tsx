import cn from "classnames";
import styles from "./StoryPhaseBeats.module.css";

const storyPhases = [
    { key: "exposition", label: "Экспозиция" },
    { key: "inciting", label: "Завязка" },
    { key: "rising", label: "Развитие" },
    { key: "climax", label: "Кульминация" },
    { key: "resolution", label: "Развязка" },
] as const;

export type StoryPhase = (typeof storyPhases)[number]["key"];

export function StoryPhaseBeats({
    value,
    onChange,
}: {
    value: string;
    onChange: (phase: StoryPhase) => void;
}) {
    return (
        <div className={styles.storyBeatWrapper}>
            <div className={styles.beatProgressLine} />
            <div className={styles.beatSteps}>
                {storyPhases.map((phase) => {
                    const isActive = value === phase.key;
                    return (
                        <div
                            key={phase.key}
                            className={cn(styles.beatStep, isActive && styles.beatStepActive)}
                            onClick={() => onChange(phase.key)}>
                            <div className={styles.beatNode}>
                                {isActive && <div className={styles.beatNodePulse} />}
                            </div>
                            <span className={styles.beatLabel}>{phase.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
