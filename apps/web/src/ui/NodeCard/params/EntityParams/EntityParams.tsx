import cn from "classnames";
import { Controller, useController } from "react-hook-form";
import { InFrameToggle, usePresetDatabase, useCategoryTags } from "@/ui/NodeCard/params/shared.tsx";
import type { EP } from "@/ui/NodeCard/params/shared.tsx";
import { useNodeParamsForm } from "@/ui/NodeCard/params/useNodeParamsForm.ts";
import {
    characterParamsSchema,
    characterPhotoGenDefaults,
    type CharacterNodeParams,
} from "@/schemas/entities/character.schema.ts";
import {
    locationParamsSchema,
    type LocationNodeParams,
} from "@/schemas/entities/location.schema.ts";
import {
    miseEnSceneParamsSchema,
    type MiseEnSceneNodeParams,
} from "@/schemas/entities/miseEnScene.schema.ts";
import {
    buildingParamsSchema,
    type BuildingNodeParams,
} from "@/schemas/entities/building.schema.ts";
import {
    clothingParamsSchema,
    type ClothingNodeParams,
} from "@/schemas/entities/clothing.schema.ts";
import { artworkParamsSchema, type ArtworkNodeParams } from "@/schemas/entities/artwork.schema.ts";
import {
    furnitureParamsSchema,
    type FurnitureNodeParams,
} from "@/schemas/entities/furniture.schema.ts";
import { musicParamsSchema, type MusicNodeParams } from "@/schemas/entities/music.schema.ts";
import { scriptParamsSchema, type ScriptNodeParams } from "@/schemas/entities/script.schema.ts";
import {
    storyboardParamsSchema,
    type StoryboardNodeParams,
} from "@/schemas/entities/storyboard.schema.ts";
import {
    transportParamsSchema,
    type TransportNodeParams,
} from "@/schemas/entities/transport.schema.ts";
import { PresetsField } from "@/ui/NodeCard/params/PresetsField/PresetsField.tsx";
import {
    newPhotoEntry,
    PhotoGallerySection,
    PhotoPreview,
} from "@/ui/components/PhotoGallerySection/PhotoGallerySection.tsx";
import { useImageGeneration } from "@/ui/hooks/useImageGeneration.ts";
import { useGenerationHistory } from "@/ui/hooks/useGenerationHistory.ts";
import { useRequireAuth } from "@/ui/hooks/useRequireAuth.ts";
import { geminiApiClient } from "@/core/api/index.ts";
import { nanoBananaRequestFromSlice } from "@/core/api/gemini/dto.ts";
import { composeScenePrompt, entityFromNode } from "@/core/scenePrompt.ts";
import { generateSeed } from "@/core/seed.ts";
import { useToastContext } from "@/store/contexts/ToastContext.tsx";
import { MAX_ENTITY_PHOTOS } from "@/schemas/entities/schemaHelpers.ts";
import type { EntityPhoto } from "@/schemas/entities/schemaHelpers.ts";
import type { GenerationHistoryState, NodeParams } from "@/types.ts";
import { NanoBananaModelFields } from "@/ui/NodeCard/params/GeminiParams.tsx";
import { Switch } from "@/ui/components/Switch/Switch.tsx";
import { MediaSlider } from "@/ui/NodeCard/MediaSlider/MediaSlider.tsx";
import { IconButton } from "@/ui/components/IconButton/IconButton.tsx";
import { SelectField } from "@/ui/components/SelectField/SelectField.tsx";
import { RangeField } from "@/ui/components/RangeField/RangeField.tsx";
import { NumberField } from "@/ui/components/NumberField/NumberField.tsx";
import { CoordinateField } from "@/ui/components/CoordinateField/CoordinateField.tsx";
import { DateRangeField } from "@/ui/components/DateRangeField/DateRangeField.tsx";
import { TextField } from "@/ui/components/TextField/TextField.tsx";
import { TextAreaField } from "@/ui/components/TextAreaField/TextAreaField.tsx";
import { CategoryTagGroup } from "@/ui/components/CategoryTagGroup/CategoryTagGroup.tsx";
import { SearchField } from "@/ui/components/SearchField/SearchField.tsx";
import { DropdownWithPreviews } from "@/ui/components/DropdownWithPreviews/DropdownWithPreviews.tsx";
import { ColorField } from "@/ui/components/ColorField/ColorField.tsx";
import { BareButton } from "@/ui/components/BareButton/BareButton.tsx";
import {
    haircutOptions,
    tattooOptions,
    accessoryOptions,
    clothingOptions,
} from "@/ui/NodeCard/params/EntityParams/CharacterStyling.tsx";
import { getMiseEnSceneDiagrams } from "@/data/miseEnSceneDiagrams.ts";
import {
    CHARACTER_EMOTIONS,
    CHARACTER_STYLISTS,
    LOCATION_WEATHERS,
    LOCATION_TIMES_OF_DAY,
    INTERIOR_EXTERIOR,
    CLOTHING_SEASONS,
    MUSIC_MOODS,
    SCRIPT_TONES,
} from "@hayverse/shared";
import styles from "@/ui/NodeCard/params/EntityParams/EntityParams.module.css";

