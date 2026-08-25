import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { edgeInput } from "@/core/graph.ts";
import type { GenerationHistoryState } from "@/types.ts";
import { geminiApiClient } from "@/core/api/index.ts";
import type { GeminiModel } from "@/core/api/gemini/dto.ts";
import { generateSeed } from "@/core/seed.ts";
import { useGraphContext } from "@/store/contexts/GraphContext.tsx";
import { WirableTextField, type EEP } from "@/ui/NodeCard/params/shared.tsx";
import { useNodeParamsForm } from "@/ui/NodeCard/params/useNodeParamsForm.ts";
import { geminiTextParamsSchema } from "@/schemas/gemini/geminiText.schema.ts";
import { geminiVisionParamsSchema } from "@/schemas/gemini/geminiVision.schema.ts";
import { geminiImagenParamsSchema, IMAGEN_MODELS } from "@/schemas/gemini/geminiImagen.schema.ts";
import { geminiVeoParamsSchema, VEO_MODELS } from "@/schemas/gemini/geminiVeo.schema.ts";
import {
    geminiNanoBananaParamsSchema,
    nanoBananaSliceSchema,
    NANO_BANANA_MODELS,
} from "@/schemas/gemini/geminiNanoBanana.schema.ts";
import { geminiLyriaParamsSchema, LYRIA_MODELS } from "@/schemas/gemini/geminiLyria.schema.ts";
import { SelectField } from "@/ui/components/SelectField/SelectField.tsx";
import { Select } from "@/ui/components/Select/Select.tsx";
import { TextField } from "@/ui/components/TextField/TextField.tsx";
import { SeedField } from "@/ui/components/SeedField/SeedField.tsx";
import { Switch } from "@/ui/components/Switch/Switch.tsx";
import { IconButton } from "@/ui/components/IconButton/IconButton.tsx";
import sharedStyles from "@/styles/shared.module.css";

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
    generation: GenerationHistoryState | undefined,
    liveValue: unknown,
    fieldKey: string,
): unknown {
    const { history = [], idx, paramsHistory = {} } = generation ?? {};
    const isViewingHistory = idx !== undefined && idx < history.length - 1;
    if (!isViewingHistory) return liveValue;
    const historicalValue = paramsHistory[history[idx]]?.[fieldKey];
    return historicalValue !== undefined ? historicalValue : liveValue;
}

