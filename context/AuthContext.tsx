'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    User as FirebaseUser,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { User, UserRole } from '@/types';

interface AuthContextType {
    currentUser: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
    signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
    signOut: () => Promise<void>;
    updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setFirebaseUser(user);

            if (user) {
                // Fetch user profile from Firestore
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setCurrentUser(userDoc.data() as User);
                } else {
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }

            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signUp = async (
        email: string,
        password: string,
        userData: Partial<User>
    ) => {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);

        // Create user profile in Firestore
        const userProfile: User = {
            uid: user.uid,
            email: email,
            name: userData.name || '',
            role: userData.role || 'student',
            registrationNumber: userData.registrationNumber,
            employeeId: userData.employeeId,
            mobileNumber: userData.mobileNumber,
            department: userData.department,
            branch: userData.branch,
            section: userData.section,
            year: userData.year,
            createdAt: serverTimestamp() as any,
        };

        await setDoc(doc(db, 'users', user.uid), userProfile);
        setCurrentUser(userProfile);
    };

    const signInWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);

        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        const isNewUser = !userDoc.exists();

        if (!isNewUser) {
            setCurrentUser(userDoc.data() as User);
        }

        return { isNewUser };
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setFirebaseUser(null);
    };

    const updateUserProfile = async (data: Partial<User>) => {
        if (!firebaseUser) throw new Error('No user logged in');

        const updatedData = {
            ...data,
            updatedAt: serverTimestamp(),
        };

        // Update main user profile
        await setDoc(doc(db, 'users', firebaseUser.uid), updatedData, { merge: true });

        // Branch-specific storage for Faculty
        const role = data.role || currentUser?.role;

        if (role === 'faculty') {
            const branchName = data.department || currentUser?.department;

            if (branchName) {
                // Define paths based on screenshot: admin/faculty/branch/{BranchName}
                const branchRef = doc(db, 'admin', 'faculty', 'branch', branchName);
                const memberRef = doc(branchRef, 'faculty_members', firebaseUser.uid);

                // 1. Ensure Branch Document exists
                await setDoc(branchRef, {
                    name: branchName,
                    updatedAt: serverTimestamp()
                }, { merge: true });

                // 2. Store Faculty Data in Branch Collection
                await setDoc(memberRef, {
                    uid: firebaseUser.uid,
                    name: data.name || currentUser?.name || '',
                    email: firebaseUser.email,
                    employeeId: data.employeeId || currentUser?.employeeId || '',
                    mobileNumber: data.mobileNumber || currentUser?.mobileNumber || '',
                    department: branchName,
                    joinedAt: serverTimestamp(),
                }, { merge: true });
            }
        }

        // Update local state
        setCurrentUser((prev) => (prev ? { ...prev, ...data } : null));
    };

    const value: AuthContextType = {
        currentUser,
        firebaseUser,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        updateUserProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