const CHARACTER_CATEGORIES = [
    { key: "general", label: "Общие" },
    { key: "birth", label: "Рождение" },
    { key: "arc", label: "Арка" },
    { key: "styling", label: "Стиль" },
    { key: "generation", label: "Генерация" },
];

const LOCATION_CATEGORIES = [
    { key: "general", label: "Общие" },
    { key: "atmosphere", label: "Атмосфера" },
];

export function CharacterParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
    setNodeField,
}: EP<CharacterNodeParams> & {
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
    setNodeField: (id: string, patch: Partial<NodeParams>) => void;
}) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { generate, isGenerating } = useImageGeneration();
    const { showToast } = useToastContext();
    const requireAuth = useRequireAuth();
    const { control, isFieldValid } = useNodeParamsForm(characterParamsSchema, params);
    const lifetimeFrom = useController({ control, name: "lifetimeFrom" });
    const lifetimeTo = useController({ control, name: "lifetimeTo" });

    const photos = params.photos || [];
    // Absent on characters created before the generation block existed (the
    // field is `.optional()` for exactly that reason, see character.schema.ts).
    const photoGen = { ...characterPhotoGenDefaults, ...(params.photoGen ?? {}) };
    const updatePhotoGen = (key: string, value: unknown) =>
        updateNodeParams(node.id, { photoGen: { ...photoGen, [key]: value } });

    // Generated variants live in their own history stream rather than going
    // straight into `photos`: one prompt can return several images, and a
    // gallery capped at MAX_ENTITY_PHOTOS shouldn't fill up with rejects. The
    // user promotes the one they want with «Принять в фото» below. Flat
    // GenerationHistoryState (not output_scene's per-stage shape) — a character
    // has exactly one stream.
    const photoHist = useGenerationHistory(
        node.data.generation as GenerationHistoryState | undefined,
        (patch) =>
            setNodeField(node.id, {
                generation: {
                    ...(node.data.generation as GenerationHistoryState | undefined),
                    ...patch,
                } as GenerationHistoryState,
            }),
        // Scrubbing back to a variant restores the config that produced it.
        // `lastComposedPrompt` rides along in the same snapshot but isn't
        // config — it's read straight from paramsHistory where the prompt panel
        // needs it (see NodeCard.tsx), so it's dropped here rather than written
        // into photoGen.
        (snapshot) => {
            const { lastComposedPrompt: _prompt, ...configSnapshot } = snapshot;
            updateNodeParams(node.id, { photoGen: { ...photoGen, ...configSnapshot } });
        },
    );

    // `seedOverride` comes from the reroll button, which computes seed+10000
    // itself — a separate updateNodeParams-then-generate would read the stale
    // value (see core/seed.ts's withNodeOverrides). An empty seed field
    // self-generates one here so it stays recoverable afterwards: the Gemini
    // Developer API never echoes back a seed it picked itself.
    const handleGeneratePhoto = async (seedOverride?: number) => {
        if (!requireAuth()) return;
        const self = entityFromNode(node.data);
        const prompt = await composeScenePrompt(
            params.promptComposition,
            [self],
            undefined,
            showToast,
            params.additionalDescription,
            "entity",
        );
        const seed = seedOverride ?? (photoGen.seed ? Number(photoGen.seed) : generateSeed());
        const seedStr = String(seed);
        if (photoGen.seed !== seedStr) updatePhotoGen("seed", seedStr);
        const refs = await generate((toast) =>
            geminiApiClient.generateImageFromRefs(
                nanoBananaRequestFromSlice(photoGen, {
                    prompt,
                    imageUrls: self.photoUrls,
                    seed,
                }),
                toast,
            ),
        );
        if (refs.length > 0)
            photoHist.appendMany(refs, { ...photoGen, seed: seedStr, lastComposedPrompt: prompt });
    };

    const handleRerollPhotoSeed = () => {
        const current = photoGen.seed ? Number(photoGen.seed) : undefined;
        const next =
            current !== undefined && !Number.isNaN(current) ? current + 10000 : generateSeed();
        void handleGeneratePhoto(next);
    };

    // Promotes the variant the slider is parked on into the real gallery. The
    // cover is left alone unless there was nothing to cover yet — a generated
    // variant shouldn't silently replace the photo representing this character.
    const acceptGeneratedPhoto = () => {
        const ref = photoHist.currentRef;
        if (!ref) return;
        setNodePhotos(
            node.id,
            [...photos, newPhotoEntry(ref)],
            photos.length === 0 ? 0 : (params.coverPhotoIndex ?? 0),
        );
    };
    const acceptedAlready =
        !!photoHist.currentRef && photos.some((p) => p.ref === photoHist.currentRef);

    const {
        activeTags,
        searchQuery,
        setSearchQuery,
        isAllActive,
        toggleTag,
        toggleAll,
        shouldShow,
    } = useCategoryTags(CHARACTER_CATEGORIES);

    return (
        <>
            {/* Photo preview pinned to the top, above the search field */}
            <PhotoPreview
                node={node}
                photos={params.photos || []}
                coverPhotoIndex={params.coverPhotoIndex ?? 0}
                updateNodeParam={updateNodeParam}
                setNodePhotos={setNodePhotos}
            />

            {/* Category selector tags and Search input */}
            <div className={styles.searchContainer}>
                <SearchField value={searchQuery} onChange={setSearchQuery} />
                <CategoryTagGroup
                    options={CHARACTER_CATEGORIES}
                    active={activeTags}
                    onToggle={toggleTag}
                    onToggleAll={toggleAll}
                    isAllActive={isAllActive}
                />
            </div>

            {/* 1. GENERAL CATEGORY */}
            {shouldShow("general", "Персонаж Preset") && (
                <PresetsField
                    label="Персонаж"
                    items={db}
                    selected={params.presetId}
                    onSelect={onSelect}
                    onSave={onSave}
                    onDelete={onDelete}
                    hasUnsavedChanges={hasUnsavedChanges}
                    missingSaveFields={missingSaveFields}
                    isResolving={isResolving}
                />
            )}

            {shouldShow("general", "Имя") && (
                <Controller
                    control={control}
                    name="name"
                    render={({ field, fieldState }) => (
                        <TextField
                            label="Имя"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                            }}
                            onBlur={field.onBlur}
                            error={fieldState.error?.message}
                        />
                    )}
                />
            )}

            {shouldShow("general", "Фото Персонажа") && (
                <PhotoGallerySection
                    node={node}
                    label="Фото персонажа"
                    photos={photos}
                    setNodePhotos={setNodePhotos}
                />
            )}

            {/* GENERATION CATEGORY — its own tag rather than living inside
                "Общие", mirroring output_scene's Генерация tab. Gated on the tag
                alone (not `shouldShow`) so the block stays whole: it's one
                feature, not a list of independently searchable fields. Results
                land in this node's own history and reach the gallery above only
                on «Принять в фото». */}
            {activeTags.generation && (
                <>
                    {/* Same switch, wording and default as output_scene's — this
                        is the same param, so it must not look like a different
                        control here (see UtilParams.tsx). */}
                    <Switch
                        label="Составлять промпт через LLM"
                        value={params.promptComposition === "llm"}
                        onChange={(v) =>
                            updateNodeParam(node.id, "promptComposition", v ? "llm" : "raw")
                        }
                    />

                    <hr className={styles.divider} />
                    <NanoBananaModelFields
                        paramsSlice={photoGen}
                        onFieldChange={updatePhotoGen}
                        onReroll={handleRerollPhotoSeed}
                    />
                    <div className={styles.generateRow}>
                        <IconButton
                            icon="wand"
                            loading={isGenerating}
                            onClick={() => void handleGeneratePhoto()}
                            title="Сгенерировать фото"
                        />
                        <IconButton
                            icon="check"
                            disabled={
                                !photoHist.currentRef ||
                                acceptedAlready ||
                                photos.length >= MAX_ENTITY_PHOTOS
                            }
                            onClick={acceptGeneratedPhoto}
                            title={
                                acceptedAlready
                                    ? "Уже в фото персонажа"
                                    : photos.length >= MAX_ENTITY_PHOTOS
                                      ? `Достигнут лимит — ${MAX_ENTITY_PHOTOS} фото`
                                      : "Принять в фото"
                            }
                        />
                    </div>
                    {photoHist.resolvedUrls.length > 0 && (
                        <MediaSlider
                            items={photoHist.resolvedUrls.map((url) => ({
                                url,
                                type: "image" as const,
                            }))}
                            index={photoHist.idx}
                            onIndexChange={photoHist.onIndexChange}
                            onDelete={photoHist.onDelete}
                        />
                    )}
                </>
            )}

            {shouldShow("general", "Текущие координаты") && (
                <Controller
                    control={control}
                    name="currentPosition"
                    render={({ field }) => (
                        <CoordinateField
                            label="Текущие координаты"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("currentPosition", v))
                                    updateNodeParam(node.id, "currentPosition", v);
                            }}
                        />
                    )}
                />
            )}

            {/* 2. BIRTH CATEGORY */}
            {(shouldShow("birth", "Дата рождения") || shouldShow("birth", "Дата смерти")) && (
                <DateRangeField
                    fromLabel="Дата рождения"
                    toLabel="Дата смерти"
                    from={lifetimeFrom.field.value}
                    to={lifetimeTo.field.value}
                    onChangeFrom={(v) => {
                        lifetimeFrom.field.onChange(v);
                        if (isFieldValid("lifetimeFrom", v))
                            updateNodeParam(node.id, "lifetimeFrom", v);
                    }}
                    onChangeTo={(v) => {
                        lifetimeTo.field.onChange(v);
                        if (isFieldValid("lifetimeTo", v))
                            updateNodeParam(node.id, "lifetimeTo", v);
                    }}
                />
            )}

            {shouldShow("birth", "Место рождения") && (
                <Controller
                    control={control}
                    name="birthPlace"
                    render={({ field }) => (
                        <CoordinateField
                            label="Место рождения"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("birthPlace", v))
                                    updateNodeParam(node.id, "birthPlace", v);
                            }}
                        />
                    )}
                />
            )}

            {shouldShow("birth", "Место смерти") && (
                <Controller
                    control={control}
                    name="deathPlace"
                    render={({ field }) => (
                        <CoordinateField
                            label="Место смерти"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("deathPlace", v))
                                    updateNodeParam(node.id, "deathPlace", v);
                            }}
                        />
                    )}
                />
            )}

            {/* 3. ARC CATEGORY */}
            {shouldShow("arc", "Кто она?") && (
                <Controller
                    control={control}
                    name="arcWho"
                    render={({ field }) => (
                        <TextAreaField
                            label="Кто она?"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("arcWho", v))
                                    updateNodeParam(node.id, "arcWho", v);
                            }}
                        />
                    )}
                />
            )}

            {shouldShow("arc", "Чего она хочет внутри?") && (
                <Controller
                    control={control}
                    name="arcWants"
                    render={({ field }) => (
                        <TextAreaField
                            label="Чего она хочет внутри?"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("arcWants", v))
                                    updateNodeParam(node.id, "arcWants", v);
                            }}
                        />
                    )}
                />
            )}

            {shouldShow("arc", "Как она этого достигнет?") && (
                <Controller
                    control={control}
                    name="arcHow"
                    render={({ field }) => (
                        <TextAreaField
                            label="Как она этого достигнет?"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("arcHow", v))
                                    updateNodeParam(node.id, "arcHow", v);
                            }}
                        />
                    )}
                />
            )}

            {shouldShow("arc", "Что на кону?") && (
                <Controller
                    control={control}
                    name="arcStake"
                    render={({ field }) => (
                        <TextAreaField
                            label="Что на кону?"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("arcStake", v))
                                    updateNodeParam(node.id, "arcStake", v);
                            }}
                        />
                    )}
                />
            )}

            {/* 4. STYLING CATEGORY */}
            {shouldShow("styling", "Возраст") && (
                <Controller
                    control={control}
                    name="age"
                    render={({ field, fieldState }) => (
                        <NumberField
                            label="Возраст"
                            min={10}
                            max={90}
                            step={1}
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("age", v)) updateNodeParam(node.id, "age", v);
                            }}
                            onBlur={field.onBlur}
                            error={fieldState.error?.message}
                        />
                    )}
                />
            )}

            {shouldShow("styling", "Эмоция") && (
                <Controller
                    control={control}
                    name="emotion"
                    render={({ field }) => (
                        <SelectField
                            label="Эмоция"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("emotion", v))
                                    updateNodeParam(node.id, "emotion", v);
                            }}
                            options={CHARACTER_EMOTIONS}
                        />
                    )}
                />
            )}

            {shouldShow("styling", "Стилист") && (
                <Controller
                    control={control}
                    name="stylist"
                    render={({ field }) => (
                        <SelectField
                            label="Стилист"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("stylist", v))
                                    updateNodeParam(node.id, "stylist", v);
                            }}
                            options={CHARACTER_STYLISTS}
                        />
                    )}
                />
            )}

            {shouldShow("styling", "В кадре") && (
                <Controller
                    control={control}
                    name="inFrame"
                    render={({ field }) => (
                        <InFrameToggle
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("inFrame", v))
                                    updateNodeParam(node.id, "inFrame", v);
                            }}
                        />
                    )}
                />
            )}

            {shouldShow("styling", "Прическа") && (
                <Controller
                    control={control}
                    name="haircut"
                    render={({ field }) => (
                        <DropdownWithPreviews
                            label="Прическа"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("haircut", v))
                                    updateNodeParam(node.id, "haircut", v);
                            }}
                            options={haircutOptions}
                        />
                    )}
                />
            )}

            {shouldShow("styling", "Татуировки") && (
                <Controller
                    control={control}
                    name="tattoos"
                    render={({ field }) => (
                        <DropdownWithPreviews
                            label="Татуировки"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("tattoos", v))
                                    updateNodeParam(node.id, "tattoos", v);
                            }}
                            options={tattooOptions}
                        />
                    )}
                />
            )}

            {shouldShow("styling", "Аксессуары") && (
                <Controller
                    control={control}
                    name="accessories"
                    render={({ field }) => (
                        <DropdownWithPreviews
                            label="Аксессуары"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("accessories", v))
                                    updateNodeParam(node.id, "accessories", v);
                            }}
                            options={accessoryOptions}
                        />
                    )}
                />
            )}

            {shouldShow("styling", "Одежда") && (
                <Controller
                    control={control}
                    name="clothing"
                    render={({ field }) => (
                        <DropdownWithPreviews
                            label="Одежда"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("clothing", v))
                                    updateNodeParam(node.id, "clothing", v);
                            }}
                            options={clothingOptions}
                        />
                    )}
                />
            )}

            {shouldShow("styling", "Цвет") && (
                <Controller
                    control={control}
                    name="color"
                    render={({ field }) => (
                        <ColorField
                            label="Цвет"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("color", v)) updateNodeParam(node.id, "color", v);
                            }}
                        />
                    )}
                />
            )}
        </>
    );
}

