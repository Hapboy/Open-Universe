import type { EntityPresets, PinItem } from "../types.ts";

// Seed data for the global entity preset library (PresetLibraryContext),
// keyed by entity node type, then by each preset's stable `presetId` (a
// hardcoded fixture string here — real presets mint a crypto.randomUUID()).
// `name` is a separate, independently editable display field on the node
// (see EntityParams.tsx) — it mirrors the fixture's usual name by default,
// but is not the storage key, so two presets may legitimately share a name.
//
// `character`, `location`, and `mise_en_scene` have moved to the backend
// (PresetsModule — see apps/api/src/database/migrations/*SeedInitialPresets.ts
// and PresetLibraryContext.tsx's BACKEND_ENTITY_TYPES) and no longer live
// here. Delete an entity type's block from this file the same way once its
// own backend migration lands.
export const ENTITY_PRESET_SEEDS: Record<string, EntityPresets> = {
    building: {
        "bld-bay-window-house": {
            presetId: "bld-bay-window-house",
            name: "Дом с эркером",
            inFrame: true,
            floor: 2,
        },
        "bld-chaykhana": { presetId: "bld-chaykhana", name: "Чайхана", inFrame: true, floor: 2 },
        "bld-workshop": { presetId: "bld-workshop", name: "Мастерская", inFrame: true, floor: 2 },
        "bld-courtyard-well": {
            presetId: "bld-courtyard-well",
            name: "Двор-колодец",
            inFrame: true,
            floor: 2,
        },
    },
    clothing: {
        "cloth-tigran-avetisyan": {
            presetId: "cloth-tigran-avetisyan",
            name: "Tigran Avetisyan",
            season: "FW26",
            wear: 12,
        },
        "cloth-anna-k": { presetId: "cloth-anna-k", name: "Anna K", season: "FW26", wear: 12 },
        "cloth-loom-weaving": {
            presetId: "cloth-loom-weaving",
            name: "Loom Weaving",
            season: "FW26",
            wear: 12,
        },
        "cloth-taraz": {
            presetId: "cloth-taraz",
            name: "Taraz (нац.)",
            season: "FW26",
            wear: 12,
        },
    },
    artwork: {
        "art-minas-avetisyan": {
            presetId: "art-minas-avetisyan",
            name: "Минас Аветисян",
            inFrame: true,
            scale: 120,
        },
        "art-saryan": { presetId: "art-saryan", name: "Сарьян", inFrame: true, scale: 120 },
        "art-parajanov-collage": {
            presetId: "art-parajanov-collage",
            name: "Параджанов коллаж",
            inFrame: true,
            scale: 120,
        },
        "art-khachkar": { presetId: "art-khachkar", name: "Хачкар", inFrame: true, scale: 120 },
    },
    furniture: {
        "furn-sofa-carpet": {
            presetId: "furn-sofa-carpet",
            name: "Тахта + ковёр",
            inFrame: true,
            density: 5,
        },
        "furn-carved-buffet": {
            presetId: "furn-carved-buffet",
            name: "Резной буфет",
            inFrame: true,
            density: 5,
        },
        "furn-thonet": { presetId: "furn-thonet", name: "Тонет", inFrame: true, density: 5 },
        "furn-minimal": { presetId: "furn-minimal", name: "Минимал", inFrame: true, density: 5 },
    },
    music: {
        "music-duduk": { presetId: "music-duduk", name: "Армянский дудук", mood: "элегия" },
        "music-jazz-quartet": {
            presetId: "music-jazz-quartet",
            name: "Джаз-квартет",
            mood: "элегия",
        },
        "music-electronic-minimal": {
            presetId: "music-electronic-minimal",
            name: "Электронный минимал",
            mood: "элегия",
        },
        "music-silence": { presetId: "music-silence", name: "Тишина", mood: "элегия" },
    },
    script: {
        "scr-scene04-morning-kond": {
            presetId: "scr-scene04-morning-kond",
            name: "Сцена 04: Утро в Конде",
            tone: "драма",
        },
        "scr-prologue-sevan": {
            presetId: "scr-prologue-sevan",
            name: "Пролог · Севан",
            tone: "драма",
        },
        "scr-vernissage": { presetId: "scr-vernissage", name: "Вернисаж", tone: "драма" },
        "scr-finale": { presetId: "scr-finale", name: "Финал", tone: "драма" },
    },
    storyboard: {
        "sb-morning-kond-v4": {
            presetId: "sb-morning-kond-v4",
            name: "Утро в Конде v4",
            shots: 6,
        },
        "sb-vernissage-v2": { presetId: "sb-vernissage-v2", name: "Вернисаж v2", shots: 6 },
        "sb-finale-one-scene": {
            presetId: "sb-finale-one-scene",
            name: "Финал · одна сцена",
            shots: 6,
        },
    },
    transport: {
        "tr-soviet-moskvich": {
            presetId: "tr-soviet-moskvich",
            name: "Советский Москвич",
            inFrame: false,
        },
        "tr-horse-cart": { presetId: "tr-horse-cart", name: "Арба конная", inFrame: false },
        "tr-retro-bicycle": {
            presetId: "tr-retro-bicycle",
            name: "Велосипед ретро",
            inFrame: false,
        },
        "tr-marshrutka": { presetId: "tr-marshrutka", name: "Маршрутка", inFrame: false },
    },
};

export const HIGGSFIELD_PRESETS: string[] = [
    "Орбита (360°)",
    "Crash-Zoom",
    "Bullet-Time",
    "Панорамирование",
    "Наезд снизу",
];

export const DEFAULT_PINS: PinItem[] = [
    {
        id: "pin1",
        title: "Армянский орнамент",
        image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300",
    },
    {
        id: "pin2",
        title: "Старый Конд эскиз",
        image: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=300",
    },
    {
        id: "pin3",
        title: "Горный пейзаж Гарни",
        image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=300",
    },
    {
        id: "pin4",
        title: "Национальный Тараз",
        image: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=300",
    },
];
