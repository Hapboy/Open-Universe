import { NextResponse } from "next/server";
import { HiggsfieldService } from "../../../../src/core/services/higgsfield.ts";

// Higgsfield's own job-status poll runs in here, up to 5 minutes — matters for
// serverless deploys with shorter default function timeouts; a no-op locally.
export const maxDuration = 300;

export async function POST(req: Request) {
    const { prompt } = (await req.json()) as { prompt: string };
    const key = process.env.HIGGSFIELD_KEY;
    if (!key) return NextResponse.json({ error: "Higgsfield not configured" }, { status: 501 });
    try {
        const imageUrl = await HiggsfieldService.runSoul(prompt, key);
        return NextResponse.json({ imageUrl });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 502 },
        );
    }
}
