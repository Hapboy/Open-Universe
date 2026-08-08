import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { edgeInput } from "../../../core/graph.ts";
import { geminiApiClient } from "../../../core/api/index.ts";
import type { GeminiModel } from "../../../core/api/gemini/dto.ts";
import { WirableTextField, type EEP } from "./shared.tsx";
import { useNodeParamsForm } from "./useNodeParamsForm.ts";
import { geminiTextParamsSchema } from "../../../schemas/gemini/geminiText.schema.ts";
import { geminiVisionParamsSchema } from "../../../schemas/gemini/geminiVision.schema.ts";
import { geminiImagenParamsSchema } from "../../../schemas/gemini/geminiImagen.schema.ts";
import { geminiVeoParamsSchema } from "../../../schemas/gemini/geminiVeo.schema.ts";
import { geminiNanoBananaParamsSchema } from "../../../schemas/gemini/geminiNanoBanana.schema.ts";
import { geminiLyriaParamsSchema } from "../../../schemas/gemini/geminiLyria.schema.ts";
import { SelectField } from "../../components/SelectField/SelectField.tsx";
import { Select } from "../../components/Select/Select.tsx";
import { TextField } from "../../components/TextField/TextField.tsx";
import { Switch } from "../../components/Switch/Switch.tsx";
import sharedStyles from "../../../styles/shared.module.css";

// Shared by every Gemini component with a wirable prompt/query-style field:
// when that pin is wired, prefer the currently-selected history entry's
// captured resolved value (see graphExecution.ts's WIRABLE_FIELD /
// persistGeneratedOutputs) over the live edge value, so scrubbing the
// history nav back to an older generation shows the text that actually
// produced it rather than whatever the upstream node currently says. At the
// latest generation (or before any generation), there's no "history" to
// prefer — live value is correct. `fieldKey` is "prompt" everywhere except
// GeminiVisionParams, whose wirable field is "query".
function wiredFieldDisplayValue(
    params: Record<string, unknown>,
    liveValue: unknown,
    fieldKey: string,
): unknown {
    const generatedHistory = (params.generatedHistory as string[] | undefined) ?? [];
    const generatedIdx = params.generatedIdx as number | undefined;
    const generatedParamsHistory =
        (params.generatedParamsHistory as Record<string, Record<string, unknown>> | undefined) ??
        {};
    const isViewingHistory =
        generatedIdx !== undefined && generatedIdx < generatedHistory.length - 1;
    if (!isViewingHistory) return liveValue;
    const historicalValue = generatedParamsHistory[generatedHistory[generatedIdx]]?.[fieldKey];
    return historicalValue !== undefined ? historicalValue : liveValue;
}

