import { useState } from "react";
import cn from "classnames";
import { DatabaseSelect, InFrameToggle, usePresetDatabase } from "../shared.tsx";
import type { EP } from "../shared.tsx";
import { PhotoGallerySection } from "../../../components/PhotoGallerySection/PhotoGallerySection.tsx";
import { SelectField } from "../../../components/SelectField/SelectField.tsx";
import { RangeField } from "../../../components/RangeField/RangeField.tsx";
import { NumberField } from "../../../components/NumberField/NumberField.tsx";
import { CoordinateField } from "../../../components/CoordinateField/CoordinateField.tsx";
import { DateRangeField } from "../../../components/DateRangeField/DateRangeField.tsx";
import { TextField } from "../../../components/TextField/TextField.tsx";
import { TextAreaField } from "../../../components/TextAreaField/TextAreaField.tsx";
import { CategoryTagGroup } from "../../../components/CategoryTagGroup/CategoryTagGroup.tsx";
import { SearchField } from "../../../components/SearchField/SearchField.tsx";
import { DropdownWithPreviews } from "../../../components/DropdownWithPreviews/DropdownWithPreviews.tsx";
import {
    haircutOptions,
    tattooOptions,
    accessoryOptions,
    clothingOptions,
} from "./CharacterStyling.tsx";
import type {
    CharacterNodeParams,
    LocationNodeParams,
    BuildingNodeParams,
    ClothingNodeParams,
    ArtworkNodeParams,
    FurnitureNodeParams,
    MusicNodeParams,
    ScriptNodeParams,
    StoryboardNodeParams,
    TransportNodeParams,
} from "../../../../types.ts";
import styles from "./EntityParams.module.css";

