import { useCallback, useEffect, useState } from "react";
import cn from "classnames";
import { ApiError } from "@hayverse/api-client";
import type { PinterestConnectionStatus } from "@hayverse/api-client";
import { useUserContext } from "../../store/contexts/UserContext.tsx";
import { useToastContext } from "../../store/contexts/ToastContext.tsx";
import { useGraphContext } from "../../store/contexts/GraphContext.tsx";
import { usePresetLibraryContext } from "../../store/contexts/PresetLibraryContext.tsx";
import { useModalContext } from "../../store/contexts/ModalContext.tsx";
import { hayverseApiClient } from "../../core/api/hayverse/client.ts";
import { TextField } from "../components/TextField/TextField.tsx";
import { collectLiveMediaRefs, listBlobIds, sweepUnusedBlobs } from "../../core/blobStore.ts";
import styles from "./Modals.module.css";

function sideColor(side: string): string {
    if (side === "urvakan") return "var(--color-node-higgsfield)";
    if (side === "rambalkoshe") return "var(--color-node-util)";
    return "var(--color-node-scene)";
}

export function Modals() {
    const { modalType, closeModal, openModal } = useModalContext();

    return (
        <>
            {modalType === "signup" && (
                <SignupModal onClose={closeModal} onSwitchToLogin={() => openModal("login")} />
            )}
            {modalType === "login" && (
                <LoginModal onClose={closeModal} onSwitchToSignup={() => openModal("signup")} />
            )}
            {modalType === "profile" && <ProfileModal onClose={closeModal} />}
            {modalType === "storage" && <StorageModal onClose={closeModal} />}
        </>
    );
}

// ── Signup / Login ──────────────────────────────────────────────────────────────

function SignupModal({
    onClose,
    onSwitchToLogin,
}: {
    onClose: () => void;
    onSwitchToLogin: () => void;
}) {
    const { signUp } = useUserContext();
    const { showToast } = useToastContext();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const handleSignUp = async () => {
        const result = await signUp({
            username,
            password,
            firstName,
            lastName: lastName.trim() || undefined,
        });
        if (!result.ok) {
            showToast(result.error);
            return;
        }
        showToast(`Добро пожаловать, ${firstName.trim()}!`);
        onClose();
    };

    return (
        <div className={styles.modal}>
            <div className={styles.sheet}>
                <div className={styles.sheetH}>
                    <h2>Регистрация</h2>
                </div>
                <div className={styles.sheetBody}>
                    <TextField
                        label="Имя пользователя"
                        value={username}
                        onChange={setUsername}
                        placeholder="Введите имя пользователя..."
                        autoFocus
                    />
                    <TextField
                        label="Пароль"
                        type="password"
                        value={password}
                        onChange={setPassword}
                        placeholder="Придумайте пароль..."
                    />
                    <TextField
                        label="Имя"
                        value={firstName}
                        onChange={setFirstName}
                        placeholder="Ваше имя..."
                    />
                    <TextField
                        label="Фамилия (необязательно)"
                        value={lastName}
                        onChange={setLastName}
                        placeholder="Ваша фамилия..."
                    />
                    <br />
                    <button
                        className={cn(styles.btn, styles.pri)}
                        onClick={() => void handleSignUp()}>
                        Зарегистрироваться
                    </button>
                    <button className={styles.switchLink} onClick={onSwitchToLogin}>
                        Уже есть аккаунт? Войти
                    </button>
                </div>
            </div>
        </div>
    );
}