const FALLBACK_MODELS: GeminiModel[] = [
    { id: "gemini-flash-latest", displayName: "Gemini Flash (latest)" },
    { id: "gemini-2.5-flash", displayName: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", displayName: "Gemini 2.5 Pro" },
];

function useGeminiModels(currentModel: string): GeminiModel[] {
    const [models, setModels] = useState<GeminiModel[]>(FALLBACK_MODELS);

    useEffect(() => {
        let cancelled = false;
        void geminiApiClient.listModels().then((list) => {
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

function modelOptions(models: GeminiModel[]) {
    return models.map((m) => ({ value: m.id, label: m.displayName ?? m.id }));
}

export function GeminiTextParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const MODELS = useGeminiModels(params.model as string);
    const prompt = edgeInput(node.data, edges, resolved, 0);
    const { control } = useNodeParamsForm(geminiTextParamsSchema, params);
    return (
        <>
            <Controller
                control={control}
                name="prompt"
                render={({ field }) => (
                    <WirableTextField
                        label="Промпт"
                        node={node}
                        paramKey="prompt"
                        params={params}
                        wired={prompt.wired}
                        liveValue={wiredFieldDisplayValue(params, prompt.value, "prompt")}
                        updateNodeParam={updateNodeParam}
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
            <Controller
                control={control}
                name="model"
                render={({ field }) => (
                    <SelectField
                        label="Модель"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "model", v);
                        }}
                        options={modelOptions(MODELS)}
                    />
                )}
            />
        </>
    );
}

export function GeminiVisionParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const MODELS = useGeminiModels(params.model as string);
    const query = edgeInput(node.data, edges, resolved, 1);
    const { control } = useNodeParamsForm(geminiVisionParamsSchema, params);
    return (
        <>
            <Controller
                control={control}
                name="query"
                render={({ field }) => (
                    <WirableTextField
                        label="Запрос к изображению"
                        node={node}
                        paramKey="query"
                        params={params}
                        wired={query.wired}
                        liveValue={wiredFieldDisplayValue(params, query.value, "query")}
                        updateNodeParam={updateNodeParam}
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
            <Controller
                control={control}
                name="model"
                render={({ field }) => (
                    <SelectField
                        label="Модель"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "model", v);
                        }}
                        options={modelOptions(MODELS)}
                    />
                )}
            />
        </>
    );
}

const IMAGEN_MODELS: GeminiModel[] = [
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
    const { control } = useNodeParamsForm(geminiImagenParamsSchema, params);
    return (
        <>
            <Controller
                control={control}
                name="prompt"
                render={({ field }) => (
                    <WirableTextField
                        label="Промпт"
                        node={node}
                        paramKey="prompt"
                        params={params}
                        wired={prompt.wired}
                        liveValue={wiredFieldDisplayValue(params, prompt.value, "prompt")}
                        updateNodeParam={updateNodeParam}
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
            <Controller
                control={control}
                name="model"
                render={({ field }) => (
                    <SelectField
                        label="Модель"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "model", v);
                        }}
                        options={modelOptions(IMAGEN_MODELS)}
                    />
                )}
            />
            <Controller
                control={control}
                name="aspectRatio"
                render={({ field }) => (
                    <SelectField
                        label="Соотношение сторон"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "aspectRatio", v);
                        }}
                        options={RATIOS}
                    />
                )}
            />
            <Controller
                control={control}
                name="resolution"
                render={({ field }) => (
                    <SelectField
                        label="Разрешение"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "resolution", v);
                        }}
                        options={RESOLUTIONS}
                        disabled={isFastModel}
                        title={isFastModel ? IMAGEN_FAST_FIXED_SIZE_HINT : undefined}
                    />
                )}
            />
            <Controller
                control={control}
                name="negativePrompt"
                render={({ field }) => (
                    <TextField
                        label="Негативный промпт"
                        disabled
                        value={field.value}
                        onChange={field.onChange}
                        title={ENTERPRISE_ONLY_HINT}
                    />
                )}
            />
            <Controller
                control={control}
                name="numberOfImages"
                render={({ field }) => (
                    <SelectField
                        label="Количество изображений"
                        value={String(field.value ?? 1)}
                        onChange={(v) => {
                            const n = Number(v);
                            field.onChange(n);
                            updateNodeParam(node.id, "numberOfImages", n);
                        }}
                        options={["1", "2", "3", "4"]}
                    />
                )}
            />
            <Controller
                control={control}
                name="seed"
                render={({ field }) => (
                    <TextField
                        label="Сид (seed)"
                        disabled
                        placeholder="авто"
                        value={field.value}
                        onChange={field.onChange}
                        title={ENTERPRISE_ONLY_HINT}
                    />
                )}
            />
            <Controller
                control={control}
                name="guidanceScale"
                render={({ field }) => (
                    <TextField
                        label="Guidance Scale"
                        placeholder="авто"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={(v) => {
                            field.onBlur();
                            updateNodeParam(node.id, "guidanceScale", v);
                        }}
                    />
                )}
            />
            <Controller
                control={control}
                name="personGeneration"
                render={({ field }) => (
                    <SelectField
                        label="Генерация людей"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "personGeneration", v);
                        }}
                        options={PERSON_GENERATION_OPTIONS}
                    />
                )}
            />
            <Controller
                control={control}
                name="safetyFilterLevel"
                render={({ field }) => (
                    <SelectField
                        label="Уровень safety-фильтра"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "safetyFilterLevel", v);
                        }}
                        options={SAFETY_FILTER_OPTIONS}
                    />
                )}
            />
            <Controller
                control={control}
                name="outputMimeType"
                render={({ field }) => (
                    <SelectField
                        label="Формат вывода"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "outputMimeType", v);
                        }}
                        options={OUTPUT_MIME_OPTIONS}
                    />
                )}
            />
            {isJpeg && (
                <Controller
                    control={control}
                    name="outputCompressionQuality"
                    render={({ field }) => (
                        <TextField
                            label="Качество JPEG (0-100)"
                            value={String(field.value ?? "")}
                            onChange={(v) => field.onChange(Number(v))}
                            onBlur={(v) => {
                                field.onBlur();
                                updateNodeParam(node.id, "outputCompressionQuality", Number(v));
                            }}
                        />
                    )}
                />
            )}
            <Controller
                control={control}
                name="language"
                render={({ field }) => (
                    <SelectField
                        label="Язык промпта"
                        value={field.value}
                        onChange={field.onChange}
                        options={LANGUAGE_OPTIONS}
                        disabled
                        title={ENTERPRISE_ONLY_HINT}
                    />
                )}
            />
            <Controller
                control={control}
                name="enhancePrompt"
                render={({ field }) => (
                    <Switch
                        label="Улучшить промпт"
                        value={!!field.value}
                        onChange={field.onChange}
                        disabled
                        title={ENTERPRISE_ONLY_HINT}
                    />
                )}
            />
        </>
    );
}