export function LocationParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
}: EP<LocationNodeParams> & {
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
}) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { control, isFieldValid } = useNodeParamsForm(locationParamsSchema, params);

    const {
        activeTags,
        searchQuery,
        setSearchQuery,
        isAllActive,
        toggleTag,
        toggleAll,
        shouldShow,
    } = useCategoryTags(LOCATION_CATEGORIES);

    return (
        <>
            {/* Photo preview pinned to the top, above the search field */}
            <PhotoPreview
                node={node}
                photos={params.photos || []}
                coverPhotoIndex={params.coverPhotoIndex ?? 0}
                updateNodeParam={updateNodeParam}
                setNodePhotos={setNodePhotos}
            />

            <div className={styles.searchContainer}>
                <SearchField value={searchQuery} onChange={setSearchQuery} />
                <CategoryTagGroup
                    options={LOCATION_CATEGORIES}
                    active={activeTags}
                    onToggle={toggleTag}
                    onToggleAll={toggleAll}
                    isAllActive={isAllActive}
                />
            </div>

            {/* 1. GENERAL CATEGORY */}
            {shouldShow("general", "Локация Preset") && (
                <PresetsField
                    label="Локация"
                    items={db}
                    selected={params.presetId}
                    onSelect={onSelect}
                    onSave={onSave}
                    onDelete={onDelete}
                    hasUnsavedChanges={hasUnsavedChanges}
                    missingSaveFields={missingSaveFields}
                    isResolving={isResolving}
                />
            )}

            {shouldShow("general", "Имя") && (
                <Controller
                    control={control}
                    name="name"
                    render={({ field, fieldState }) => (
                        <TextField
                            label="Имя"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                            }}
                            onBlur={field.onBlur}
                            error={fieldState.error?.message}
                        />
                    )}
                />
            )}

            {shouldShow("general", "Фото Локации") && (
                <PhotoGallerySection
                    node={node}
                    label="Фото локации"
                    photos={params.photos || []}
                    setNodePhotos={setNodePhotos}
                />
            )}

            {shouldShow("general", "Координаты") && (
                <Controller
                    control={control}
                    name="coordinates"
                    render={({ field }) => (
                        <CoordinateField
                            label="Координаты"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("coordinates", v))
                                    updateNodeParam(node.id, "coordinates", v);
                            }}
                        />
                    )}
                />
            )}

            {shouldShow("general", "Радиус зоны") && (
                <Controller
                    control={control}
                    name="radiusKm"
                    render={({ field }) => (
                        <NumberField
                            label={`Радиус зоны (${field.value ?? 0} км)`}
                            min={0.1}
                            max={500}
                            step={0.5}
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("radiusKm", v))
                                    updateNodeParam(node.id, "radiusKm", v);
                            }}
                        />
                    )}
                />
            )}

            {/* 2. ATMOSPHERE CATEGORY */}
            {shouldShow("atmosphere", "Погода") && (
                <Controller
                    control={control}
                    name="weather"
                    render={({ field }) => (
                        <SelectField
                            label="Погода"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("weather", v))
                                    updateNodeParam(node.id, "weather", v);
                            }}
                            options={LOCATION_WEATHERS}
                        />
                    )}
                />
            )}

            {shouldShow("atmosphere", "Время суток") && (
                <Controller
                    control={control}
                    name="timeOfDay"
                    render={({ field }) => (
                        <SelectField
                            label="Время суток"
                            value={field.value}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("timeOfDay", v))
                                    updateNodeParam(node.id, "timeOfDay", v);
                            }}
                            options={LOCATION_TIMES_OF_DAY}
                        />
                    )}
                />
            )}

            {shouldShow("atmosphere", "Интерьер / Экстерьер") && (
                <Controller
                    control={control}
                    name="interiorExterior"
                    render={({ field }) => (
                        <div className={styles.fld}>
                            <span>Интерьер / Экстерьер</span>
                            <div className={styles.segBtn}>
                                {INTERIOR_EXTERIOR.map((v) => (
                                    <BareButton
                                        key={v}
                                        className={cn(field.value === v && styles.isOn)}
                                        onClick={() => {
                                            field.onChange(v);
                                            if (isFieldValid("interiorExterior", v))
                                                updateNodeParam(node.id, "interiorExterior", v);
                                        }}>
                                        {v}
                                    </BareButton>
                                ))}
                            </div>
                        </div>
                    )}
                />
            )}

            {shouldShow("atmosphere", "Уровень повреждения дома") && (
                <Controller
                    control={control}
                    name="damageLevel"
                    render={({ field }) => (
                        <RangeField
                            label={`Уровень повреждения дома (${field.value ?? 0}%)`}
                            min={0}
                            max={100}
                            step={5}
                            value={field.value ?? 0}
                            onChange={(v) => {
                                field.onChange(v);
                                if (isFieldValid("damageLevel", v))
                                    updateNodeParam(node.id, "damageLevel", v);
                            }}
                        />
                    )}
                />
            )}
        </>
    );
}

