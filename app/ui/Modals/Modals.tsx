import { useCallback, useEffect, useState } from "react";
import cn from "classnames";
import { useUserContext } from "../../store/contexts/UserContext.tsx";
import { useToastContext } from "../../store/contexts/ToastContext.tsx";
import { useGraphContext } from "../../store/contexts/GraphContext.tsx";
import { usePresetLibraryContext } from "../../store/contexts/PresetLibraryContext.tsx";
import type { CurrentUser } from "../../types.ts";
import { SelectField } from "../components/SelectField/SelectField.tsx";
import { TextField } from "../components/TextField/TextField.tsx";
import { collectLiveMediaRefs, listBlobIds, sweepUnusedBlobs } from "../../core/blobStore.ts";
import styles from "./Modals.module.css";

function sideColor(side: string): string {
    if (side === "urvakan") return "var(--color-node-higgsfield)";
    if (side === "rambalkoshe") return "var(--color-node-util)";
    return "var(--color-node-scene)";
}

// Open a modal by dispatching a custom event from Topbar buttons
// (buttons use data-open-modal attribute handled here)
export function Modals() {
    const { currentUser } = useUserContext();
    // Show onboarding on first load
    const [openModal, setOpenModal] = useState<"team" | "onboard" | "storage" | null>(() =>
        currentUser ? null : "onboard",
    );

    useEffect(() => {
        // Listen for topbar buttons that use data-open-modal
        const handler = (e: MouseEvent) => {
            const btn = (e.target as Element).closest("[data-open-modal]") as HTMLElement | null;
            if (btn?.dataset.openModal) {
                setOpenModal(btn.dataset.openModal as "team");
            }
        };
        document.addEventListener("click", handler);
        return () => document.removeEventListener("click", handler);
    }, []);

    const close = () => setOpenModal(null);

    return (
        <>
            {openModal === "onboard" && <OnboardModal onClose={close} />}
            {openModal === "team" && <TeamModal onClose={close} />}
            {openModal === "storage" && <StorageModal onClose={close} />}
        </>
    );
}

// ── Onboarding ────────────────────────────────────────────────────────────────