const VEO_MODELS: GeminiModel[] = [
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
    const { control } = useNodeParamsForm(geminiVeoParamsSchema, params);
    return (
        <>
            <Controller
                control={control}
                name="prompt"
                render={({ field }) => (
                    <WirableTextField
                        label="Промпт"
                        node={node}
                        paramKey="prompt"
                        params={params}
                        wired={prompt.wired}
                        liveValue={wiredFieldDisplayValue(params, prompt.value, "prompt")}
                        updateNodeParam={updateNodeParam}
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
            <Controller
                control={control}
                name="model"
                render={({ field }) => (
                    <SelectField
                        label="Модель"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "model", v);
                        }}
                        options={modelOptions(VEO_MODELS)}
                    />
                )}
            />
            <Controller
                control={control}
                name="aspectRatio"
                render={({ field }) => (
                    <SelectField
                        label="Соотношение сторон"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "aspectRatio", v);
                        }}
                        options={RATIOS}
                    />
                )}
            />
            <Controller
                control={control}
                name="resolution"
                render={({ field }) => (
                    <SelectField
                        label="Разрешение"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "resolution", v);
                        }}
                        options={RESOLUTIONS}
                    />
                )}
            />
            <Controller
                control={control}
                name="durationSeconds"
                render={({ field }) => (
                    <TextField
                        label="Длительность (сек)"
                        disabled={requiresFullDuration}
                        title={requiresFullDuration ? VEO_NON_720P_DURATION_HINT : undefined}
                        value={requiresFullDuration ? "8" : String(field.value)}
                        onChange={(v) => field.onChange(Number(v))}
                        onBlur={(v) => {
                            field.onBlur();
                            updateNodeParam(node.id, "durationSeconds", Number(v));
                        }}
                    />
                )}
            />
            <Controller
                control={control}
                name="negativePrompt"
                render={({ field }) => (
                    <TextField
                        label="Негативный промпт"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={(v) => {
                            field.onBlur();
                            updateNodeParam(node.id, "negativePrompt", v);
                        }}
                    />
                )}
            />
            <Controller
                control={control}
                name="seed"
                render={({ field }) => (
                    <TextField
                        label="Сид (seed)"
                        disabled
                        placeholder="авто"
                        value={field.value}
                        onChange={field.onChange}
                        title={ENTERPRISE_ONLY_HINT}
                    />
                )}
            />
            <Controller
                control={control}
                name="personGeneration"
                render={({ field }) => (
                    <SelectField
                        label="Генерация людей"
                        disabled
                        value={field.value}
                        onChange={field.onChange}
                        options={VEO_PERSON_GENERATION_OPTIONS}
                        title={VEO_PREVIEW_UNSUPPORTED_HINT}
                    />
                )}
            />
            <Controller
                control={control}
                name="enhancePrompt"
                render={({ field }) => (
                    <Switch
                        label="Улучшить промпт"
                        value={!!field.value}
                        onChange={field.onChange}
                        disabled
                        title={VEO_PREVIEW_UNSUPPORTED_HINT}
                    />
                )}
            />
            <Controller
                control={control}
                name="generateAudio"
                render={({ field }) => (
                    <Switch
                        label="Звук"
                        value={!!field.value}
                        onChange={field.onChange}
                        disabled
                        title={ENTERPRISE_ONLY_HINT}
                    />
                )}
            />
        </>
    );
}

