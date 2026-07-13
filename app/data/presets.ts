import type { EntityPresets, PinItem } from "../types.ts";

// Seed data for the global entity preset library (PresetLibraryContext),
// keyed by entity node type. Extracted from the entity node templates in
// data/nodes.ts, which now only keep each type's default selectedItem/fields.
// Each preset's `name` mirrors its dropdown key by default — it's a separate
// editable field on the node (see EntityParams.tsx), not the same value as
// `selectedItem`, so it can drift from the preset name if the user renames it.
export const ENTITY_PRESET_SEEDS: Record<string, EntityPresets> = {
    character: {
        "Ара Гехецик": {
            name: "Ара Гехецик",
            inFrame: true,
            age: 34,
            emotion: "спокойствие",
            stylist: "Без стилиста",
            photos: [] as string[],
            photoIdx: 0,
        },
        "Анаит Багратуни": {
            name: "Анаит Багратуни",
            inFrame: true,
            age: 34,
            emotion: "спокойствие",
            stylist: "Без стилиста",
            photos: [] as string[],
            photoIdx: 0,
        },
        "Вардан Майриг": {
            name: "Вардан Майриг",
            inFrame: true,
            age: 34,
            emotion: "спокойствие",
            stylist: "Без стилиста",
            photos: [] as string[],
            photoIdx: 0,
        },
        Цовинар: {
            name: "Цовинар",
            inFrame: true,
            age: 34,
            emotion: "спокойствие",
            stylist: "Без стилиста",
            photos: [] as string[],
            photoIdx: 0,
        },
    },
    location: {
        "Старый Конд": {
            name: "Старый Конд",
            weather: "туман",
            timeOfDay: "рассвет",
            interiorExterior: "Экстерьер",
            damageLevel: 0,
        },
        Каскад: {
            name: "Каскад",
            weather: "туман",
            timeOfDay: "рассвет",
            interiorExterior: "Экстерьер",
            damageLevel: 0,
        },
        Гарни: {
            name: "Гарни",
            weather: "туман",
            timeOfDay: "рассвет",
            interiorExterior: "Экстерьер",
            damageLevel: 0,
        },
        Севан: {
            name: "Севан",
            weather: "туман",
            timeOfDay: "рассвет",
            interiorExterior: "Экстерьер",
            damageLevel: 0,
        },
    },
    building: {
        "Дом с эркером": { name: "Дом с эркером", inFrame: true, floor: 2 },
        Чайхана: { name: "Чайхана", inFrame: true, floor: 2 },
        Мастерская: { name: "Мастерская", inFrame: true, floor: 2 },
        "Двор-колодец": { name: "Двор-колодец", inFrame: true, floor: 2 },
    },
    clothing: {
        "Tigran Avetisyan": { name: "Tigran Avetisyan", season: "FW26", wear: 12 },
        "Anna K": { name: "Anna K", season: "FW26", wear: 12 },
        "Loom Weaving": { name: "Loom Weaving", season: "FW26", wear: 12 },
        "Taraz (нац.)": { name: "Taraz (нац.)", season: "FW26", wear: 12 },
    },
    artwork: {
        "Минас Аветисян": { name: "Минас Аветисян", inFrame: true, scale: 120 },
        Сарьян: { name: "Сарьян", inFrame: true, scale: 120 },
        "Параджанов коллаж": { name: "Параджанов коллаж", inFrame: true, scale: 120 },
        Хачкар: { name: "Хачкар", inFrame: true, scale: 120 },
    },
    furniture: {
        "Тахта + ковёр": { name: "Тахта + ковёр", inFrame: true, density: 5 },
        "Резной буфет": { name: "Резной буфет", inFrame: true, density: 5 },
        Тонет: { name: "Тонет", inFrame: true, density: 5 },
        Минимал: { name: "Минимал", inFrame: true, density: 5 },
    },
    music: {
        "Армянский дудук": { name: "Армянский дудук", mood: "элегия" },
        "Джаз-квартет": { name: "Джаз-квартет", mood: "элегия" },
        "Электронный минимал": { name: "Электронный минимал", mood: "элегия" },
        Тишина: { name: "Тишина", mood: "элегия" },
    },
    script: {
        "Сцена 04: Утро в Конде": { name: "Сцена 04: Утро в Конде", tone: "драма" },
        "Пролог · Севан": { name: "Пролог · Севан", tone: "драма" },
        Вернисаж: { name: "Вернисаж", tone: "драма" },
        Финал: { name: "Финал", tone: "драма" },
    },
    storyboard: {
        "Утро в Конде v4": { name: "Утро в Конде v4", shots: 6 },
        "Вернисаж v2": { name: "Вернисаж v2", shots: 6 },
        "Финал · одна сцена": { name: "Финал · одна сцена", shots: 6 },
    },
    transport: {
        "Советский Москвич": { name: "Советский Москвич", inFrame: false },
        "Арба конная": { name: "Арба конная", inFrame: false },
        "Велосипед ретро": { name: "Велосипед ретро", inFrame: false },
        Маршрутка: { name: "Маршрутка", inFrame: false },
    },
    mise_en_scene: {
        "1 человек в кадре": {
            name: "1 человек в кадре",
            photos: [] as string[],
            photoIdx: 0,
            peopleCount: 1,
            cameraCount: 1,
        },
        "2 человека в кадре": {
            name: "2 человека в кадре",
            photos: ["/assets/mise-en-scene/2p_1cam_ots-render.jpg"] as string[],
            photoIdx: 0,
            peopleCount: 2,
            cameraCount: 1,
        },
        "3 человека в кадре": {
            name: "3 человека в кадре",
            photos: ["/assets/mise-en-scene/3p_3cam_overhead-triangle.jpg"] as string[],
            photoIdx: 0,
            peopleCount: 3,
            cameraCount: 3,
        },
        "3+ человек в кадре": {
            name: "3+ человек в кадре",
            photos: ["/assets/mise-en-scene/6p_1cam_render-medium.jpg"] as string[],
            photoIdx: 0,
            peopleCount: 6,
            cameraCount: 1,
        },
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