// No fixed list at schema-definition time (see geminiText.schema.ts) — the
// real list is fetched below and the select stays empty/loading until it
// resolves, rather than showing a static fake one first.
function useGeminiModels(currentModel: string): GeminiModel[] {
    const [models, setModels] = useState<GeminiModel[]>([]);

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

function modelOptions(models: readonly GeminiModel[]) {
    return models.map((m) => ({ value: m.id, label: m.displayName ?? m.id }));
}

export function GeminiTextParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const MODELS = useGeminiModels(params.model as string);
    const prompt = edgeInput(node.data, edges, resolved, 0);
    const { control, isFieldValid } = useNodeParamsForm(geminiTextParamsSchema, params);
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
                        liveValue={wiredFieldDisplayValue(
                            node.data.generation as GenerationHistoryState | undefined,
                            prompt.value,
                            "prompt",
                        )}
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
                            if (isFieldValid("model", v)) updateNodeParam(node.id, "model", v);
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
    const { control, isFieldValid } = useNodeParamsForm(geminiVisionParamsSchema, params);
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
                        liveValue={wiredFieldDisplayValue(
                            node.data.generation as GenerationHistoryState | undefined,
                            query.value,
                            "query",
                        )}
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
                            if (isFieldValid("model", v)) updateNodeParam(node.id, "model", v);
                        }}
                        options={modelOptions(MODELS)}
                    />
                )}
            />
        </>
    );
}

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
    const { control, isFieldValid } = useNodeParamsForm(geminiImagenParamsSchema, params);
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
                        liveValue={wiredFieldDisplayValue(
                            node.data.generation as GenerationHistoryState | undefined,
                            prompt.value,
                            "prompt",
                        )}
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
                            if (isFieldValid("model", v)) updateNodeParam(node.id, "model", v);
                        }}
                        options={modelOptions(IMAGEN_MODELS)}
                    />
                )}
            />
            <div className={sharedStyles.row2}>
                <Controller
                    control={control}
                    name="aspectRatio"
                    render={({ field }) => (
                        <SelectField
                            label="Соотношение сторон"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("aspectRatio", v))
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
                                if (isFieldValid("resolution", v))
                                    updateNodeParam(node.id, "resolution", v);
                            }}
                            options={RESOLUTIONS}
                            disabled={isFastModel}
                            title={isFastModel ? IMAGEN_FAST_FIXED_SIZE_HINT : undefined}
                        />
                    )}
                />
            </div>
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
                            if (isFieldValid("numberOfImages", n))
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
                    <SeedField
                        value={field.value}
                        onChange={field.onChange}
                        disabled
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
                            if (isFieldValid("guidanceScale", v))
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
                            if (isFieldValid("personGeneration", v))
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
                            if (isFieldValid("safetyFilterLevel", v))
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
                            if (isFieldValid("outputMimeType", v))
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
                    render={({ field, fieldState }) => (
                        <TextField
                            label="Качество JPEG (0-100)"
                            value={String(field.value ?? "")}
                            onChange={(v) => field.onChange(Number(v))}
                            onBlur={(v) => {
                                field.onBlur();
                                if (isFieldValid("outputCompressionQuality", Number(v)))
                                    updateNodeParam(node.id, "outputCompressionQuality", Number(v));
                            }}
                            error={fieldState.error?.message}
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

// Veo's personGeneration is a plain lowercase string, no 'allow_all' option (unlike Imagen).
const VEO_PERSON_GENERATION_OPTIONS = [
    { value: "dont_allow", label: "Запрещено" },
    { value: "allow_adult", label: "Только взрослые" },
];

// Fields shared by the standalone Veo node and output_scene's Видео tab —
// everything except the prompt (a WirableTextField sourced from an edge on
// the standalone node; composed internally from connected entities on
// output_scene, see core/scenePrompt.ts) and the reference image (an edge
// pin there, `currentHistoryRef(data.generation?.image)` — whatever
// Картинка's history slider is parked on — here). `paramsSlice`/
// `onFieldChange` rather than raw params/
// updateNodeParam so this doesn't care whether it's reading a node's flat
// params or output_scene's nested `params.video`.
const veoModelFieldsSchema = geminiVeoParamsSchema.omit({ prompt: true });

export function VeoModelFields({
    paramsSlice,
    onFieldChange,
}: {
    paramsSlice: Record<string, unknown>;
    onFieldChange: (key: string, value: unknown) => void;
}) {
    const RATIOS = ["16:9", "9:16"];
    const RESOLUTIONS = ["720p", "1080p"];
    const requiresFullDuration = paramsSlice.resolution !== "720p";
    const { control, isFieldValid } = useNodeParamsForm(veoModelFieldsSchema, paramsSlice);
    return (
        <>
            <Controller
                control={control}
                name="model"
                render={({ field }) => (
                    <SelectField
                        label="Модель"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("model", v)) onFieldChange("model", v);
                        }}
                        options={modelOptions(VEO_MODELS)}
                    />
                )}
            />
            <div className={sharedStyles.row2}>
                <Controller
                    control={control}
                    name="aspectRatio"
                    render={({ field }) => (
                        <SelectField
                            label="Соотношение сторон"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("aspectRatio", v)) onFieldChange("aspectRatio", v);
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
                                if (isFieldValid("resolution", v)) onFieldChange("resolution", v);
                            }}
                            options={RESOLUTIONS}
                        />
                    )}
                />
            </div>
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
                            if (isFieldValid("durationSeconds", Number(v)))
                                onFieldChange("durationSeconds", Number(v));
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
                            if (isFieldValid("negativePrompt", v))
                                onFieldChange("negativePrompt", v);
                        }}
                    />
                )}
            />
            <Controller
                control={control}
                name="seed"
                render={({ field }) => (
                    <SeedField
                        value={field.value}
                        onChange={field.onChange}
                        disabled
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
            <div className={sharedStyles.row2}>
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
            </div>
        </>
    );
}

export function GeminiVeoParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const prompt = edgeInput(node.data, edges, resolved, 0);
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
                        liveValue={wiredFieldDisplayValue(
                            node.data.generation as GenerationHistoryState | undefined,
                            prompt.value,
                            "prompt",
                        )}
                        updateNodeParam={updateNodeParam}
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
            <VeoModelFields
                paramsSlice={params}
                onFieldChange={(key, value) => updateNodeParam(node.id, key, value)}
            />
        </>
    );
}

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