const NANO_BANANA_MODELS: GeminiModel[] = [
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
    const { control } = useNodeParamsForm(geminiNanoBananaParamsSchema, params);
    return (
        <>
            <Controller
                control={control}
                name="prompt"
                render={({ field }) => (
                    <WirableTextField
                        label="Промпт"
                        node={node}
                        paramKey="prompt"
                        params={params}
                        wired={prompt.wired}
                        liveValue={wiredFieldDisplayValue(params, prompt.value, "prompt")}
                        updateNodeParam={updateNodeParam}
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
            <div className={sharedStyles.fld}>
                <span>Модель</span>
                <div className={sharedStyles.presetRow}>
                    <Controller
                        control={control}
                        name="model"
                        render={({ field }) => (
                            <Select
                                className={sharedStyles.presetSelect}
                                value={field.value}
                                onChange={(v) => {
                                    field.onChange(v);
                                    updateNodeParam(node.id, "model", v);
                                }}
                                options={modelOptions(NANO_BANANA_MODELS)}
                            />
                        )}
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
            <Controller
                control={control}
                name="aspectRatio"
                render={({ field }) => (
                    <SelectField
                        label="Соотношение сторон"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "aspectRatio", v);
                        }}
                        options={RATIOS}
                    />
                )}
            />
            <Controller
                control={control}
                name="imageSize"
                render={({ field }) => (
                    <SelectField
                        label="Разрешение"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "imageSize", v);
                        }}
                        options={SIZES}
                    />
                )}
            />
            <Controller
                control={control}
                name="seed"
                render={({ field }) => (
                    <TextField
                        label="Сид (seed)"
                        placeholder="авто"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={(v) => {
                            field.onBlur();
                            updateNodeParam(node.id, "seed", v);
                        }}
                    />
                )}
            />
            <Controller
                control={control}
                name="personGeneration"
                render={({ field }) => (
                    <SelectField
                        label="Генерация людей"
                        disabled
                        value={field.value}
                        onChange={field.onChange}
                        options={NANO_BANANA_PERSON_OPTIONS}
                        title={ENTERPRISE_ONLY_HINT}
                    />
                )}
            />
        </>
    );
}

const LYRIA_MODELS: GeminiModel[] = [
    { id: "lyria-3-clip-preview", displayName: "Lyria 3 Clip" },
    { id: "lyria-3-pro-preview", displayName: "Lyria 3 Pro" },
];

export function GeminiLyriaParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const prompt = edgeInput(node.data, edges, resolved, 0);
    const { control } = useNodeParamsForm(geminiLyriaParamsSchema, params);
    return (
        <>
            <Controller
                control={control}
                name="prompt"
                render={({ field }) => (
                    <WirableTextField
                        label="Промпт"
                        node={node}
                        paramKey="prompt"
                        params={params}
                        wired={prompt.wired}
                        liveValue={wiredFieldDisplayValue(params, prompt.value, "prompt")}
                        updateNodeParam={updateNodeParam}
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
            <Controller
                control={control}
                name="model"
                render={({ field }) => (
                    <SelectField
                        label="Модель"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            updateNodeParam(node.id, "model", v);
                        }}
                        options={modelOptions(LYRIA_MODELS)}
                    />
                )}
            />
            <Controller
                control={control}
                name="seed"
                render={({ field }) => (
                    <TextField
                        label="Сид (seed)"
                        placeholder="авто"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={(v) => {
                            field.onBlur();
                            updateNodeParam(node.id, "seed", v);
                        }}
                    />
                )}
            />
        </>
    );
}