export function MiseEnSceneParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
}: EP<MiseEnSceneNodeParams> & {
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
}) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { control, isFieldValid } = useNodeParamsForm(miseEnSceneParamsSchema, params);

    const diagrams = getMiseEnSceneDiagrams(params.peopleCount, params.cameraCount);
    const photos = params.photos || [];
    const activeDiagramSrc = photos[params.coverPhotoIndex ?? 0]?.ref;

    const selectDiagram = (src: string) => {
        const existingIdx = photos.findIndex((p) => p.ref === src);
        if (existingIdx !== -1) {
            updateNodeParam(node.id, "coverPhotoIndex", existingIdx);
            return;
        }
        setNodePhotos(node.id, [...photos, newPhotoEntry(src)], photos.length);
    };

    return (
        <>
            <PhotoPreview
                node={node}
                photos={params.photos || []}
                coverPhotoIndex={params.coverPhotoIndex ?? 0}
                updateNodeParam={updateNodeParam}
                setNodePhotos={setNodePhotos}
            />
            <PresetsField
                label="Мизансцена"
                items={db}
                selected={params.presetId}
                onSelect={onSelect}
                onSave={onSave}
                onDelete={onDelete}
                hasUnsavedChanges={hasUnsavedChanges}
                missingSaveFields={missingSaveFields}
                isResolving={isResolving}
            />
            <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                    <TextField
                        label="Имя"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                        }}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />
            <PhotoGallerySection
                node={node}
                label="Фото мизансцены"
                photos={params.photos || []}
                setNodePhotos={setNodePhotos}
            />
            <Controller
                control={control}
                name="peopleCount"
                render={({ field }) => (
                    <NumberField
                        label="Количество людей в кадре"
                        min={1}
                        max={20}
                        step={1}
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("peopleCount", v))
                                updateNodeParam(node.id, "peopleCount", v);
                        }}
                    />
                )}
            />
            <Controller
                control={control}
                name="cameraCount"
                render={({ field }) => (
                    <NumberField
                        label="Количество камер"
                        min={1}
                        max={10}
                        step={1}
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("cameraCount", v))
                                updateNodeParam(node.id, "cameraCount", v);
                        }}
                    />
                )}
            />
            {diagrams.length > 0 && (
                <div className={styles.fld}>
                    <span>Схемы расстановки</span>
                    <div className={styles.diagramGrid}>
                        {diagrams.map((d) => (
                            <div
                                key={d.src}
                                className={cn(
                                    styles.diagramCell,
                                    "nodrag",
                                    activeDiagramSrc === d.src && styles.diagramCellActive,
                                )}
                                style={{ backgroundImage: `url(${d.src})` }}
                                onClick={() => selectDiagram(d.src)}
                                title={d.label}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

export function BuildingParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
}: EP<BuildingNodeParams> & {
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
}) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { control, isFieldValid } = useNodeParamsForm(buildingParamsSchema, params);
    return (
        <>
            <PhotoPreview
                node={node}
                photos={params.photos || []}
                coverPhotoIndex={params.coverPhotoIndex ?? 0}
                updateNodeParam={updateNodeParam}
                setNodePhotos={setNodePhotos}
            />
            <PresetsField
                label="Здание"
                items={db}
                selected={params.presetId}
                onSelect={onSelect}
                onSave={onSave}
                onDelete={onDelete}
                hasUnsavedChanges={hasUnsavedChanges}
                missingSaveFields={missingSaveFields}
                isResolving={isResolving}
            />
            <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                    <TextField
                        label="Имя"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                        }}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />
            <PhotoGallerySection
                node={node}
                label="Фото здания"
                photos={params.photos || []}
                setNodePhotos={setNodePhotos}
            />
            <Controller
                control={control}
                name="floor"
                render={({ field }) => (
                    <NumberField
                        label="Этаж"
                        min={1}
                        max={10}
                        step={1}
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("floor", v)) updateNodeParam(node.id, "floor", v);
                        }}
                    />
                )}
            />
            <Controller
                control={control}
                name="inFrame"
                render={({ field }) => (
                    <InFrameToggle
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("inFrame", v)) updateNodeParam(node.id, "inFrame", v);
                        }}
                    />
                )}
            />
        </>
    );
}

