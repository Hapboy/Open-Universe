// Shared poller for apps/api's async AI jobs (GET /ai/jobs/:id) - currently
// only Gemini Veo enqueues through this, but the cadence mirrors
// core/services/higgsfield.ts's own provider-side poll loop (5s) so both
// stay consistent if Higgsfield ever moves behind this same job queue.
import { hayverseApiClient } from "@/core/api/hayverse/client.ts";

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 60;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollJob<T>(jobId: string, resultKey: string): Promise<T> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const job = await hayverseApiClient.jobs.get(jobId);
        if (job.status === "completed") {
            if (!job.result || !(resultKey in job.result)) {
                throw new Error(`job ${jobId} completed without ${resultKey}`);
            }
            return job.result[resultKey] as T;
        }
        if (job.status === "failed" || job.status === "nsfw") {
            throw new Error(job.error ?? `job ${jobId} ${job.status}`);
        }
        await delay(POLL_INTERVAL_MS);
    }
    throw new Error(`job ${jobId} timed out after ${MAX_ATTEMPTS} attempts`);
}
