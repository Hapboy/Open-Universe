import { NextResponse } from "next/server";
import { GeminiService } from "../../../../src/core/services/gemini.ts";

export async function GET() {
    const key = process.env.GEMINI_KEY;
    if (!key) return NextResponse.json({ error: "Gemini not configured" }, { status: 501 });
    try {
        const models = await GeminiService.listModels(key);
        return NextResponse.json({ models });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 502 },
        );
    }
}
