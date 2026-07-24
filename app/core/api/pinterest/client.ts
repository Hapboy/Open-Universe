// Adapter over core/services/pinterest.ts (untouched fetch/mock logic). This
// is the seam a generated Swagger client swaps into later — call sites
// depend on this interface, not on PinterestService directly.
import { PinterestService } from "../../services/index.ts";
import type { FetchPinsRequest, FetchBoardsResponse, FetchPinsResponse } from "./dto.ts";

type ShowToast = (msg: string) => void;

export interface PinterestApiClient {
    fetchBoards(showToast: ShowToast): Promise<FetchBoardsResponse>;
    fetchPins(req: FetchPinsRequest): Promise<FetchPinsResponse>;
}

export const pinterestApiClient: PinterestApiClient = {
    fetchBoards: (showToast) => PinterestService.fetchBoards(showToast),
    fetchPins: (req) => PinterestService.fetchPins(req.boardId),
};
