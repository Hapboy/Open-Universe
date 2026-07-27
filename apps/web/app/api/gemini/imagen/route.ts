import { NextResponse } from "next/server";
import { GeminiService, type ImagenOptions } from "../../../../src/core/services/gemini.ts";

export async function POST(req: Request) {
    const { prompt, options } = (await req.json()) as { prompt: string; options: ImagenOptions };
    const key = process.env.GEMINI_KEY;
    if (!key) return NextResponse.json({ error: "Gemini not configured" }, { status: 501 });
    try {
        const result = await GeminiService.runImagen(prompt, options, key);
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 502 },
        );
    }
}
