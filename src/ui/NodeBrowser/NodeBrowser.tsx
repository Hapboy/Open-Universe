import { useEffect, useMemo, useRef, useState } from "react";
import cn from "classnames";
import { NODE_TEMPLATES, NODE_BROWSER_GROUPS } from "../../data/nodes.ts";
import type { NodeType } from "../../types/enums.ts";
import { CategoryTagGroup } from "../components/CategoryTagGroup/CategoryTagGroup.tsx";
import { SearchField } from "../components/SearchField/SearchField.tsx";
import styles from "./NodeBrowser.module.css";

const POPUP_WIDTH = 300;
const POPUP_MAX_HEIGHT = 420;

export function NodeBrowser({
    screenPos,
    onSelect,
    onClose,
}: {
    screenPos: { x: number; y: number };
    onSelect: (type: NodeType) => void;
    onClose: () => void;
}) {
    const [query, setQuery] = useState("");
    const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>({});
    const [highlight, setHighlight] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const categoryOptions = useMemo(
        () => NODE_BROWSER_GROUPS.map((g) => ({ key: g.label, label: g.label })),
        [],
    );
    const isAnyCategoryActive = Object.values(activeCategories).some(Boolean);

    const items = useMemo(() => {
        const q = query.trim().toLowerCase();
        return NODE_BROWSER_GROUPS.flatMap((group) => {
            if (isAnyCategoryActive && !activeCategories[group.label]) return [];
            return group.types
                .map((type) => NODE_TEMPLATES[type])
                .filter((t): t is NonNullable<typeof t> => !!t)
                .filter(
                    (t) =>
                        !q || t.label.toLowerCase().includes(q) || t.type.toLowerCase().includes(q),
                );
        });
    }, [query, activeCategories, isAnyCategoryActive]);

    const handleQueryChange = (v: string) => {
        setQuery(v);
        setHighlight(0);
    };

    const handleCategoryToggle = (key: string) => {
        setActiveCategories((a) => ({ ...a, [key]: !a[key] }));
        setHighlight(0);
    };

    useEffect(() => {
        const onPointerDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
                const picked = items[highlight];
                if (picked) onSelect(picked.type);
            }
        };
        window.addEventListener("mousedown", onPointerDown);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("mousedown", onPointerDown);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [items, highlight, onSelect, onClose]);

    const left = Math.min(screenPos.x, window.innerWidth - POPUP_WIDTH - 12);
    const top = Math.min(screenPos.y, window.innerHeight - POPUP_MAX_HEIGHT - 12);

    return (
        <div
            ref={ref}
            className={styles.browser}
            style={{ left: Math.max(12, left), top: Math.max(12, top) }}>
            <div className={styles.searchWrap}>
                <SearchField
                    value={query}
                    onChange={handleQueryChange}
                    placeholder="Поиск нод..."
                    autoFocus
                    variant="flush"
                />
            </div>
            <div className={styles.categories}>
                <CategoryTagGroup
                    options={categoryOptions}
                    active={activeCategories}
                    onToggle={handleCategoryToggle}
                />
            </div>
            <div className={styles.list}>
                {items.length === 0 && <div className={styles.empty}>Ничего не найдено</div>}
                {items.map((t, i) => (
                    <div
                        key={t.type}
                        className={cn(styles.item, i === highlight && styles.itemActive)}
                        style={{ "--nc": t.color } as React.CSSProperties}
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => onSelect(t.type)}>
                        <i className={`ti ${t.icon}`} />
                        <span>{t.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