export function ClothingParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
}: EP<ClothingNodeParams> & {
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
}) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { control, isFieldValid } = useNodeParamsForm(clothingParamsSchema, params);
    return (
        <>
            <PhotoPreview
                node={node}
                photos={params.photos || []}
                coverPhotoIndex={params.coverPhotoIndex ?? 0}
                updateNodeParam={updateNodeParam}
                setNodePhotos={setNodePhotos}
            />
            <PresetsField
                label="Дизайнер"
                items={db}
                selected={params.presetId}
                onSelect={onSelect}
                onSave={onSave}
                onDelete={onDelete}
                hasUnsavedChanges={hasUnsavedChanges}
                missingSaveFields={missingSaveFields}
                isResolving={isResolving}
            />
            <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                    <TextField
                        label="Имя"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                        }}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />
            <PhotoGallerySection
                node={node}
                label="Фото одежды"
                photos={params.photos || []}
                setNodePhotos={setNodePhotos}
            />
            <Controller
                control={control}
                name="season"
                render={({ field }) => (
                    <SelectField
                        label="Сезон"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("season", v)) updateNodeParam(node.id, "season", v);
                        }}
                        options={CLOTHING_SEASONS}
                    />
                )}
            />
            <Controller
                control={control}
                name="wear"
                render={({ field }) => (
                    <RangeField
                        label={`Износ (${field.value}%)`}
                        min={0}
                        max={100}
                        step={1}
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("wear", v)) updateNodeParam(node.id, "wear", v);
                        }}
                    />
                )}
            />
        </>
    );
}

