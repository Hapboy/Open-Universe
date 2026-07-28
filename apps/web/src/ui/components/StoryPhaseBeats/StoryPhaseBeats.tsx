import cn from "classnames";
import { STORY_PHASES, type StoryPhase } from "@hayverse/shared";
import styles from "./StoryPhaseBeats.module.css";

export type { StoryPhase };

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
                {STORY_PHASES.map((phase) => {
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