// Fields shared by the standalone Nano Banana node and output_scene's
// Картинка tab — everything except the prompt (a WirableTextField sourced
// from an edge on the standalone node; composed internally from connected
// entities on output_scene, see core/scenePrompt.ts) and reference images
// (manually wired "+" pins there; auto-collected from wired entities' own
// photos here). `paramsSlice`/`onFieldChange` rather than raw params/
// updateNodeParam so this doesn't care whether it's reading a node's flat
// params or output_scene's nested `params.image`. `modelRowAction` is an
// optional slot next to the model select — the standalone node uses it for
// its "add reference image pin" button; output_scene's tab leaves it empty.
export function NanoBananaModelFields({
    paramsSlice,
    onFieldChange,
    modelRowAction,
    onReroll,
}: {
    paramsSlice: Record<string, unknown>;
    onFieldChange: (key: string, value: unknown) => void;
    modelRowAction?: React.ReactNode;
    // Bumps seed by 10000 and re-runs generation — what "re-run" means
    // differs per caller (a standalone node's runNode vs output_scene's own
    // handleGenerateImage), so it's supplied rather than computed here.
    onReroll?: () => void;
}) {
    const RATIOS = ["16:9", "1:1", "9:16", "3:2", "2:3", "4:3", "21:9"];
    const SIZES = ["1K", "2K", "4K"];
    const { control, isFieldValid } = useNodeParamsForm(nanoBananaSliceSchema, paramsSlice);
    return (
        <>
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
                                    if (isFieldValid("model", v)) onFieldChange("model", v);
                                }}
                                options={modelOptions(NANO_BANANA_MODELS)}
                            />
                        )}
                    />
                    {modelRowAction}
                </div>
            </div>
            <div className={sharedStyles.row2}>
                <Controller
                    control={control}
                    name="aspectRatio"
                    render={({ field }) => (
                        <SelectField
                            label="Соотношение сторон"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("aspectRatio", v)) onFieldChange("aspectRatio", v);
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
                                if (isFieldValid("imageSize", v)) onFieldChange("imageSize", v);
                            }}
                            options={SIZES}
                        />
                    )}
                />
            </div>
            <Controller
                control={control}
                name="seed"
                render={({ field }) => (
                    <SeedField
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={(v) => {
                            field.onBlur();
                            if (isFieldValid("seed", v)) onFieldChange("seed", v);
                        }}
                        onReroll={onReroll}
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
    const prompt = edgeInput(node.data, edges, resolved, 0);
    const imageCount = node.data.inputs.length - 1;
    const atLimit = imageCount >= MAX_NANO_BANANA_REFERENCE_IMAGES;
    const { control } = useNodeParamsForm(geminiNanoBananaParamsSchema, params);
    const { runNode } = useGraphContext();
    const handleRerollSeed = () => {
        const current = params.seed ? Number(params.seed) : undefined;
        const next =
            current !== undefined && !Number.isNaN(current) ? current + 10000 : generateSeed();
        void runNode(node.id, { seed: String(next) });
    };
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
                        liveValue={wiredFieldDisplayValue(
                            node.data.generation as GenerationHistoryState | undefined,
                            prompt.value,
                            "prompt",
                        )}
                        updateNodeParam={updateNodeParam}
                        value={field.value}
                        onChange={field.onChange}
                    />
                )}
            />
            <NanoBananaModelFields
                paramsSlice={params}
                onFieldChange={(key, value) => updateNodeParam(node.id, key, value)}
                onReroll={handleRerollSeed}
                modelRowAction={
                    <IconButton
                        icon="plus"
                        disabled={atLimit}
                        onClick={() => addImageInput(node.id)}
                        title={
                            atLimit
                                ? "Достигнут лимит Nano Banana — 14 изображений"
                                : "Добавить референсное изображение"
                        }
                    />
                }
            />
        </>
    );
}

export function GeminiLyriaParams({ node, params, edges, resolved, updateNodeParam }: EEP) {
    const prompt = edgeInput(node.data, edges, resolved, 0);
    const { control, isFieldValid } = useNodeParamsForm(geminiLyriaParamsSchema, params);
    const { runNode } = useGraphContext();
    const handleRerollSeed = () => {
        const current = params.seed ? Number(params.seed) : undefined;
        const next =
            current !== undefined && !Number.isNaN(current) ? current + 10000 : generateSeed();
        void runNode(node.id, { seed: String(next) });
    };
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
                        liveValue={wiredFieldDisplayValue(
                            node.data.generation as GenerationHistoryState | undefined,
                            prompt.value,
                            "prompt",
                        )}
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
                            if (isFieldValid("model", v)) updateNodeParam(node.id, "model", v);
                        }}
                        options={modelOptions(LYRIA_MODELS)}
                    />
                )}
            />
            <Controller
                control={control}
                name="seed"
                render={({ field }) => (
                    <SeedField
                        value={field.value}
                        onChange={field.onChange}
                        onReroll={handleRerollSeed}
                        onBlur={(v) => {
                            field.onBlur();
                            if (isFieldValid("seed", v)) updateNodeParam(node.id, "seed", v);
                        }}
                    />
                )}
            />
        </>
    );
}
