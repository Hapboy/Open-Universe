// Adapter over apps/api's PinterestModule, via @hayverse/api-client's
// `pinterest` namespace - mirrors core/api/gemini/client.ts's pattern: no
// build-time isProviderConfigured() gate anymore, every method just attempts
// the real call and catches ApiError to tell "not configured" (501) and
// "not connected" (403) apart from any other failure. Mock/fallback data
// below is ported verbatim from the pre-backend client-side PinterestService
// fixtures - still shown whenever the real data isn't available, not just
// when Pinterest was never wired up at all.
import { ApiError } from "@hayverse/api-client";
import { DEFAULT_PINS } from "../../../data/presets.ts";
import type { BoardItem, PinItem } from "../../../types.ts";
import { hayverseApiClient } from "../hayverse/client.ts";
import type { FetchPinsRequest, FetchBoardsResponse, FetchPinsResponse } from "./dto.ts";

type ShowToast = (msg: string) => void;

export const MOCK_BOARDS: BoardItem[] = [
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
    // `connected` comes from UserContext's pinterestStatus - skips the real
    // request (and its toasts) entirely when the caller already knows the
    // user isn't connected, instead of firing a request that's guaranteed to
    // fail (logged out -> 401, logged in but not connected -> 403).
    fetchBoards(showToast: ShowToast, connected: boolean): Promise<FetchBoardsResponse>;
    fetchPins(req: FetchPinsRequest): Promise<FetchPinsResponse>;
}

export const pinterestApiClient: PinterestApiClient = {
    async fetchBoards(showToast, connected) {
        if (!connected) return MOCK_BOARDS;
        try {
            showToast("Загрузка досок Pinterest...");
            const { boards } = await hayverseApiClient.pinterest.listBoards();
            return boards;
        } catch (e) {
            if (e instanceof ApiError && e.status === 403) {
                showToast("Pinterest не подключён — подключите его в профиле.");
            } else if (!(e instanceof ApiError && e.status === 501)) {
                showToast("Pinterest API: ошибка. Включен симулятор.");
            }
            return MOCK_BOARDS;
        }
    },

    async fetchPins(req) {
        const { boardId } = req;
        if (!boardId || boardId.startsWith("mock_") || boardId.startsWith("board_")) {
            return MOCK_PINS_BY_BOARD[boardId] ?? DEFAULT_PINS;
        }
        try {
            const { pins } = await hayverseApiClient.pinterest.listPins(boardId);
            return pins;
        } catch {
            return DEFAULT_PINS;
        }
    },
};
