import type { HiggsfieldJobStatus } from "../../types/enums.ts";

// Server-only from here on — reachable only from app/api/higgsfield/*/route.ts,
// which hold the real key. Mock/fallback data and the "no key configured" branch
// live client-side in core/api/higgsfield/client.ts now; this module just does the
// real call and throws on failure, letting the route/adapter decide how to
// degrade. runSpeak isn't here — it's 100% mock today (never touched a key), so
// it stays purely client-side with no route at all.

const HF_BASE = "https://platform.higgsfield.ai";

interface HFJob {
    request_id: string;
}
interface HFStatus {
    status: HiggsfieldJobStatus;
    images?: { url: string }[];
    video?: { url: string };
}

async function hfDelay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function hfPoll(requestId: string, auth: string): Promise<HFStatus> {
    const url = `${HF_BASE}/requests/${requestId}/status`;
    for (let i = 0; i < 60; i++) {
        await hfDelay(5000);
        const res = await fetch(url, {
            headers: { Authorization: auth, Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as HFStatus;
        if (data.status === "completed") return data;
        if (data.status === "failed") throw new Error("job failed");
        if (data.status === "nsfw") throw new Error("nsfw");
    }
    throw new Error("timeout after 5 min");
}

export const HiggsfieldService = {
    async runSoul(prompt: string, key: string): Promise<string> {
        const auth = `Key ${key}`;
        const res = await fetch(`${HF_BASE}/higgsfield-ai/soul/standard`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: auth,
            },
            body: JSON.stringify({ prompt, aspect_ratio: "16:9", resolution: "720p" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const job = (await res.json()) as HFJob;
        const result = await hfPoll(job.request_id, auth);
        const imgUrl = result.images?.[0]?.url;
        if (!imgUrl) throw new Error("no image url");
        return imgUrl;
    },

    async runMotion(frameUrl: string, preset: string, key: string): Promise<string> {
        const auth = `Key ${key}`;
        const res = await fetch(`${HF_BASE}/higgsfield-ai/dop/standard`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: auth,
            },
            body: JSON.stringify({ image_url: frameUrl, prompt: preset, duration: 5 }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const job = (await res.json()) as HFJob;
        const result = await hfPoll(job.request_id, auth);
        const videoUrl = result.video?.url;
        if (!videoUrl) throw new Error("no video url");
        return videoUrl;
    },
};