const CHARACTER_CATEGORIES = [
    { key: "general", label: "Общие" },
    { key: "birth", label: "Рождение" },
    { key: "arc", label: "Арка" },
    { key: "styling", label: "Стиль" },
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
}: EP<CharacterNodeParams> & {
    setNodePhotos: (id: string, photos: string[], photoIdx: number) => void;
}) {
    const { db, onSelect, onAdd, onUpdate, hasUnsavedChanges } = usePresetDatabase(
        node,
        params,
        updateNodeParams,
    );

    // Toggle Category Tags and Search State
    const [activeTags, setActiveTags] = useState<Record<string, boolean>>({
        general: true,
        birth: false,
        arc: false,
        styling: false,
    });
    const [searchQuery, setSearchQuery] = useState("");

    const isAllActive =
        activeTags.general && activeTags.birth && activeTags.arc && activeTags.styling;

    const toggleTag = (tag: string) => {
        setActiveTags((prev) => ({
            ...prev,
            [tag]: !prev[tag],
        }));
    };

    const toggleAll = () => {
        const nextVal = !isAllActive;
        setActiveTags({
            general: nextVal,
            birth: nextVal,
            arc: nextVal,
            styling: nextVal,
        });
    };

    // Filter components by active tab tag and search label queries
    const shouldShow = (category: string, label: string) => {
        if (!activeTags[category as keyof typeof activeTags]) return false;
        if (!searchQuery) return true;
        return label.toLowerCase().includes(searchQuery.toLowerCase());
    };

    return (
        <>
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
                <DatabaseSelect
                    label="Персонаж"
                    items={db}
                    selected={params.selectedItem}
                    onSelect={onSelect}
                    onAdd={onAdd}
                    onUpdate={onUpdate}
                    hasUnsavedChanges={hasUnsavedChanges}
                    addLabel="Добавить персонажа"
                />
            )}

            {shouldShow("general", "Имя") && (
                <TextField
                    label="Имя"
                    value={params.name}
                    onChange={(v) => updateNodeParam(node.id, "name", v)}
                />
            )}

            {shouldShow("general", "Фото Персонажа") && (
                <PhotoGallerySection
                    node={node}
                    label="Фото персонажа"
                    photos={params.photos || []}
                    photoIdx={params.photoIdx ?? 0}
                    pinterestUrl={params.pinterestUrl}
                    updateNodeParam={updateNodeParam}
                    setNodePhotos={setNodePhotos}
                    resetKey={params.selectedItem}
                />
            )}

            {shouldShow("general", "Текущие координаты") && (
                <CoordinateField
                    label="Текущие координаты"
                    value={params.currentPosition}
                    onChange={(v) => updateNodeParam(node.id, "currentPosition", v)}
                />
            )}

            {/* 2. BIRTH CATEGORY */}
            {(shouldShow("birth", "Дата рождения") || shouldShow("birth", "Дата смерти")) && (
                <DateRangeField
                    fromLabel="Дата рождения"
                    toLabel="Дата смерти"
                    from={params.lifetimeFrom}
                    to={params.lifetimeTo}
                    onChangeFrom={(v) => updateNodeParam(node.id, "lifetimeFrom", v)}
                    onChangeTo={(v) => updateNodeParam(node.id, "lifetimeTo", v)}
                />
            )}

            {shouldShow("birth", "Место рождения") && (
                <CoordinateField
                    label="Место рождения"
                    value={params.birthPlace}
                    onChange={(v) => updateNodeParam(node.id, "birthPlace", v)}
                />
            )}

            {shouldShow("birth", "Место смерти") && (
                <CoordinateField
                    label="Место смерти"
                    value={params.deathPlace}
                    onChange={(v) => updateNodeParam(node.id, "deathPlace", v)}
                />
            )}

            {/* 3. ARC CATEGORY */}
            {shouldShow("arc", "Кто она?") && (
                <TextAreaField
                    label="Кто она?"
                    value={params.arcWho}
                    onChange={(v) => updateNodeParam(node.id, "arcWho", v)}
                />
            )}

            {shouldShow("arc", "Чего она хочет внутри?") && (
                <TextAreaField
                    label="Чего она хочет внутри?"
                    value={params.arcWants}
                    onChange={(v) => updateNodeParam(node.id, "arcWants", v)}
                />
            )}

            {shouldShow("arc", "Как она этого достигнет?") && (
                <TextAreaField
                    label="Как она этого достигнет?"
                    value={params.arcHow}
                    onChange={(v) => updateNodeParam(node.id, "arcHow", v)}
                />
            )}

            {shouldShow("arc", "Что на кону?") && (
                <TextAreaField
                    label="Что на кону?"
                    value={params.arcStake}
                    onChange={(v) => updateNodeParam(node.id, "arcStake", v)}
                />
            )}

            {/* 4. STYLING CATEGORY */}
            {shouldShow("styling", "Возраст") && (
                <NumberField
                    label="Возраст"
                    min={10}
                    max={90}
                    step={1}
                    value={params.age}
                    onChange={(v) => updateNodeParam(node.id, "age", v)}
                />
            )}

            {shouldShow("styling", "Эмоция") && (
                <SelectField
                    label="Эмоция"
                    value={params.emotion}
                    onChange={(v) => updateNodeParam(node.id, "emotion", v)}
                    options={["спокойствие", "грусть", "радость", "тревога", "задумчивость"]}
                />
            )}

            {shouldShow("styling", "Стилист") && (
                <SelectField
                    label="Стилист"
                    value={params.stylist}
                    onChange={(v) => updateNodeParam(node.id, "stylist", v)}
                    options={["Без стилиста", "Tigran Avetisyan", "Anna K", "Народный"]}
                />
            )}

            {shouldShow("styling", "В кадре") && (
                <InFrameToggle
                    value={params.inFrame}
                    onChange={(v) => updateNodeParam(node.id, "inFrame", v)}
                />
            )}

            {shouldShow("styling", "Прическа") && (
                <DropdownWithPreviews
                    label="Прическа"
                    value={params.haircut}
                    onChange={(v) => updateNodeParam(node.id, "haircut", v)}
                    options={haircutOptions}
                />
            )}

            {shouldShow("styling", "Татуировки") && (
                <DropdownWithPreviews
                    label="Татуировки"
                    value={params.tattoos}
                    onChange={(v) => updateNodeParam(node.id, "tattoos", v)}
                    options={tattooOptions}
                />
            )}

            {shouldShow("styling", "Аксессуары") && (
                <DropdownWithPreviews
                    label="Аксессуары"
                    value={params.accessories}
                    onChange={(v) => updateNodeParam(node.id, "accessories", v)}
                    options={accessoryOptions}
                />
            )}

            {shouldShow("styling", "Одежда") && (
                <DropdownWithPreviews
                    label="Одежда"
                    value={params.clothing}
                    onChange={(v) => updateNodeParam(node.id, "clothing", v)}
                    options={clothingOptions}
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
    setNodePhotos: (id: string, photos: string[], photoIdx: number) => void;
}) {
    const { db, onSelect, onAdd, onUpdate, hasUnsavedChanges } = usePresetDatabase(
        node,
        params,
        updateNodeParams,
    );

    // Toggle Category Tags and Search State
    const [activeTags, setActiveTags] = useState<Record<string, boolean>>({
        general: true,
        atmosphere: false,
    });
    const [searchQuery, setSearchQuery] = useState("");

    const isAllActive = activeTags.general && activeTags.atmosphere;

    const toggleTag = (tag: string) => {
        setActiveTags((prev) => ({
            ...prev,
            [tag]: !prev[tag],
        }));
    };

    const toggleAll = () => {
        const nextVal = !isAllActive;
        setActiveTags({ general: nextVal, atmosphere: nextVal });
    };

    const shouldShow = (category: string, label: string) => {
        if (!activeTags[category as keyof typeof activeTags]) return false;
        if (!searchQuery) return true;
        return label.toLowerCase().includes(searchQuery.toLowerCase());
    };

    return (
        <>
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
                <DatabaseSelect
                    label="Локация"
                    items={db}
                    selected={params.selectedItem}
                    onSelect={onSelect}
                    onAdd={onAdd}
                    onUpdate={onUpdate}
                    hasUnsavedChanges={hasUnsavedChanges}
                    addLabel="Добавить локацию"
                />
            )}

            {shouldShow("general", "Имя") && (
                <TextField
                    label="Имя"
                    value={params.name}
                    onChange={(v) => updateNodeParam(node.id, "name", v)}
                />
            )}

            {shouldShow("general", "Фото Локации") && (
                <PhotoGallerySection
                    node={node}
                    label="Фото локации"
                    photos={params.photos || []}
                    photoIdx={params.photoIdx ?? 0}
                    pinterestUrl={params.pinterestUrl}
                    updateNodeParam={updateNodeParam}
                    setNodePhotos={setNodePhotos}
                    resetKey={params.selectedItem}
                />
            )}

            {shouldShow("general", "Координаты") && (
                <CoordinateField
                    label="Координаты"
                    value={params.coordinates}
                    onChange={(v) => updateNodeParam(node.id, "coordinates", v)}
                />
            )}

            {shouldShow("general", "Радиус зоны") && (
                <NumberField
                    label={`Радиус зоны (${params.radiusKm ?? 0} км)`}
                    min={0.1}
                    max={500}
                    step={0.5}
                    value={params.radiusKm}
                    onChange={(v) => updateNodeParam(node.id, "radiusKm", v)}
                />
            )}

            {/* 2. ATMOSPHERE CATEGORY */}
            {shouldShow("atmosphere", "Погода") && (
                <SelectField
                    label="Погода"
                    value={params.weather}
                    onChange={(v) => updateNodeParam(node.id, "weather", v)}
                    options={["туман", "солнце", "дождь", "снег", "пасмурно"]}
                />
            )}

            {shouldShow("atmosphere", "Время суток") && (
                <SelectField
                    label="Время суток"
                    value={params.timeOfDay}
                    onChange={(v) => updateNodeParam(node.id, "timeOfDay", v)}
                    options={["рассвет", "утро", "день", "закат", "ночь"]}
                />
            )}

            {shouldShow("atmosphere", "Интерьер / Экстерьер") && (
                <div className={styles.fld}>
                    <span>Интерьер / Экстерьер</span>
                    <div className={styles.segBtn}>
                        {["Интерьер", "Экстерьер"].map((v) => (
                            <button
                                key={v}
                                className={cn(params.interiorExterior === v && styles.isOn)}
                                onClick={() =>
                                    updateNodeParam(
                                        node.id,
                                        "interiorExterior",
                                        v as "Интерьер" | "Экстерьер",
                                    )
                                }>
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {shouldShow("atmosphere", "Уровень повреждения дома") && (
                <RangeField
                    label={`Уровень повреждения дома (${params.damageLevel ?? 0}%)`}
                    min={0}
                    max={100}
                    step={5}
                    value={params.damageLevel ?? 0}
                    onChange={(v) => updateNodeParam(node.id, "damageLevel", v)}
                />
            )}
        </>
    );
}

export function BuildingParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
}: EP<BuildingNodeParams>) {
    const { db, onSelect, onAdd, onUpdate, hasUnsavedChanges } = usePresetDatabase(
        node,
        params,
        updateNodeParams,
    );
    return (
        <>
            <DatabaseSelect
                label="Здание"
                items={db}
                selected={params.selectedItem}
                onSelect={onSelect}
                onAdd={onAdd}
                onUpdate={onUpdate}
                hasUnsavedChanges={hasUnsavedChanges}
                addLabel="Добавить здание"
            />
            <TextField
                label="Имя"
                value={params.name}
                onChange={(v) => updateNodeParam(node.id, "name", v)}
            />
            <NumberField
                label="Этаж"
                min={1}
                max={10}
                step={1}
                value={params.floor}
                onChange={(v) => updateNodeParam(node.id, "floor", v)}
            />
            <InFrameToggle
                value={params.inFrame}
                onChange={(v) => updateNodeParam(node.id, "inFrame", v)}
            />
        </>
    );
}

export function ClothingParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
}: EP<ClothingNodeParams>) {
    const { db, onSelect, onAdd, onUpdate, hasUnsavedChanges } = usePresetDatabase(
        node,
        params,
        updateNodeParams,
    );
    return (
        <>
            <DatabaseSelect
                label="Дизайнер"
                items={db}
                selected={params.selectedItem}
                onSelect={onSelect}
                onAdd={onAdd}
                onUpdate={onUpdate}
                hasUnsavedChanges={hasUnsavedChanges}
                addLabel="Добавить дизайнера"
            />
            <TextField
                label="Имя"
                value={params.name}
                onChange={(v) => updateNodeParam(node.id, "name", v)}
            />
            <SelectField
                label="Сезон"
                value={params.season}
                onChange={(v) => updateNodeParam(node.id, "season", v)}
                options={["FW26", "SS26", "FW25", "SS25"]}
            />
            <RangeField
                label={`Износ (${params.wear}%)`}
                min={0}
                max={100}
                step={1}
                value={params.wear}
                onChange={(v) => updateNodeParam(node.id, "wear", v)}
            />
        </>
    );
}

