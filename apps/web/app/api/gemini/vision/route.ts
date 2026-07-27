import { NextResponse } from "next/server";
import { GeminiService } from "../../../../src/core/services/gemini.ts";

export async function POST(req: Request) {
    const { imageBase64, query, model } = (await req.json()) as {
        imageBase64: string;
        query: string;
        model?: string;
    };
    const key = process.env.GEMINI_KEY;
    if (!key) return NextResponse.json({ error: "Gemini not configured" }, { status: 501 });
    try {
        const text = await GeminiService.runVision(imageBase64, query, key, model);
        return NextResponse.json({ text });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 502 },
        );
    }
}
