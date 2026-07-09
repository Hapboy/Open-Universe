import { useEffect, useState } from "react";
import { edgeInput } from "../../../core/graph.ts";
import { GeminiService, type GeminiModelInfo } from "../../../core/services/gemini.ts";
import { WirableTextField, type EEP } from "./shared.tsx";
import { SelectField } from "../../components/SelectField/SelectField.tsx";
import { Select } from "../../components/Select/Select.tsx";
import { TextField } from "../../components/TextField/TextField.tsx";
import { Switch } from "../../components/Switch/Switch.tsx";
import sharedStyles from "../../../styles/shared.module.css";

const FALLBACK_MODELS: GeminiModelInfo[] = [
    { id: "gemini-flash-latest", displayName: "Gemini Flash (latest)" },
    { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
];

function useGeminiModels(currentModel: string): GeminiModelInfo[] {
    const [models, setModels] = useState<GeminiModelInfo[]>(FALLBACK_MODELS);

    useEffect(() => {
        let cancelled = false;
        void GeminiService.listModels().then((list) => {
            if (!cancelled) setModels(list);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (currentModel && !models.some((m) => m.id === currentModel)) {
        return [{ id: currentModel, displayName: currentModel }, ...models];
    }
    return models;
}

function modelOptions(models: GeminiModelInfo[]) {
    return models.map((m) => ({ value: m.id, label: m.displayName ?? m.id }));
}

export function GeminiTextParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const MODELS = useGeminiModels(params.model as string);
    const prompt = edgeInput(node.data, edges, resolved, 0);
    return (
        <>
            <WirableTextField
                label="Промпт"
                node={node}
                paramKey="prompt"
                params={params}
                wired={prompt.wired}
                liveValue={prompt.value}
                updateNodeParam={updateNodeParam}
            />
            <SelectField
                label="Модель"
                value={params.model as string}
                onChange={(v) => updateNodeParam(node.id, "model", v)}
                options={modelOptions(MODELS)}
            />
        </>
    );
}

export function GeminiVisionParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const MODELS = useGeminiModels(params.model as string);
    const query = edgeInput(node.data, edges, resolved, 1);
    return (
        <>
            <WirableTextField
                label="Запрос к изображению"
                node={node}
                paramKey="query"
                params={params}
                wired={query.wired}
                liveValue={query.value}
                updateNodeParam={updateNodeParam}
            />
            <SelectField
                label="Модель"
                value={params.model as string}
                onChange={(v) => updateNodeParam(node.id, "model", v)}
                options={modelOptions(MODELS)}
            />
        </>
    );
}

const IMAGEN_MODELS: GeminiModelInfo[] = [
    { id: "imagen-4.0-generate-001", displayName: "Imagen 4" },
    { id: "imagen-4.0-ultra-generate-001", displayName: "Imagen 4 Ultra" },
    { id: "imagen-4.0-fast-generate-001", displayName: "Imagen 4 Fast" },
];

const PERSON_GENERATION_OPTIONS = [
    { value: "DONT_ALLOW", label: "Запрещено" },
    { value: "ALLOW_ADULT", label: "Только взрослые" },
    { value: "ALLOW_ALL", label: "Все" },
];

const SAFETY_FILTER_OPTIONS = [
    "BLOCK_LOW_AND_ABOVE",
    "BLOCK_MEDIUM_AND_ABOVE",
    "BLOCK_ONLY_HIGH",
    "BLOCK_NONE",
];

const OUTPUT_MIME_OPTIONS = [
    { value: "image/png", label: "PNG" },
    { value: "image/jpeg", label: "JPEG" },
];

const LANGUAGE_OPTIONS = ["auto", "en", "ja", "ko", "hi", "zh", "pt", "es"];

// Vertex AI "Enterprise" mode is required for these fields, and the SDK only
// supports Vertex auth (project/location/service-account) on Node runtimes —
// it's ignored in the browser. This app has no backend yet, so these stay
// disabled until one exists to proxy Vertex calls.
const ENTERPRISE_ONLY_HINT =
    "Доступно только через backend с Vertex AI Enterprise — пока не поддерживается в этом браузерном приложении";

// Confirmed by hitting the live API: every veo-3.1-*-preview model currently
// available on this key rejects these fields outright ("currently not
// supported" / "not supported by this model"), regardless of value.
const VEO_PREVIEW_UNSUPPORTED_HINT = "Не поддерживается моделями Veo 3.1 preview на данный момент";

// Confirmed via Google's docs: Imagen 4 Fast has a fixed output size and
// rejects imageSize outright, unlike Standard/Ultra.
const IMAGEN_FAST_FIXED_SIZE_HINT = "Imagen 4 Fast использует фиксированный размер вывода";

// Confirmed via Google's docs: 1080p/4k Veo generations must be exactly 8s.
const VEO_NON_720P_DURATION_HINT = "Для разрешения выше 720p длительность фиксирована на 8 секунд";

export function GeminiImagenParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const RATIOS = ["16:9", "1:1", "9:16", "4:3", "3:4"];
    const RESOLUTIONS = ["1K", "2K"];
    const prompt = edgeInput(node.data, edges, resolved, 0);
    const isJpeg = params.outputMimeType === "image/jpeg";
    const isFastModel = params.model === "imagen-4.0-fast-generate-001";
    return (
        <>
            <WirableTextField
                label="Промпт"
                node={node}
                paramKey="prompt"
                params={params}
                wired={prompt.wired}
                liveValue={prompt.value}
                updateNodeParam={updateNodeParam}
            />
            <SelectField
                label="Модель"
                value={params.model as string}
                onChange={(v) => updateNodeParam(node.id, "model", v)}
                options={modelOptions(IMAGEN_MODELS)}
            />
            <SelectField
                label="Соотношение сторон"
                value={params.aspectRatio as string}
                onChange={(v) => updateNodeParam(node.id, "aspectRatio", v)}
                options={RATIOS}
            />
            <SelectField
                label="Разрешение"
                value={params.resolution as string}
                onChange={(v) => updateNodeParam(node.id, "resolution", v)}
                options={RESOLUTIONS}
                disabled={isFastModel}
                title={isFastModel ? IMAGEN_FAST_FIXED_SIZE_HINT : undefined}
            />
            <TextField
                label="Негативный промпт"
                disabled
                defaultValue={params.negativePrompt as string}
                title={ENTERPRISE_ONLY_HINT}
            />
            <SelectField
                label="Количество изображений"
                value={String(params.numberOfImages ?? 1)}
                onChange={(v) => updateNodeParam(node.id, "numberOfImages", Number(v))}
                options={["1", "2", "3", "4"]}
            />
            <TextField
                label="Сид (seed)"
                disabled
                placeholder="авто"
                defaultValue={params.seed as string}
                title={ENTERPRISE_ONLY_HINT}
            />
            <TextField
                label="Guidance Scale"
                placeholder="авто"
                defaultValue={params.guidanceScale as string}
                onBlur={(v) => updateNodeParam(node.id, "guidanceScale", v)}
            />
            <SelectField
                label="Генерация людей"
                value={params.personGeneration as string}
                onChange={(v) => updateNodeParam(node.id, "personGeneration", v)}
                options={PERSON_GENERATION_OPTIONS}
            />
            <SelectField
                label="Уровень safety-фильтра"
                value={params.safetyFilterLevel as string}
                onChange={(v) => updateNodeParam(node.id, "safetyFilterLevel", v)}
                options={SAFETY_FILTER_OPTIONS}
            />
            <SelectField
                label="Формат вывода"
                value={params.outputMimeType as string}
                onChange={(v) => updateNodeParam(node.id, "outputMimeType", v)}
                options={OUTPUT_MIME_OPTIONS}
            />
            {isJpeg && (
                <TextField
                    label="Качество JPEG (0-100)"
                    defaultValue={String(params.outputCompressionQuality as number)}
                    onBlur={(v) => updateNodeParam(node.id, "outputCompressionQuality", Number(v))}
                />
            )}
            <SelectField
                label="Язык промпта"
                value={params.language as string}
                onChange={() => {}}
                options={LANGUAGE_OPTIONS}
                disabled
                title={ENTERPRISE_ONLY_HINT}
            />
            <Switch
                label="Улучшить промпт"
                value={!!params.enhancePrompt}
                onChange={() => {}}
                disabled
                title={ENTERPRISE_ONLY_HINT}
            />
        </>
    );
}

const VEO_MODELS: GeminiModelInfo[] = [
    { id: "veo-3.1-generate-preview", displayName: "Veo 3.1" },
    { id: "veo-3.1-fast-generate-preview", displayName: "Veo 3.1 Fast" },
    { id: "veo-3.1-lite-generate-preview", displayName: "Veo 3.1 Lite" },
];

// Veo's personGeneration is a plain lowercase string, no 'allow_all' option (unlike Imagen).
const VEO_PERSON_GENERATION_OPTIONS = [
    { value: "dont_allow", label: "Запрещено" },
    { value: "allow_adult", label: "Только взрослые" },
];

export function GeminiVeoParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const RATIOS = ["16:9", "9:16"];
    const RESOLUTIONS = ["720p", "1080p"];
    const prompt = edgeInput(node.data, edges, resolved, 0);
    const requiresFullDuration = params.resolution !== "720p";
    return (
        <>
            <WirableTextField
                label="Промпт"
                node={node}
                paramKey="prompt"
                params={params}
                wired={prompt.wired}
                liveValue={prompt.value}
                updateNodeParam={updateNodeParam}
            />
            <SelectField
                label="Модель"
                value={params.model as string}
                onChange={(v) => updateNodeParam(node.id, "model", v)}
                options={modelOptions(VEO_MODELS)}
            />
            <SelectField
                label="Соотношение сторон"
                value={params.aspectRatio as string}
                onChange={(v) => updateNodeParam(node.id, "aspectRatio", v)}
                options={RATIOS}
            />
            <SelectField
                label="Разрешение"
                value={params.resolution as string}
                onChange={(v) => updateNodeParam(node.id, "resolution", v)}
                options={RESOLUTIONS}
            />
            <TextField
                key={String(requiresFullDuration)}
                label="Длительность (сек)"
                disabled={requiresFullDuration}
                title={requiresFullDuration ? VEO_NON_720P_DURATION_HINT : undefined}
                defaultValue={String(requiresFullDuration ? 8 : (params.durationSeconds as number))}
                onBlur={(v) => updateNodeParam(node.id, "durationSeconds", Number(v))}
            />
            <TextField
                label="Негативный промпт"
                defaultValue={params.negativePrompt as string}
                onBlur={(v) => updateNodeParam(node.id, "negativePrompt", v)}
            />
            <TextField
                label="Сид (seed)"
                disabled
                placeholder="авто"
                defaultValue={params.seed as string}
                title={ENTERPRISE_ONLY_HINT}
            />
            <SelectField
                label="Генерация людей"
                disabled
                value={params.personGeneration as string}
                onChange={() => {}}
                options={VEO_PERSON_GENERATION_OPTIONS}
                title={VEO_PREVIEW_UNSUPPORTED_HINT}
            />
            <Switch
                label="Улучшить промпт"
                value={!!params.enhancePrompt}
                onChange={() => {}}
                disabled
                title={VEO_PREVIEW_UNSUPPORTED_HINT}
            />
            <Switch
                label="Звук"
                value={!!params.generateAudio}
                onChange={() => {}}
                disabled
                title={ENTERPRISE_ONLY_HINT}
            />
        </>
    );
}

const NANO_BANANA_MODELS: GeminiModelInfo[] = [
    { id: "gemini-3.1-flash-image", displayName: "Nano Banana 2" },
    { id: "gemini-3-pro-image", displayName: "Nano Banana Pro" },
    { id: "gemini-2.5-flash-image", displayName: "Gemini 2.5 Flash Image" },
];

// Nano Banana's own personGeneration enum (ALLOW_ALL/ALLOW_ADULT/ALLOW_NONE, per the
// SDK's ImageConfig doc comment) — distinct from Imagen's DONT_ALLOW/ALLOW_ADULT/ALLOW_ALL
// and Veo's lowercase dont_allow/allow_adult pair. Confirmed live: this field is
// Vertex/Enterprise-only, same gating as Imagen/Veo's disabled fields above.
const NANO_BANANA_PERSON_OPTIONS = [
    { value: "ALLOW_ALL", label: "Все" },
    { value: "ALLOW_ADULT", label: "Только взрослые" },
    { value: "ALLOW_NONE", label: "Запрещено" },
];

const MAX_NANO_BANANA_REFERENCE_IMAGES = 14; // Nano Banana's own API limit

export function GeminiNanoBananaParams({
    node,
    params,
    edges,
    resolved,
    updateNodeParam,
    addImageInput,
}: EEP & {
    addImageInput: (id: string) => void;
}) {
    const RATIOS = ["16:9", "1:1", "9:16", "3:2", "2:3", "4:3", "21:9"];
    const SIZES = ["1K", "2K", "4K"];
    const prompt = edgeInput(node.data, edges, resolved, 0);
    const imageCount = node.data.inputs.length - 1;
    const atLimit = imageCount >= MAX_NANO_BANANA_REFERENCE_IMAGES;
    return (
        <>
            <WirableTextField
                label="Промпт"
                node={node}
                paramKey="prompt"
                params={params}
                wired={prompt.wired}
                liveValue={prompt.value}
                updateNodeParam={updateNodeParam}
            />
            <div className={sharedStyles.fld}>
                <span>Модель</span>
                <div className={sharedStyles.presetRow}>
                    <Select
                        className={sharedStyles.presetSelect}
                        value={params.model as string}
                        onChange={(v) => updateNodeParam(node.id, "model", v)}
                        options={modelOptions(NANO_BANANA_MODELS)}
                    />
                    <button
                        className={sharedStyles.iconBtn}
                        disabled={atLimit}
                        onClick={() => addImageInput(node.id)}
                        title={
                            atLimit
                                ? "Достигнут лимит Nano Banana — 14 изображений"
                                : "Добавить референсное изображение"
                        }>
                        <i className="ti ti-plus" />
                    </button>
                </div>
            </div>
            <SelectField
                label="Соотношение сторон"
                value={params.aspectRatio as string}
                onChange={(v) => updateNodeParam(node.id, "aspectRatio", v)}
                options={RATIOS}
            />
            <SelectField
                label="Разрешение"
                value={params.imageSize as string}
                onChange={(v) => updateNodeParam(node.id, "imageSize", v)}
                options={SIZES}
            />
            <TextField
                label="Сид (seed)"
                placeholder="авто"
                defaultValue={params.seed as string}
                onBlur={(v) => updateNodeParam(node.id, "seed", v)}
            />
            <SelectField
                label="Генерация людей"
                disabled
                value={params.personGeneration as string}
                onChange={() => {}}
                options={NANO_BANANA_PERSON_OPTIONS}
                title={ENTERPRISE_ONLY_HINT}
            />
        </>
    );
}

const LYRIA_MODELS: GeminiModelInfo[] = [
    { id: "lyria-3-clip-preview", displayName: "Lyria 3 Clip" },
    { id: "lyria-3-pro-preview", displayName: "Lyria 3 Pro" },
];

export function GeminiLyriaParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const prompt = edgeInput(node.data, edges, resolved, 0);
    return (
        <>
            <WirableTextField
                label="Промпт"
                node={node}
                paramKey="prompt"
                params={params}
                wired={prompt.wired}
                liveValue={prompt.value}
                updateNodeParam={updateNodeParam}
            />
            <SelectField
                label="Модель"
                value={params.model as string}
                onChange={(v) => updateNodeParam(node.id, "model", v)}
                options={modelOptions(LYRIA_MODELS)}
            />
            <TextField
                label="Сид (seed)"
                placeholder="авто"
                defaultValue={params.seed as string}
                onBlur={(v) => updateNodeParam(node.id, "seed", v)}
            />
        </>
    );
}
