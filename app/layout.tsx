import { StrictMode } from "react";
import type { Metadata, Viewport } from "next";
import "../src/styles/global.css";

export const metadata: Metadata = {
    title: "Open Universe — нодовая студия",
    manifest: "/manifest.webmanifest",
    icons: {
        icon: "/icon.svg",
        apple: "/icon.svg",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#1b1a16",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru">
            <head>
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.24.0/dist/tabler-icons.min.css"
                />
            </head>
            <body>
                <StrictMode>{children}</StrictMode>
            </body>
        </html>
    );
}
