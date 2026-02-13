'use client';

import { Component as PencilLoader } from "@/components/ui/loader-1";

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-gray-950">
            <div className="relative">
                <PencilLoader scale={1.2} />
                <div className="mt-8 text-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">
                        ALIETAKE
                    </h2>
                    <div className="w-48 h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-4 mx-auto overflow-hidden">
                        <div className="h-full bg-primary-600 animate-shimmer w-full" />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 uppercase tracking-widest font-medium">
                        Loading
                    </p>
                </div>
            </div>

            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 animate-shimmer" />
        </div>
    );
}
