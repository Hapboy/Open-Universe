import { StrictMode } from "react";
import type { Metadata, Viewport } from "next";
import "@tabler/icons-webfont/dist/tabler-icons.min.css";
import "../src/styles/global.css";

export const metadata: Metadata = {
    title: "Open Universe — нодовая студия",
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
            <body>
                <StrictMode>{children}</StrictMode>
            </body>
        </html>
    );
}
