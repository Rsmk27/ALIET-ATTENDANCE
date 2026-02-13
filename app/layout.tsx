import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/context/ThemeContext";
import NavigationDock from "@/components/ui/NavigationDock";
import LoadingBar from "@/components/ui/LoadingBar";
import GlobalPencilLoader from "@/components/ui/GlobalPencilLoader";
import { Suspense } from "react";

const inter = { className: "font-sans" }; // Fallback to CSS defined font stack

export const metadata: Metadata = {
    title: "ALIETAKE - College Management System",
    description: "Comprehensive college management system for attendance, academics, and fee management",
    applicationName: "ALIETAKE",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "ALIETAKE",
    },
    formatDetection: {
        telephone: false,
    },
    icons: {
        icon: '/logo.png',
        apple: '/logo.png',
    },
};

export const viewport: Viewport = {
    themeColor: "#1E88E5",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    const theme = localStorage.getItem('theme');
                                    const isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                                    if (isDark) {
                                        document.documentElement.classList.add('dark');
                                    } else {
                                        document.documentElement.classList.remove('dark');
                                    }
                                } catch (e) {}
                            })();
                        `,
                    }}
                />
            </head>
            <body className={inter.className}>
                <AuthProvider>
                    <ThemeProvider>
                        <ServiceWorkerRegister />
                        <Suspense fallback={null}>
                            <LoadingBar />
                        </Suspense>
                        <GlobalPencilLoader />
                        {children}

                        <NavigationDock />
                    </ThemeProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
