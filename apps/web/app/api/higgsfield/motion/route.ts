import { NextResponse } from "next/server";
import { HiggsfieldService } from "../../../../src/core/services/higgsfield.ts";

// Higgsfield's own job-status poll runs in here, up to 5 minutes — matters for
// serverless deploys with shorter default function timeouts; a no-op locally.
export const maxDuration = 300;

export async function POST(req: Request) {
    // frameUrl is forwarded to Higgsfield as-is (their servers fetch it, not
    // this route) — it must already be a publicly-fetchable URL, same
    // pre-existing constraint as before this call moved server-side.
    const { frameUrl, preset } = (await req.json()) as { frameUrl: string; preset: string };
    const key = process.env.HIGGSFIELD_KEY;
    if (!key) return NextResponse.json({ error: "Higgsfield not configured" }, { status: 501 });
    try {
        const videoUrl = await HiggsfieldService.runMotion(frameUrl, preset, key);
        return NextResponse.json({ videoUrl });
    } catch (e) {
        return NextResponse.json(
            { error: e instanceof Error ? e.message : String(e) },
            { status: 502 },
        );
    }
}