export function ArtworkParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
}: EP<ArtworkNodeParams>) {
    const { db, onSelect, onAdd, onUpdate, hasUnsavedChanges } = usePresetDatabase(
        node,
        params,
        updateNodeParams,
    );
    return (
        <>
            <DatabaseSelect
                label="Произведение"
                items={db}
                selected={params.selectedItem}
                onSelect={onSelect}
                onAdd={onAdd}
                onUpdate={onUpdate}
                hasUnsavedChanges={hasUnsavedChanges}
                addLabel="Добавить произведение"
            />
            <TextField
                label="Имя"
                value={params.name}
                onChange={(v) => updateNodeParam(node.id, "name", v)}
            />
            <RangeField
                label={`Масштаб (${params.scale}%)`}
                min={20}
                max={300}
                step={10}
                value={params.scale}
                onChange={(v) => updateNodeParam(node.id, "scale", v)}
            />
            <InFrameToggle
                value={params.inFrame}
                onChange={(v) => updateNodeParam(node.id, "inFrame", v)}
            />
        </>
    );
}

export function FurnitureParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
}: EP<FurnitureNodeParams>) {
    const { db, onSelect, onAdd, onUpdate, hasUnsavedChanges } = usePresetDatabase(
        node,
        params,
        updateNodeParams,
    );
    return (
        <>
            <DatabaseSelect
                label="Мебель"
                items={db}
                selected={params.selectedItem}
                onSelect={onSelect}
                onAdd={onAdd}
                onUpdate={onUpdate}
                hasUnsavedChanges={hasUnsavedChanges}
                addLabel="Добавить мебель"
            />
            <TextField
                label="Имя"
                value={params.name}
                onChange={(v) => updateNodeParam(node.id, "name", v)}
            />
            <RangeField
                label={`Плотность (${params.density})`}
                min={1}
                max={10}
                step={1}
                value={params.density}
                onChange={(v) => updateNodeParam(node.id, "density", v)}
            />
            <InFrameToggle
                value={params.inFrame}
                onChange={(v) => updateNodeParam(node.id, "inFrame", v)}
            />
        </>
    );
}