function OnboardModal({ onClose }: { onClose: () => void }) {
    const { setCurrentUser } = useUserContext();
    const { showToast } = useToastContext();
    const [name, setName] = useState("");
    const [charName, setCharName] = useState("");
    const [side, setSide] = useState("urvakan");
    const [role, setRole] = useState("Режиссер");

    const handleRegister = () => {
        if (!name.trim() || !charName.trim()) {
            showToast("Заполните все текстовые поля!");
            return;
        }
        const user: CurrentUser = { name: name.trim(), charName: charName.trim(), side, role };
        setCurrentUser(user);
        showToast(`Вы вошли под персонажем ${charName} во фракцию ${side.toUpperCase()}!`);
        onClose();
    };

    return (
        <div className={styles.modal}>
            <div className={styles.sheet}>
                <div className={styles.sheetH}>
                    <h2>Войти в разработку</h2>
                </div>
                <div className={styles.sheetBody}>
                    <p className={styles.sub}>
                        Каждый разработчик создаёт своего персонажа, выбирает сторону и роль по
                        текущему сценарию. Твой персонаж попадёт в финальный фильм вместе с
                        вымышленными.
                    </p>
                    <TextField
                        label="Имя разработчика"
                        value={name}
                        onChange={setName}
                        placeholder="Введите имя..."
                    />
                    <TextField
                        label="Имя персонажа во вселенной"
                        value={charName}
                        onChange={setCharName}
                        placeholder="Введите имя персонажа..."
                    />
                    <SelectField
                        label="Фракция / сторона"
                        value={side}
                        onChange={setSide}
                        options={[
                            { value: "urvakan", label: "Urvakan (Авангард, музыкальные архивы)" },
                            {
                                value: "rambalkoshe",
                                label: "Rambalkoshe (Визуальное искусство, модерн)",
                            },
                            {
                                value: "moct",
                                label: "Moct (Современная архитектура, мосты культур)",
                            },
                        ]}
                    />
                    <SelectField
                        label="Роль во вселенной"
                        value={role}
                        onChange={setRole}
                        options={[
                            { value: "Режиссер", label: "Режиссер (Director)" },
                            { value: "Разработчик", label: "Разработчик (Developer)" },
                            { value: "Художник", label: "Художник (Artist)" },
                            { value: "Стилист", label: "Стилист (Stylist)" },
                        ]}
                    />
                    <br />
                    <button className={cn(styles.btn, styles.pri)} onClick={handleRegister}>
                        Войти в команду
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Team ──────────────────────────────────────────────────────────────────────

function TeamModal({ onClose }: { onClose: () => void }) {
    const { team, currentUser } = useUserContext();
    const all = [...team, ...(currentUser ? [{ ...currentUser, isMe: true }] : [])];

    return (
        <div className={styles.modal}>
            <div className={styles.sheet}>
                <div className={styles.sheetH}>
                    <h2>Команда разработки</h2>
                    <button className={styles.x} onClick={onClose}>
                        <i className="ti ti-x" />
                    </button>
                </div>
                <div className={styles.sheetBody}>
                    <div className={styles.devList}>
                        {all.map((dev, i) => (
                            <div key={i} className={styles.devItem}>
                                <div
                                    className={styles.devAvatar}
                                    style={{ background: sideColor(dev.side) }}>
                                    {dev.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className={styles.devInfo}>
                                    <div className={styles.devName}>
                                        {dev.name}
                                        {dev.isMe && <strong> (Вы)</strong>}
                                    </div>
                                    <div className={styles.devChar}>
                                        Персонаж: {dev.charName} · Роль: {dev.role}
                                    </div>
                                </div>
                                <div className={cn(styles.devBadge, styles[dev.side])}>
                                    {dev.side.toUpperCase()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Storage ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} Б`;
    const units = ["КБ", "МБ", "ГБ"];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex++;
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function StorageModal({ onClose }: { onClose: () => void }) {
    const { allSceneGraphs } = useGraphContext();
    const { library } = usePresetLibraryContext();
    const { showToast } = useToastContext();
    const [uploadedCount, setUploadedCount] = useState<number | null>(null);
    const [generatedCount, setGeneratedCount] = useState<number | null>(null);
    const [usedBytes, setUsedBytes] = useState<number | null>(null);
    const [sweeping, setSweeping] = useState(false);

    const refreshStats = useCallback(() => {
        listBlobIds()
            .then(({ uploaded, generated }) => {
                setUploadedCount(uploaded.length);
                setGeneratedCount(generated.length);
            })
            .catch(() => {
                setUploadedCount(null);
                setGeneratedCount(null);
            });
        navigator.storage
            ?.estimate?.()
            .then((est) => setUsedBytes(est.usage ?? null))
            .catch(() => setUsedBytes(null));
    }, []);

    useEffect(refreshStats, [refreshStats]);

    const handleSweep = async () => {
        setSweeping(true);
        const nodeParamsList = Object.values(allSceneGraphs).flatMap((g) =>
            g.nodes.map((n) => n.data.params),
        );
        const presetSnapshotList = Object.values(library).flatMap((presets) =>
            Object.values(presets),
        );
        const liveRefs = collectLiveMediaRefs(nodeParamsList, presetSnapshotList);
        const deleted = await sweepUnusedBlobs(liveRefs);
        showToast(
            deleted > 0
                ? `Удалено неиспользуемых файлов: ${deleted}`
                : "Неиспользуемых файлов не найдено",
        );
        setSweeping(false);
        refreshStats();
    };

    return (
        <div className={styles.modal}>
            <div className={styles.sheet}>
                <div className={styles.sheetH}>
                    <h2>Локальное хранилище</h2>
                    <button className={styles.x} onClick={onClose}>
                        <i className="ti ti-x" />
                    </button>
                </div>
                <div className={styles.sheetBody}>
                    <p className={styles.sub}>
                        Загруженные фото/обложки и сгенерированные изображения хранятся в IndexedDB
                        браузера, а не в localStorage — очистка ниже удаляет только те файлы, на
                        которые больше не ссылается ни одна сцена или пресет.
                    </p>
                    <div className={styles.statRow}>
                        <span>Загружено файлов</span>
                        <strong>{uploadedCount ?? "…"}</strong>
                    </div>
                    <div className={styles.statRow}>
                        <span>Сгенерировано изображений</span>
                        <strong>{generatedCount ?? "…"}</strong>
                    </div>
                    {usedBytes != null && (
                        <div className={styles.statRow}>
                            <span>Использовано места</span>
                            <strong>{formatBytes(usedBytes)}</strong>
                        </div>
                    )}
                    <br />
                    <button
                        className={cn(styles.btn, styles.pri)}
                        onClick={handleSweep}
                        disabled={sweeping}>
                        Очистить неиспользуемые файлы
                    </button>
                </div>
            </div>
        </div>
    );
}
