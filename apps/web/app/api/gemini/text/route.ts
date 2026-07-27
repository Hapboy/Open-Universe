import { NextResponse } from "next/server";
import { GeminiService } from "../../../../src/core/services/gemini.ts";

export async function POST(req: Request) {
    const { prompt, model } = (await req.json()) as { prompt: string; model?: string };
    const key = process.env.GEMINI_KEY;
    if (!key) return NextResponse.json({ error: "Gemini not configured" }, { status: 501 });
    try {
        const text = await GeminiService.runText(prompt, key, model);
        return NextResponse.json({ text });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 502 },
        );
    }
}
