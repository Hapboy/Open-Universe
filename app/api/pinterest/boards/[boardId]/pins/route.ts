import { NextResponse } from "next/server";
import { PinterestService } from "../../../../../../src/core/services/pinterest.ts";

export async function GET(_req: Request, { params }: { params: Promise<{ boardId: string }> }) {
    const { boardId } = await params;
    const token = process.env.PINTEREST_TOKEN;
    if (!token) return NextResponse.json({ error: "Pinterest not configured" }, { status: 501 });
    try {
        const pins = await PinterestService.fetchPins(token, boardId);
        return NextResponse.json({ pins });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 502 },
        );
    }
}
