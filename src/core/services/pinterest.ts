import type { BoardItem, PinItem } from "../../types.ts";

// Server-only from here on — reachable only from app/api/pinterest/*/route.ts,
// which hold the real token. Mock/fallback data and the "no token configured"
// branch live client-side in core/api/pinterest/client.ts now; this module just
// does the real call and throws on failure, letting the route/adapter decide
// how to degrade.

interface PinterestBoardsResponse {
    items?: BoardItem[];
}

interface PinterestPinsResponse {
    items?: Array<{
        id: string;
        title?: string;
        media?: { images?: Record<string, { url: string }> };
    }>;
}

export const PinterestService = {
    async fetchBoards(token: string): Promise<BoardItem[]> {
        const res = await fetch("https://api.pinterest.com/v5/boards", {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Pinterest boards HTTP ${res.status}`);
        const data = (await res.json()) as PinterestBoardsResponse;
        return data.items || [];
    },

    async fetchPins(token: string, boardId: string): Promise<PinItem[]> {
        const res = await fetch(`https://api.pinterest.com/v5/boards/${boardId}/pins`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Pinterest pins HTTP ${res.status}`);
        const data = (await res.json()) as PinterestPinsResponse;
        return (data.items || []).map((p) => ({
            id: p.id,
            title: p.title || "Pinterest Pin",
            image: p.media?.images?.["400x300"]?.url || p.media?.images?.originals?.url || "",
        }));
    },
};
