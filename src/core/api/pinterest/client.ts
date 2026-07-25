// Adapter over app/api/pinterest/*/route.ts (the real token lives server-only
// there now — see core/services/pinterest.ts). This is the seam a generated
// Swagger client swaps into later — call sites depend on this interface, not on
// the route shape directly. Mock/fallback data below is ported verbatim from the
// pre-Phase-3 client-side PinterestService: same fixtures, same behavior, just
// gated on isProviderConfigured() instead of a client-visible token check, and
// still used as the fallback on a failed fetch, not just when unconfigured.
import { DEFAULT_PINS } from "../../../data/presets.ts";
import type { BoardItem, PinItem } from "../../../types.ts";
import { isProviderConfigured } from "../env.ts";
import type { FetchPinsRequest, FetchBoardsResponse, FetchPinsResponse } from "./dto.ts";

type ShowToast = (msg: string) => void;

const MOCK_BOARDS: BoardItem[] = [
    { id: "board_art", name: "Армянский Авангард" },
    { id: "board_kond", name: "Конд Архитектура" },
    { id: "board_taraz", name: "Тараз & Одежда" },
];

const MOCK_PINS_BY_BOARD: Record<string, PinItem[]> = {
    board_kond: [
        {
            id: "pk1",
            title: "Узкие улочки Конда",
            image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300",
        },
        {
            id: "pk2",
            title: "Старый дом с эркером",
            image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300",
        },
        {
            id: "pk3",
            title: "Красная крыша",
            image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300",
        },
    ],
    board_taraz: [
        {
            id: "pt1",
            title: "Вышивка Loom Weaving",
            image: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=300",
        },
        {
            id: "pt2",
            title: "Красный пояс тараз",
            image: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=300",
        },
    ],
};

export interface PinterestApiClient {
    fetchBoards(showToast: ShowToast): Promise<FetchBoardsResponse>;
    fetchPins(req: FetchPinsRequest): Promise<FetchPinsResponse>;
}

export const pinterestApiClient: PinterestApiClient = {
    async fetchBoards(showToast) {
        if (!isProviderConfigured("pinterest")) return MOCK_BOARDS;
        try {
            showToast("Загрузка досок Pinterest...");
            const res = await fetch("/api/pinterest/boards");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { boards } = (await res.json()) as { boards: BoardItem[] };
            return boards;
        } catch {
            showToast("Pinterest API: Ошибка CORS/Авторизации. Включен симулятор.");
            return MOCK_BOARDS;
        }
    },

    async fetchPins(req) {
        const { boardId } = req;
        if (!isProviderConfigured("pinterest") || !boardId || boardId.startsWith("mock_")) {
            return MOCK_PINS_BY_BOARD[boardId] ?? DEFAULT_PINS;
        }
        try {
            const res = await fetch(`/api/pinterest/boards/${boardId}/pins`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { pins } = (await res.json()) as { pins: PinItem[] };
            return pins;
        } catch {
            return DEFAULT_PINS;
        }
    },
};
