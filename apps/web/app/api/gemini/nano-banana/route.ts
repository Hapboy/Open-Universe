import { NextResponse } from "next/server";
import { GeminiService, type NanoBananaOptions } from "../../../../src/core/services/gemini.ts";

export async function POST(req: Request) {
    const { prompt, imageBase64List, options } = (await req.json()) as {
        prompt: string;
        imageBase64List: string[];
        options: NanoBananaOptions;
    };
    const key = process.env.GEMINI_KEY;
    if (!key) return NextResponse.json({ error: "Gemini not configured" }, { status: 501 });
    try {
        const dataUrl = await GeminiService.runNanoBanana(prompt, imageBase64List, options, key);
        return NextResponse.json({ dataUrl });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 502 },
        );
    }
}
