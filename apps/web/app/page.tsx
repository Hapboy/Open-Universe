import { App } from "@/App.tsx";
import { hayverseApiClient } from "@/core/api/hayverse/client.ts";

export default async function Page() {
    const initialScenes = await hayverseApiClient.scenes.list().catch(() => null);
    return <App initialScenes={initialScenes} />;
}
