import { NextResponse } from "next/server";
import { PinterestService } from "../../../../src/core/services/pinterest.ts";

export async function GET() {
    const token = process.env.PINTEREST_TOKEN;
    if (!token) return NextResponse.json({ error: "Pinterest not configured" }, { status: 501 });
    try {
        const boards = await PinterestService.fetchBoards(token);
        return NextResponse.json({ boards });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 502 },
        );
    }
}
