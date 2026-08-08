import { useRef, useState } from "react";
import cn from "classnames";
import { WirableTextField, type EEP, type NodeParamsProps } from "@/ui/NodeCard/params/shared.tsx";
import type { SceneNarrativeSettings } from "@/store/contexts/NarrativeContext.tsx";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import { useNarrativeContext } from "@/store/contexts/NarrativeContext.tsx";
import { edgeInput } from "@/core/graph.ts";
import { SelectField } from "@/ui/components/SelectField/SelectField.tsx";
import { Select } from "@/ui/components/Select/Select.tsx";
import { TextField } from "@/ui/components/TextField/TextField.tsx";
import { NumberField } from "@/ui/components/NumberField/NumberField.tsx";
import { RangeField } from "@/ui/components/RangeField/RangeField.tsx";
import { CategoryTagGroup } from "@/ui/components/CategoryTagGroup/CategoryTagGroup.tsx";
import { SearchField } from "@/ui/components/SearchField/SearchField.tsx";
import { EmotionalCurvePreview } from "@/ui/components/EmotionalCurvePreview/EmotionalCurvePreview.tsx";
import { StoryPhaseBeats } from "@/ui/components/StoryPhaseBeats/StoryPhaseBeats.tsx";
import { putBlob, useResolvedMediaUrl } from "@/core/mediaRef.ts";
import { MediaPickerButton } from "@/ui/components/MediaLibrary/MediaLibrary.tsx";
import { Button } from "@/ui/components/Button/Button.tsx";
import { IconButton } from "@/ui/components/IconButton/IconButton.tsx";
import styles from "@/ui/NodeCard/params/UtilParams.module.css";

const OUTPUT_SCENE_CATEGORIES = [
    { key: "general", label: "Общие" },
    { key: "arc", label: "Арка" },
];

const curveOptions = [
    { value: "linear", label: "Линейная" },
    { value: "ease_in", label: "Ускорение" },
    { value: "ease_out", label: "Замедление" },
    { value: "ease_in_out", label: "S-образная" },
];

const pacingOptions = [
    { value: "slow", label: "Медленный" },
    { value: "moderate", label: "Умеренный" },
    { value: "fast", label: "Быстрый" },
    { value: "action", label: "Динамичный" },
];

// Tension level dynamic color indicator — mirrors the old Timeline "Scene
// Arc" tab's color-coded feedback.
const getTensionColor = (level: number) => {
    if (level < 30) return "#5DCAA5"; // Green
    if (level < 70) return "#EF9F27"; // Amber
    return "#D4537E"; // Neon Red
};