export function ArtworkParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
}: EP<ArtworkNodeParams> & {
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
}) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { control, isFieldValid } = useNodeParamsForm(artworkParamsSchema, params);
    return (
        <>
            <PhotoPreview
                node={node}
                photos={params.photos || []}
                coverPhotoIndex={params.coverPhotoIndex ?? 0}
                updateNodeParam={updateNodeParam}
                setNodePhotos={setNodePhotos}
            />
            <PresetsField
                label="Произведение"
                items={db}
                selected={params.presetId}
                onSelect={onSelect}
                onSave={onSave}
                onDelete={onDelete}
                hasUnsavedChanges={hasUnsavedChanges}
                missingSaveFields={missingSaveFields}
                isResolving={isResolving}
            />
            <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                    <TextField
                        label="Имя"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                        }}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />
            <PhotoGallerySection
                node={node}
                label="Фото произведения"
                photos={params.photos || []}
                setNodePhotos={setNodePhotos}
            />
            <Controller
                control={control}
                name="scale"
                render={({ field }) => (
                    <RangeField
                        label={`Масштаб (${field.value}%)`}
                        min={20}
                        max={300}
                        step={10}
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("scale", v)) updateNodeParam(node.id, "scale", v);
                        }}
                    />
                )}
            />
            <Controller
                control={control}
                name="inFrame"
                render={({ field }) => (
                    <InFrameToggle
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("inFrame", v)) updateNodeParam(node.id, "inFrame", v);
                        }}
                    />
                )}
            />
        </>
    );
}

