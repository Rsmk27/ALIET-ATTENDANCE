'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        console.log('InstallPrompt: Component mounted');

        // Check if running in standalone mode (already installed)
        const standalone = window.matchMedia('(display-mode: standalone)').matches;
        setIsStandalone(standalone);
        console.log('InstallPrompt: Standalone mode:', standalone);

        // Detect mobile
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setIsMobile(mobile);
        console.log('InstallPrompt: Is mobile:', mobile);

        // Detect iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(ios);
        console.log('InstallPrompt: Is iOS:', ios);

        // For iOS, show prompt if not installed
        if (ios && !standalone) {
            const dismissed = localStorage.getItem('ios-install-dismissed');
            console.log('InstallPrompt: iOS dismissed status:', dismissed);
            if (!dismissed) {
                console.log('InstallPrompt: Showing iOS prompt');
                setShowPrompt(true);
            }
        }

        // For Android/Chrome - wait for beforeinstallprompt
        const handler = (e: any) => {
            console.log('InstallPrompt: beforeinstallprompt event fired', e);
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        console.log('InstallPrompt: Install clicked, deferredPrompt:', deferredPrompt);
        if (!deferredPrompt) {
            console.log('InstallPrompt: No deferred prompt available');
            return;
        }

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log('InstallPrompt: User choice outcome:', outcome);

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        console.log('InstallPrompt: Dismissed');
        if (isIOS) {
            localStorage.setItem('ios-install-dismissed', 'true');
        } else {
            localStorage.setItem('install-dismissed', 'true');
        }
        setShowPrompt(false);
    };

    console.log('InstallPrompt: Render - showPrompt:', showPrompt, 'isStandalone:', isStandalone);

    if (!showPrompt || isStandalone) {
        console.log('InstallPrompt: Not showing (showPrompt:', showPrompt, 'isStandalone:', isStandalone, ')');
        return null;
    }

    console.log('InstallPrompt: Rendering banner');

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary-600 to-primary-700 text-white p-3 shadow-lg animate-in slide-in-from-top duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                    <Download className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                            {isIOS ? 'Install ALIET Attendance' : 'Install App'}
                        </p>
                        <p className="text-xs opacity-90 truncate">
                            {isIOS
                                ? 'Tap Share → Add to Home Screen'
                                : 'Install for quick access and offline use'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isIOS && deferredPrompt && (
                        <button
                            onClick={handleInstallClick}
                            className="bg-white text-primary-600 text-xs font-semibold py-1.5 px-3 rounded-md hover:bg-gray-100 transition-colors whitespace-nowrap"
                        >
                            Install
                        </button>
                    )}
                    <button
                        onClick={handleDismiss}
                        className="text-white hover:bg-white/20 p-1 rounded transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