export function OutputParams({
    node,
    params,
    scenes,
    updateNodeParam,
}: EEP & { scenes: NodeParamsProps["scenes"] }) {
    const ENGINES = ["Hayverse Realtime Veo 3", "Hayverse Draft", "Hayverse Cinema 4K"];
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { activeSceneId } = useGraphContext();
    // Scene-arc fields below still live in NarrativeContext, keyed by scene
    // id, separate from this node's own `params`. Only the active scene's
    // graph is ever mounted, so this node's activeSceneId is always its own
    // scene. Once this "Арка" group has settled here, consider folding
    // SceneNarrativeSettings into output_scene's params and retiring
    // NarrativeContext entirely.
    const { getSceneNarrativeSettings, updateNarrativeSettings } = useNarrativeContext();
    const [activeTags, setActiveTags] = useState<Record<string, boolean>>({
        general: true,
        arc: false,
    });
    const [searchQuery, setSearchQuery] = useState("");
    const resolvedCoverUrl = useResolvedMediaUrl(params.coverUrl as string | undefined);

    const track = (params.track as number) ?? 1;

    // Defensive: activeSceneId is nullable in GraphContext's types, but a
    // mounted output_scene node always belongs to the active scene.
    if (!activeSceneId) return null;
    const arc = getSceneNarrativeSettings(activeSceneId);

    const isAllActive = activeTags.general && activeTags.arc;

    const toggleTag = (tag: string) => {
        setActiveTags((prev) => ({ ...prev, [tag]: !prev[tag] }));
    };

    const toggleAll = () => {
        const nextVal = !isAllActive;
        setActiveTags({ general: nextVal, arc: nextVal });
    };

    // Filter fields by active tab tag and search label queries
    const shouldShow = (category: string, label: string) => {
        if (!activeTags[category as keyof typeof activeTags]) return false;
        if (!searchQuery) return true;
        return label.toLowerCase().includes(searchQuery.toLowerCase());
    };

    // Switching track snaps this scene's start to align with whatever scene is
    // currently last on the target track — recreates the old "parallel scene"
    // pattern (two scenes sharing a start on different tracks). Re-applied on
    // every toggle, in either direction; if the target track is empty, start
    // is left untouched.
    const handleTrackChange = (t: number) => {
        if (t === track) return;
        const targetTrackScenes = scenes.filter((s) => s.track === t && s.id !== node.id);
        const lastOnTarget = targetTrackScenes.reduce<(typeof targetTrackScenes)[number] | null>(
            (max, s) => (!max || s.start > max.start ? s : max),
            null,
        );
        updateNodeParam(node.id, "track", t);
        if (lastOnTarget) updateNodeParam(node.id, "start", lastOnTarget.start);
    };

    const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        putBlob(file)
            .then((ref) => updateNodeParam(node.id, "coverUrl", ref))
            .catch(console.error);
        e.target.value = "";
    };

    const handleCoverPick = (ref: string) => updateNodeParam(node.id, "coverUrl", ref);

    return (
        <>
            <div className={styles.searchContainer}>
                <SearchField value={searchQuery} onChange={setSearchQuery} />
                <CategoryTagGroup
                    options={OUTPUT_SCENE_CATEGORIES}
                    active={activeTags}
                    onToggle={toggleTag}
                    onToggleAll={toggleAll}
                    isAllActive={isAllActive}
                />
            </div>

            {shouldShow("general", "Название сцены") && (
                <TextField
                    label="Название сцены"
                    defaultValue={params.title as string}
                    onBlur={(v) => updateNodeParam(node.id, "title", v)}
                />
            )}

            {(shouldShow("general", "Начало (сек)") ||
                shouldShow("general", "Длительность (сек)")) && (
                <div className={styles.row2}>
                    {shouldShow("general", "Начало (сек)") && (
                        <NumberField
                            label="Начало (сек)"
                            value={params.start as number}
                            min={0}
                            onChange={(v) => updateNodeParam(node.id, "start", v)}
                        />
                    )}
                    {shouldShow("general", "Длительность (сек)") && (
                        <NumberField
                            label="Длительность (сек)"
                            value={params.duration as number}
                            min={1}
                            onChange={(v) => updateNodeParam(node.id, "duration", v)}
                        />
                    )}
                </div>
            )}

            {(shouldShow("general", "Дорожка") || shouldShow("general", "Выход монитора")) && (
                <div className={styles.row2}>
                    {shouldShow("general", "Дорожка") && (
                        <div className={styles.fld}>
                            <span>Дорожка</span>
                            <div className={styles.segBtn}>
                                {[1, 2].map((t) => (
                                    <button
                                        key={t}
                                        className={cn(track === t && styles.isOn)}
                                        onClick={() => handleTrackChange(t)}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {shouldShow("general", "Выход монитора") && (
                        <div className={styles.fld}>
                            <span>Выход монитора</span>
                            <div className={styles.segBtn}>
                                <button
                                    className={cn(
                                        (params.activeOutput ?? "video") === "video" && styles.isOn,
                                    )}
                                    onClick={() =>
                                        updateNodeParam(node.id, "activeOutput", "video")
                                    }>
                                    Видео
                                </button>
                                <button
                                    className={cn(
                                        (params.activeOutput ?? "video") === "image" && styles.isOn,
                                    )}
                                    onClick={() =>
                                        updateNodeParam(node.id, "activeOutput", "image")
                                    }>
                                    Картинка
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {(shouldShow("general", "Обложка сцены") || shouldShow("general", "Рендер-движок")) && (
                <div className={styles.fld}>
                    <span>Рендер-движок</span>
                    {shouldShow("general", "Обложка сцены") && params.coverUrl ? (
                        <div className={styles.coverPreviewWrapper}>
                            <img
                                src={resolvedCoverUrl}
                                className={styles.coverPreviewImg}
                                alt="Обложка"
                            />
                        </div>
                    ) : null}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleCoverUpload}
                    />
                    <div className={styles.presetRow}>
                        {shouldShow("general", "Рендер-движок") && (
                            <Select
                                className={styles.presetSelect}
                                value={params.renderingEngine as string}
                                onChange={(v) => updateNodeParam(node.id, "renderingEngine", v)}
                                options={ENGINES}
                            />
                        )}
                        {shouldShow("general", "Обложка сцены") && (
                            <>
                                <IconButton
                                    icon="upload"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Загрузить обложку"
                                />
                                <MediaPickerButton
                                    onPick={handleCoverPick}
                                    title="Выбрать обложку из медиатеки"
                                />
                            </>
                        )}
                    </div>
                </div>
            )}

            {(shouldShow("arc", "Угол тренда") || shouldShow("arc", "Форма кривой")) && (
                <>
                    <EmotionalCurvePreview
                        emotionalTrend={arc.emotionalTrend}
                        curveType={arc.curveType}
                    />
                    <div className={styles.row2}>
                        {shouldShow("arc", "Угол тренда") && (
                            <RangeField
                                label={`Угол тренда: ${arc.emotionalTrend}%`}
                                value={arc.emotionalTrend}
                                min={-100}
                                max={100}
                                onChange={(v) =>
                                    updateNarrativeSettings(activeSceneId, { emotionalTrend: v })
                                }
                            />
                        )}
                        {shouldShow("arc", "Форма кривой") && (
                            <SelectField
                                label="Форма кривой"
                                value={arc.curveType}
                                onChange={(v) =>
                                    updateNarrativeSettings(activeSceneId, {
                                        curveType: v as SceneNarrativeSettings["curveType"],
                                    })
                                }
                                options={curveOptions}
                            />
                        )}
                    </div>
                </>
            )}

            {shouldShow("arc", "Напряжение") && (
                <RangeField
                    label={
                        <>
                            Напряжение:{" "}
                            <span
                                style={{
                                    color: getTensionColor(arc.tensionLevel),
                                    fontWeight: "bold",
                                }}>
                                {arc.tensionLevel}%
                            </span>
                        </>
                    }
                    value={arc.tensionLevel}
                    min={0}
                    max={100}
                    onChange={(v) => updateNarrativeSettings(activeSceneId, { tensionLevel: v })}
                    color={getTensionColor(arc.tensionLevel)}
                />
            )}

            {shouldShow("arc", "Фаза сюжета") && (
                <div className={styles.fld}>
                    <span>Фаза сюжета</span>
                    <StoryPhaseBeats
                        value={arc.storyPhase}
                        onChange={(phase) =>
                            updateNarrativeSettings(activeSceneId, { storyPhase: phase })
                        }
                    />
                </div>
            )}

            {shouldShow("arc", "Ритм сцены") && (
                <SelectField
                    label="Ритм сцены"
                    value={arc.pacing}
                    onChange={(v) =>
                        updateNarrativeSettings(activeSceneId, {
                            pacing: v as SceneNarrativeSettings["pacing"],
                        })
                    }
                    options={pacingOptions}
                />
            )}
        </>
    );
}

const MAX_TEXT_INPUTS = 8; // mirrors GraphContext's own dynamic-field cap

export function TextParams({
    node,
    params,
    edges,
    resolved,
    updateNodeParam,
    addTextInput,
}: EEP & { addTextInput: (id: string) => void }) {
    // Pin 0 is the node's own fixed, non-removable "Text" pin (see nodes.ts)
    // backing this field — legacy graphs saved before that pin existed have
    // none yet, so fall back to a plain unwired field in that case.
    const basePin = node.data.inputs[0];
    const baseInput = basePin
        ? edgeInput(node.data, edges, resolved, 0)
        : { wired: false, value: undefined };
    const extraPins = node.data.inputs.slice(1);
    const atLimit = extraPins.length >= MAX_TEXT_INPUTS;
    return (
        <>
            <WirableTextField
                label={basePin?.name ?? "Text 1"}
                node={node}
                paramKey="text"
                params={params}
                wired={baseInput.wired}
                liveValue={baseInput.value}
                updateNodeParam={updateNodeParam}
            />
            {extraPins.map((port, idx) => {
                const input = edgeInput(node.data, edges, resolved, idx + 1);
                return (
                    <WirableTextField
                        key={port.id}
                        label={port.name}
                        node={node}
                        paramKey={port.id}
                        params={params}
                        wired={input.wired}
                        liveValue={input.value}
                        updateNodeParam={updateNodeParam}
                    />
                );
            })}
            <Button
                icon="plus"
                disabled={atLimit}
                onClick={() => addTextInput(node.id)}
                title={
                    atLimit
                        ? `Достигнут лимит — ${MAX_TEXT_INPUTS} полей`
                        : "Добавить текстовое поле"
                }>
                Добавить текстовое поле
            </Button>
        </>
    );
}
