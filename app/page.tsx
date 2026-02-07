'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/login');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-600">
            <div className="text-white text-center">
                <h1 className="text-4xl font-bold mb-4">ALIETAKE</h1>
                <p className="text-xl">Loading...</p>
            </div>
        </div>
    );
}
