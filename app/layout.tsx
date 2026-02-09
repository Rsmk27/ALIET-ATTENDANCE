import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import InstallPrompt from "@/components/ui/InstallPrompt";

const inter = Inter({ subsets: ["latin"] });

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
        <html lang="en">
            <body className={inter.className}>
                <AuthProvider>
                    {children}
                    <InstallPrompt />
                </AuthProvider>
            </body>
        </html>
    );
}