function LoginModal({
    onClose,
    onSwitchToSignup,
}: {
    onClose: () => void;
    onSwitchToSignup: () => void;
}) {
    const { logIn } = useUserContext();
    const { showToast } = useToastContext();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleLogIn = async () => {
        const result = await logIn(username, password);
        if (!result.ok) {
            showToast(result.error);
            return;
        }
        onClose();
    };

    return (
        <div className={styles.modal}>
            <div className={styles.sheet}>
                <div className={styles.sheetH}>
                    <h2>Вход</h2>
                </div>
                <div className={styles.sheetBody}>
                    <TextField
                        label="Имя пользователя"
                        value={username}
                        onChange={setUsername}
                        placeholder="Введите имя пользователя..."
                        autoFocus
                    />
                    <TextField
                        label="Пароль"
                        type="password"
                        value={password}
                        onChange={setPassword}
                        placeholder="Введите пароль..."
                    />
                    <br />
                    <button
                        className={cn(styles.btn, styles.pri)}
                        onClick={() => void handleLogIn()}>
                        Войти
                    </button>
                    <button className={styles.switchLink} onClick={onSwitchToSignup}>
                        Нет аккаунта? Зарегистрироваться
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Profile ───────────────────────────────────────────────────────────────────

const PROFILE_TABS = [
    { key: "personal", label: "Личные данные" },
    { key: "team", label: "Команда" },
    { key: "integrations", label: "Интеграции" },
] as const;
type ProfileTab = (typeof PROFILE_TABS)[number]["key"];

function ProfileModal({ onClose }: { onClose: () => void }) {
    const [tab, setTab] = useState<ProfileTab>("personal");

    return (
        <div className={styles.modal}>
            <div className={styles.sheet}>
                <div className={styles.sheetH}>
                    <h2>Профиль</h2>
                    <button className={styles.x} onClick={onClose}>
                        <i className="ti ti-x" />
                    </button>
                </div>
                <div className={styles.tabRow}>
                    {PROFILE_TABS.map((t) => (
                        <button
                            key={t.key}
                            className={cn(styles.tabBtn, tab === t.key && styles.tabBtnActive)}
                            onClick={() => setTab(t.key)}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className={styles.sheetBody}>
                    {tab === "personal" && <PersonalDetailsTab />}
                    {tab === "team" && <TeamTab />}
                    {tab === "integrations" && <IntegrationsTab />}
                </div>
            </div>
        </div>
    );
}

function PersonalDetailsTab() {
    const { currentUser } = useUserContext();

    if (!currentUser) {
        return <p className={styles.sub}>Вы не авторизованы.</p>;
    }

    return (
        <div className={styles.devList}>
            <div className={styles.statRow}>
                <span>Имя пользователя</span>
                <strong>{currentUser.username}</strong>
            </div>
            <div className={styles.statRow}>
                <span>Имя</span>
                <strong>{currentUser.firstName}</strong>
            </div>
            {currentUser.lastName && (
                <div className={styles.statRow}>
                    <span>Фамилия</span>
                    <strong>{currentUser.lastName}</strong>
                </div>
            )}
            <div className={styles.statRow}>
                <span>Роль</span>
                <strong>{currentUser.role}</strong>
            </div>
        </div>
    );
}

function TeamTab() {
    const { team } = useUserContext();

    return (
        <div className={styles.devList}>
            {team.map((dev, i) => (
                <div key={i} className={styles.devItem}>
                    <div className={styles.devAvatar} style={{ background: sideColor(dev.side) }}>
                        {dev.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.devInfo}>
                        <div className={styles.devName}>{dev.name}</div>
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
    );
}

// ── Integrations ──────────────────────────────────────────────────────────────

function IntegrationsTab() {
    const { showToast } = useToastContext();
    const [status, setStatus] = useState<PinterestConnectionStatus | null>(null);
    const [busy, setBusy] = useState(false);

    const refreshStatus = useCallback(() => {
        hayverseApiClient.pinterest
            .getConnectionStatus()
            .then(setStatus)
            .catch(() => setStatus({ connected: false }));
    }, []);

    useEffect(refreshStatus, [refreshStatus]);

    useEffect(() => {
        function onMessage(event: MessageEvent) {
            if (event.origin !== window.location.origin) return;
            if ((event.data as { type?: string })?.type !== "pinterest-oauth") return;
            const { status: result } = event.data as { status: "success" | "error" };
            showToast(
                result === "success" ? "Pinterest подключён!" : "Не удалось подключить Pinterest.",
            );
            refreshStatus();
        }
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [refreshStatus, showToast]);

    const handleConnect = async () => {
        setBusy(true);
        try {
            const { url } = await hayverseApiClient.pinterest.getAuthorizeUrl();
            window.open(url, "pinterest-oauth", "width=600,height=700");
        } catch (e) {
            showToast(
                e instanceof ApiError && e.status === 501
                    ? "Pinterest не настроен на сервере."
                    : "Не удалось начать подключение к Pinterest.",
            );
        } finally {
            setBusy(false);
        }
    };

    const handleDisconnect = async () => {
        setBusy(true);
        try {
            await hayverseApiClient.pinterest.disconnect();
            showToast("Pinterest отключён.");
            refreshStatus();
        } catch {
            showToast("Не удалось отключить Pinterest.");
        } finally {
            setBusy(false);
        }
    };

    if (!status) {
        return <p className={styles.sub}>Загрузка...</p>;
    }

    return (
        <div className={styles.devList}>
            <p className={styles.sub}>
                Подключите свой аккаунт Pinterest, чтобы видеть свои доски и пины в узлах графа.
            </p>
            {status.connected ? (
                <>
                    <div className={styles.statRow}>
                        <span>Pinterest</span>
                        <strong>{status.pinterestUsername ?? "Подключено"}</strong>
                    </div>
                    <button
                        className={cn(styles.btn, styles.pri)}
                        onClick={() => void handleDisconnect()}
                        disabled={busy}>
                        Отключить
                    </button>
                </>
            ) : (
                <button
                    className={cn(styles.btn, styles.pri)}
                    onClick={() => void handleConnect()}
                    disabled={busy}>
                    Подключить Pinterest
                </button>
            )}
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