export function FurnitureParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
}: EP<FurnitureNodeParams> & {
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
}) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { control, isFieldValid } = useNodeParamsForm(furnitureParamsSchema, params);
    return (
        <>
            <PhotoPreview
                node={node}
                photos={params.photos || []}
                coverPhotoIndex={params.coverPhotoIndex ?? 0}
                updateNodeParam={updateNodeParam}
                setNodePhotos={setNodePhotos}
            />
            <PresetsField
                label="Мебель"
                items={db}
                selected={params.presetId}
                onSelect={onSelect}
                onSave={onSave}
                onDelete={onDelete}
                hasUnsavedChanges={hasUnsavedChanges}
                missingSaveFields={missingSaveFields}
                isResolving={isResolving}
            />
            <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                    <TextField
                        label="Имя"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                        }}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />
            <PhotoGallerySection
                node={node}
                label="Фото мебели"
                photos={params.photos || []}
                setNodePhotos={setNodePhotos}
            />
            <Controller
                control={control}
                name="density"
                render={({ field }) => (
                    <RangeField
                        label={`Плотность (${field.value})`}
                        min={1}
                        max={10}
                        step={1}
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("density", v)) updateNodeParam(node.id, "density", v);
                        }}
                    />
                )}
            />
            <Controller
                control={control}
                name="inFrame"
                render={({ field }) => (
                    <InFrameToggle
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("inFrame", v)) updateNodeParam(node.id, "inFrame", v);
                        }}
                    />
                )}
            />
        </>
    );
}

