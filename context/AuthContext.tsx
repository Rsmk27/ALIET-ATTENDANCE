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
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import studentData from '@/data/students.json';
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

export const ADMIN_EMAILS = ['zestacademyonline@gmail.com', 'ramunarlapati27@gmail.com'];

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
                    let userData = userDoc.data() as User;

                    // CRITICAL: Ensure uid is set from Firebase Auth user
                    // Firestore data doesn't include the document ID by default
                    userData.uid = user.uid;

                    // Ensure role exists (fallback for legacy or broken formatting)
                    if (!userData.role) userData.role = 'student';

                    // Sync email if Auth email changed (e.g. verified)
                    if (user.email && userData.email !== user.email) {
                        try {
                            // Update core user profile
                            await updateDoc(doc(db, 'users', user.uid), { email: user.email });

                            // Also sync to branch-specific collection for dashboards (Admin/HOD)
                            if (userData.role === 'student' && userData.branch) {
                                await updateDoc(doc(db, 'admin', 'students', userData.branch, user.uid), { email: user.email });
                            }
                        } catch (error) {
                            console.error("Error syncing email to dashboards:", error);
                        }

                        userData.email = user.email;
                    }

                    setCurrentUser(userData);
                } else {
                    // Handle "zombie" account: Auth exists, Firestore doc missing
                    // Try to auto-create if it looks like a student
                    if (user.email && user.email.toLowerCase().endsWith('@aliet.edu')) {
                        const regNo = user.email.split('@')[0].toUpperCase();
                        const studentName = (studentData as any)[regNo];

                        // Import studentData locally if needed, or we just trust the email format for now
                        // To be safe, let's keep it simple: create basic profile
                        const userProfile: User = {
                            uid: user.uid,
                            email: user.email,
                            name: studentName || regNo, // Fallback to RegNo if name not found
                            role: 'student',
                            registrationNumber: regNo,
                            employeeId: '',
                            mobileNumber: '',
                            department: '',
                            branch: '',
                            section: '',
                            year: 1, // Default
                            createdAt: serverTimestamp() as any,
                        };

                        await setDoc(doc(db, 'users', user.uid), userProfile);
                        setCurrentUser(userProfile);
                    } else {
                        setCurrentUser(null);
                    }
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
            registrationNumber: userData.registrationNumber || '',
            employeeId: userData.employeeId || '',
            mobileNumber: userData.mobileNumber || '',
            department: userData.department || '',
            branch: userData.branch || '',
            section: userData.section || '',
            year: userData.year || 0,
            createdAt: serverTimestamp() as any,
        };

        await setDoc(doc(db, 'users', user.uid), userProfile);

        // Store in hierarchical structure: admin/students/{branch}/{year}/{section}/{uid}
        if (userData.role === 'student' && userData.branch && userData.year && userData.section) {
            try {
                const deepPathRef = doc(db, 'admin', 'students', userData.branch, String(userData.year), userData.section, user.uid);
                await setDoc(deepPathRef, userProfile);
            } catch (error) {
                console.error("Error saving to hierarchical path:", error);
            }
        }

        setCurrentUser(userProfile);
    };

    const signInWithGoogle = async (): Promise<{ isNewUser: boolean }> => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Auto-provision Super Admins to bypass registration and ensure Admin role
        if (user.email && ADMIN_EMAILS.includes(user.email)) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                // User exists: Promote to Admin if not already
                const userData = userDoc.data() as User;
                if (userData.role !== 'admin') {
                    await updateDoc(userDocRef, { role: 'admin' });
                    userData.role = 'admin';
                }
                setCurrentUser(userData);
            } else {
                // New User: Create as Admin immediately
                const adminProfile: User = {
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || 'Admin',
                    role: 'admin',
                    createdAt: serverTimestamp() as any,
                    department: 'ADMIN', // Default metadata
                };
                await setDoc(userDocRef, adminProfile);
                setCurrentUser(adminProfile);
            }
            return { isNewUser: false };
        }

        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const isNewUser = !userDoc.exists();

        if (!isNewUser) {
            let userData = userDoc.data() as User;
            setCurrentUser(userData);
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
        // Use the enforced role logic
        const targetRole = updatedData.role || currentUser?.role;

        // 2. Store Faculty/HOD Data in Branch Collection
        if (targetRole === 'faculty' || targetRole === 'hod') {
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
        } else if (targetRole === 'student') {
            // Student Hierarchy: admin/students/{Branch}/{Year}/{Section}/{UID}
            const br = updatedData.branch || currentUser?.branch;
            const yr = updatedData.year || currentUser?.year;
            const sec = updatedData.section || currentUser?.section;

            if (br && yr && sec) {
                try {
                    const deepRef = doc(db, 'admin', 'students', br, String(yr), sec, firebaseUser.uid);
                    await setDoc(deepRef, updatedData, { merge: true });
                } catch (error) {
                    console.error("Error syncing student hierarchy:", error);
                }
            }
        }

        // Update local state
        setCurrentUser((prev) => {
            if (!prev) return null;
            return {
                ...prev,
                ...data, // This might overwrite role invalidly locally if we don't catch it, but next fetch fixes it.
                role: updatedData.role || prev.role // Ensure we use the sanitized role
            };
        });
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
