import { useCallback, useEffect, useState } from "react";
import cn from "classnames";
import { useUserContext } from "../../store/contexts/UserContext.tsx";
import { useToastContext } from "../../store/contexts/ToastContext.tsx";
import { useGraphContext } from "../../store/contexts/GraphContext.tsx";
import { usePresetLibraryContext } from "../../store/contexts/PresetLibraryContext.tsx";
import { useModalContext } from "../../store/contexts/ModalContext.tsx";
import type { CurrentUser } from "../../types.ts";
import { TEAM_SIDES, TEAM_ROLES, type TeamSide, type TeamRole } from "../../types/enums.ts";
import { SelectField } from "../components/SelectField/SelectField.tsx";
import { TextField } from "../components/TextField/TextField.tsx";
import { collectLiveMediaRefs, listBlobIds, sweepUnusedBlobs } from "../../core/blobStore.ts";
import styles from "./Modals.module.css";

function sideColor(side: string): string {
    if (side === "urvakan") return "var(--color-node-higgsfield)";
    if (side === "rambalkoshe") return "var(--color-node-util)";
    return "var(--color-node-scene)";
}

const SIDE_LABELS: Record<TeamSide, string> = {
    urvakan: "Urvakan (Авангард, музыкальные архивы)",
    rambalkoshe: "Rambalkoshe (Визуальное искусство, модерн)",
    moct: "Moct (Современная архитектура, мосты культур)",
};

const ROLE_LABELS: Record<TeamRole, string> = {
    Режиссер: "Режиссер (Director)",
    Разработчик: "Разработчик (Developer)",
    Художник: "Художник (Artist)",
    Стилист: "Стилист (Stylist)",
};

export function Modals() {
    const { modalType, closeModal } = useModalContext();

    return (
        <>
            {modalType === "onboard" && <OnboardModal onClose={closeModal} />}
            {modalType === "team" && <TeamModal onClose={closeModal} />}
            {modalType === "storage" && <StorageModal onClose={closeModal} />}
        </>
    );
}

// ── Onboarding ────────────────────────────────────────────────────────────────

function OnboardModal({ onClose }: { onClose: () => void }) {
    const { setCurrentUser } = useUserContext();
    const { showToast } = useToastContext();
    const [name, setName] = useState("");
    const [charName, setCharName] = useState("");
    const [side, setSide] = useState<TeamSide>("urvakan");
    const [role, setRole] = useState<TeamRole>("Режиссер");

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
                        onChange={(v) => setSide(v as TeamSide)}
                        options={TEAM_SIDES.map((value) => ({ value, label: SIDE_LABELS[value] }))}
                    />
                    <SelectField
                        label="Роль во вселенной"
                        value={role}
                        onChange={(v) => setRole(v as TeamRole)}
                        options={TEAM_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))}
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
