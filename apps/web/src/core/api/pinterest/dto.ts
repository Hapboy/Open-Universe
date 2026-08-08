import type { BoardItem, PinItem } from "@/types.ts";

export interface FetchPinsRequest {
    boardId: string;
}

export type FetchBoardsResponse = BoardItem[];
export type FetchPinsResponse = PinItem[];