export function MusicParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
}: EP<MusicNodeParams> & {
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
}) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { control, isFieldValid } = useNodeParamsForm(musicParamsSchema, params);
    return (
        <>
            <PhotoPreview
                node={node}
                photos={params.photos || []}
                coverPhotoIndex={params.coverPhotoIndex ?? 0}
                updateNodeParam={updateNodeParam}
                setNodePhotos={setNodePhotos}
            />
            <PresetsField
                label="Трек"
                items={db}
                selected={params.presetId}
                onSelect={onSelect}
                onSave={onSave}
                onDelete={onDelete}
                hasUnsavedChanges={hasUnsavedChanges}
                missingSaveFields={missingSaveFields}
                isResolving={isResolving}
            />
            <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                    <TextField
                        label="Имя"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                        }}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />
            <PhotoGallerySection
                node={node}
                label="Фото трека"
                photos={params.photos || []}
                setNodePhotos={setNodePhotos}
            />
            <Controller
                control={control}
                name="mood"
                render={({ field }) => (
                    <SelectField
                        label="Настроение"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("mood", v)) updateNodeParam(node.id, "mood", v);
                        }}
                        options={MUSIC_MOODS}
                    />
                )}
            />
        </>
    );
}

export function ScriptParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
}: EP<ScriptNodeParams> & {
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
}) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { control, isFieldValid } = useNodeParamsForm(scriptParamsSchema, params);
    return (
        <>
            <PhotoPreview
                node={node}
                photos={params.photos || []}
                coverPhotoIndex={params.coverPhotoIndex ?? 0}
                updateNodeParam={updateNodeParam}
                setNodePhotos={setNodePhotos}
            />
            <PresetsField
                label="Сцена"
                items={db}
                selected={params.presetId}
                onSelect={onSelect}
                onSave={onSave}
                onDelete={onDelete}
                hasUnsavedChanges={hasUnsavedChanges}
                missingSaveFields={missingSaveFields}
                isResolving={isResolving}
            />
            <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                    <TextField
                        label="Имя"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                        }}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />
            <PhotoGallerySection
                node={node}
                label="Фото сценария"
                photos={params.photos || []}
                setNodePhotos={setNodePhotos}
            />
            <Controller
                control={control}
                name="tone"
                render={({ field }) => (
                    <SelectField
                        label="Тон"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("tone", v)) updateNodeParam(node.id, "tone", v);
                        }}
                        options={SCRIPT_TONES}
                    />
                )}
            />
        </>
    );
}

export function StoryboardParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
}: EP<StoryboardNodeParams>) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { control, isFieldValid } = useNodeParamsForm(storyboardParamsSchema, params);
    return (
        <>
            <PresetsField
                label="Версия"
                items={db}
                selected={params.presetId}
                onSelect={onSelect}
                onSave={onSave}
                onDelete={onDelete}
                hasUnsavedChanges={hasUnsavedChanges}
                missingSaveFields={missingSaveFields}
                isResolving={isResolving}
            />
            <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                    <TextField
                        label="Имя"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                        }}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />
            <Controller
                control={control}
                name="shots"
                render={({ field }) => (
                    <NumberField
                        label="Кадров"
                        min={1}
                        max={12}
                        step={1}
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("shots", v)) updateNodeParam(node.id, "shots", v);
                        }}
                    />
                )}
            />
        </>
    );
}

export function TransportParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
    setNodePhotos,
}: EP<TransportNodeParams> & {
    setNodePhotos: (id: string, photos: EntityPhoto[], coverPhotoIndex: number) => void;
}) {
    const { db, onSelect, onSave, onDelete, hasUnsavedChanges, missingSaveFields, isResolving } =
        usePresetDatabase(node, params, updateNodeParams);
    const { control, isFieldValid } = useNodeParamsForm(transportParamsSchema, params);
    return (
        <>
            <PhotoPreview
                node={node}
                photos={params.photos || []}
                coverPhotoIndex={params.coverPhotoIndex ?? 0}
                updateNodeParam={updateNodeParam}
                setNodePhotos={setNodePhotos}
            />
            <PresetsField
                label="Транспорт"
                items={db}
                selected={params.presetId}
                onSelect={onSelect}
                onSave={onSave}
                onDelete={onDelete}
                hasUnsavedChanges={hasUnsavedChanges}
                missingSaveFields={missingSaveFields}
                isResolving={isResolving}
            />
            <Controller
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                    <TextField
                        label="Имя"
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("name", v)) updateNodeParam(node.id, "name", v);
                        }}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                    />
                )}
            />
            <PhotoGallerySection
                node={node}
                label="Фото транспорта"
                photos={params.photos || []}
                setNodePhotos={setNodePhotos}
            />
            <Controller
                control={control}
                name="inFrame"
                render={({ field }) => (
                    <InFrameToggle
                        value={field.value}
                        onChange={(v) => {
                            field.onChange(v);
                            if (isFieldValid("inFrame", v)) updateNodeParam(node.id, "inFrame", v);
                        }}
                    />
                )}
            />
        </>
    );
}
