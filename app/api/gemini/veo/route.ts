import { NextResponse } from "next/server";
import { GeminiService, type VeoOptions } from "../../../../src/core/services/gemini.ts";

// Polls the Gemini operation in here, up to 5 minutes — matters for serverless
// deploys with shorter default function timeouts; a no-op locally.
export const maxDuration = 300;

export async function POST(req: Request) {
    const { prompt, imageBase64, options } = (await req.json()) as {
        prompt: string;
        imageBase64: string | null;
        options: VeoOptions;
    };
    const key = process.env.GEMINI_KEY;
    if (!key) return NextResponse.json({ error: "Gemini not configured" }, { status: 501 });
    try {
        const dataUrl = await GeminiService.runVeo(prompt, imageBase64, options, key);
        return NextResponse.json({ dataUrl });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 502 },
        );
    }
}
