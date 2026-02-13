'use client';

import { Component as PencilLoader } from "@/components/ui/loader-1";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";

export default function GlobalPencilLoader() {
    const { loading } = useAuth();
    const [show, setShow] = useState(true);

    useEffect(() => {
        if (!loading) {
            const timer = setTimeout(() => setShow(false), 500);
            return () => clearTimeout(timer);
        } else {
            setShow(true);
        }
    }, [loading]);

    if (!show) return null;

    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-md transition-opacity duration-500 ${!loading ? 'opacity-0' : 'opacity-100'}`}>
            <div className="relative transform scale-75 sm:scale-100">
                <PencilLoader scale={1.2} />
                <div className="mt-8 text-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">
                        ALIETAKE
                    </h2>
                    <div className="w-48 h-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-4 mx-auto overflow-hidden">
                        <div className="h-full bg-primary-600 animate-shimmer w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
