import cn from "classnames";
import sharedStyles from "../../../styles/shared.module.css";
import styles from "./HistoryNav.module.css";

// A plain-flow prev/count/next + delete toolbar, for generation-history
// kinds MediaSlider's overlay chrome (fixed-aspect box, absolutely
// positioned nav buttons) doesn't suit — audio's thin control bar and
// text's variable-height block. Same interaction shape as MediaSlider's
// own nav/delete buttons, just laid out in normal flow instead of overlaid.
export function HistoryNav({
    index,
    count,
    onIndexChange,
    onDelete,
}: {
    index: number;
    count: number;
    onIndexChange: (i: number) => void;
    onDelete?: () => void;
}) {
    if (count <= 1 && !onDelete) return null;
    return (
        <div className={styles.bar}>
            {count > 1 && (
                <>
                    <button
                        className={sharedStyles.iconBtn}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onIndexChange((index - 1 + count) % count);
                        }}>
                        <i className="ti ti-chevron-left" />
                    </button>
                    <span className={styles.count}>
                        {index + 1}/{count}
                    </span>
                    <button
                        className={sharedStyles.iconBtn}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            onIndexChange((index + 1) % count);
                        }}>
                        <i className="ti ti-chevron-right" />
                    </button>
                </>
            )}
            <div className={sharedStyles.spacer} />
            {onDelete && (
                <button
                    className={cn(sharedStyles.iconBtn, styles.del)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}>
                    <i className="ti ti-trash" />
                </button>
            )}
        </div>
    );
}