export function MusicParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
}: EP<MusicNodeParams>) {
    const { db, onSelect, onAdd, onUpdate, hasUnsavedChanges } = usePresetDatabase(
        node,
        params,
        updateNodeParams,
    );
    return (
        <>
            <DatabaseSelect
                label="Трек"
                items={db}
                selected={params.selectedItem}
                onSelect={onSelect}
                onAdd={onAdd}
                onUpdate={onUpdate}
                hasUnsavedChanges={hasUnsavedChanges}
                addLabel="Добавить трек"
            />
            <TextField
                label="Имя"
                value={params.name}
                onChange={(v) => updateNodeParam(node.id, "name", v)}
            />
            <SelectField
                label="Настроение"
                value={params.mood}
                onChange={(v) => updateNodeParam(node.id, "mood", v)}
                options={["элегия", "торжество", "тоска", "медитация", "танец"]}
            />
        </>
    );
}

export function ScriptParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
}: EP<ScriptNodeParams>) {
    const { db, onSelect, onAdd, onUpdate, hasUnsavedChanges } = usePresetDatabase(
        node,
        params,
        updateNodeParams,
    );
    return (
        <>
            <DatabaseSelect
                label="Сцена"
                items={db}
                selected={params.selectedItem}
                onSelect={onSelect}
                onAdd={onAdd}
                onUpdate={onUpdate}
                hasUnsavedChanges={hasUnsavedChanges}
                addLabel="Добавить сцену"
            />
            <TextField
                label="Имя"
                value={params.name}
                onChange={(v) => updateNodeParam(node.id, "name", v)}
            />
            <SelectField
                label="Тон"
                value={params.tone}
                onChange={(v) => updateNodeParam(node.id, "tone", v)}
                options={["драма", "комедия", "лирика", "хоррор", "документ"]}
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
    const { db, onSelect, onAdd, onUpdate, hasUnsavedChanges } = usePresetDatabase(
        node,
        params,
        updateNodeParams,
    );
    return (
        <>
            <DatabaseSelect
                label="Версия"
                items={db}
                selected={params.selectedItem}
                onSelect={onSelect}
                onAdd={onAdd}
                onUpdate={onUpdate}
                hasUnsavedChanges={hasUnsavedChanges}
                addLabel="Добавить версию"
            />
            <TextField
                label="Имя"
                value={params.name}
                onChange={(v) => updateNodeParam(node.id, "name", v)}
            />
            <NumberField
                label="Кадров"
                min={1}
                max={12}
                step={1}
                value={params.shots}
                onChange={(v) => updateNodeParam(node.id, "shots", v)}
            />
        </>
    );
}

export function TransportParams({
    node,
    params,
    updateNodeParam,
    updateNodeParams,
}: EP<TransportNodeParams>) {
    const { db, onSelect, onAdd, onUpdate, hasUnsavedChanges } = usePresetDatabase(
        node,
        params,
        updateNodeParams,
    );
    return (
        <>
            <DatabaseSelect
                label="Транспорт"
                items={db}
                selected={params.selectedItem}
                onSelect={onSelect}
                onAdd={onAdd}
                onUpdate={onUpdate}
                hasUnsavedChanges={hasUnsavedChanges}
                addLabel="Добавить транспорт"
            />
            <TextField
                label="Имя"
                value={params.name}
                onChange={(v) => updateNodeParam(node.id, "name", v)}
            />
            <InFrameToggle
                value={params.inFrame}
                onChange={(v) => updateNodeParam(node.id, "inFrame", v)}
            />
        </>
    );
}
