"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PinterestCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const status = searchParams.get("status") === "success" ? "success" : "error";

    useEffect(() => {
        if (window.opener) {
            window.opener.postMessage({ type: "pinterest-oauth", status }, window.location.origin);
            window.close();
            return;
        }
        router.replace("/");
    }, [router, status]);

    return (
        <p style={{ padding: 24, fontFamily: "sans-serif" }}>
            {status === "success"
                ? "Pinterest подключён, окно закрывается…"
                : "Не удалось подключить Pinterest."}
        </p>
    );
}

// Landing page for apps/api's GET /pinterest/oauth/callback redirect. Opened
// inside the popup the "Connect Pinterest" button spawns (see Modals.tsx's
// IntegrationsTab) - if this window has an opener, it reports the result
// back via postMessage and closes itself; otherwise (popup blocked, or
// someone navigates here directly) it falls back to redirecting the current
// tab home. Suspense boundary is required by Next.js for useSearchParams()
// during static prerendering, not otherwise meaningful here.
export default function PinterestCallbackPage() {
    return (
        <Suspense>
            <PinterestCallbackContent />
        </Suspense>
    );
}
