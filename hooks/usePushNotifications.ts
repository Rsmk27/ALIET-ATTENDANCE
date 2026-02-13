import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';

export const usePushNotifications = () => {
    const { currentUser } = useAuth();
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!isSupported) {
            alert('Your browser does not support push notifications.');
            return;
        }

        try {
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult === 'granted') {
                await generateToken();
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    };

    const generateToken = async () => {
        if (!currentUser) return;

        try {
            // Lazy load messaging to avoid server-side issues
            const { getMessaging, getToken } = await import('firebase/messaging');
            const messaging = getMessaging();

            // Get VAPID Key from environment or hardcode
            // Ideally, pass { vapidKey: 'YOUR_PUBLIC_VAPID_KEY' }
            const currentToken = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY // Add this to env
            });

            if (currentToken) {
                setFcmToken(currentToken);
                await saveTokenToDatabase(currentToken);
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } catch (err) {
            console.error('An error occurred while retrieving token. ', err);
        }
    };

    const saveTokenToDatabase = async (token: string) => {
        if (!currentUser?.uid) return;

        const userRef = doc(db, 'users', currentUser.uid);

        // Use arrayUnion to add token to array without duplicates
        await setDoc(userRef, {
            fcmTokens: arrayUnion(token),
            lastTokenUpdate: new Date()
        }, { merge: true });

        // Also save to branch-specific collection for easier targeting by admins
        if (currentUser.role === 'student' && currentUser.branch) {
            const tokenRef = doc(db, 'admin', 'notifications', 'tokens', token);
            await setDoc(tokenRef, {
                token,
                uid: currentUser.uid,
                role: currentUser.role,
                branch: currentUser.branch,
                year: currentUser.year || 0,
                section: currentUser.section || '',
                updatedAt: new Date()
            }, { merge: true });
        }
    };

    // Foreground listener
    useEffect(() => {
        if (permission === 'granted') {
            import('firebase/messaging').then(({ getMessaging, onMessage }) => {
                const messaging = getMessaging();
                onMessage(messaging, (payload) => {
                    console.log('Message received. ', payload);
                    // You can show a custom toast here
                    const { title, body } = payload.notification || {};
                    if (title) {
                        new Notification(title, { body });
                    }
                });
            }).catch(err => console.error("Messaging listener error", err));
        }
    }, [permission]);

    return {
        permission,
        requestPermission,
        fcmToken,
        isSupported
    };
};
