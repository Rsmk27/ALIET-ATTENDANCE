'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    deleteDoc,
    doc,
    updateDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { Announcement, AnnouncementAudience, AnnouncementTier } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Megaphone, Trash2, Plus, X, Globe, Building, Users, Edit } from 'lucide-react';

export default function AnnouncementManager() {
    const { currentUser } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tier, setTier] = useState<AnnouncementTier>('institutional');
    const [audience, setAudience] = useState<AnnouncementAudience>('all');
    const [department, setDepartment] = useState('');
    const [sendPush, setSendPush] = useState(false);

    const DEPARTMENTS = ['CIVIL', 'EEE', 'MECH', 'ECE', 'CSE', 'IT', 'CSM', 'CSD'];

    useEffect(() => {
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAnnouncements(snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Announcement[]);
        });
        return () => unsubscribe();
    }, []);

    const resetForm = () => {
        setTitle('');
        setContent('');
        setTier('institutional');
        setAudience('all');
        setDepartment('');
        setSendPush(false);
        setEditingId(null);
        setIsAdding(false);
    };

    const handleEdit = (ann: Announcement) => {
        setEditingId(ann.id!);
        setTitle(ann.title);
        setContent(ann.content);
        setTier(ann.tier);
        setAudience(ann.audience || 'all');
        setDepartment(ann.department || '');
        setSendPush(false); // Reset for safety or load if property exists
        setIsAdding(true);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) return;

        setLoading(true);
        try {
            if (editingId) {
                // Update existing
                await updateDoc(doc(db, 'announcements', editingId), {
                    title,
                    content,
                    tier,
                    audience,
                    department: tier === 'departmental' ? department : null,
                    updatedAt: serverTimestamp()
                });
            } else {
                // Add new
                const docRef = await addDoc(collection(db, 'announcements'), {
                    title,
                    content,
                    tier,
                    audience,
                    department: tier === 'departmental' ? department : null,
                    createdBy: currentUser?.uid,
                    createdByName: currentUser?.name || 'Admin',
                    createdAt: serverTimestamp(),
                    isActive: true
                });

                if (sendPush) {
                    // Trigger Push Notification Logic
                    // Since we are client-side only without admin SDK, we'll save a request to a collection 
                    // that a backend function could listen to.
                    try {
                        await addDoc(collection(db, 'admin', 'notifications', 'queue'), {
                            announcementId: docRef.id,
                            title,
                            body: content,
                            audience,
                            department,
                            status: 'pending',
                            createdAt: serverTimestamp()
                        });
                        console.log("Push notification queued for backend processing.");
                        alert("Announcement posted! Notification queued (requires backend setup).");
                    } catch (err) {
                        console.error("Failed to queue notification", err);
                    }
                }
            }

            resetForm();
        } catch (error) {
            console.error("Error saving announcement:", error);
            alert("Failed to save announcement");
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, 'announcements', id), {
                isActive: !currentStatus
            });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this announcement?')) return;
        try {
            await deleteDoc(doc(db, 'announcements', id));
            if (editingId === id) resetForm();
        } catch (error) {
            console.error("Error deleting:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Megaphone className="w-6 h-6 text-primary-600" />
                    Manage Announcements
                </h2>
                <button
                    onClick={() => isAdding ? resetForm() : setIsAdding(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-md"
                >
                    {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isAdding ? 'Cancel' : 'New Announcement'}
                </button>
            </div>

            {isAdding && (
                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border-2 border-primary-200 dark:border-primary-900/30 animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Important Update..."
                                    className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Audience (Banner Type)</label>
                                <select
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
                                    className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                                >
                                    <option value="all">Everyone</option>
                                    <option value="student">Students Only</option>
                                    <option value="faculty">Faculty Only</option>
                                    <option value="hod">HODs Only</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Announcement Tier</label>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setTier('institutional')}
                                        className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${tier === 'institutional' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white dark:bg-gray-700'
                                            }`}
                                    >
                                        <Globe className="w-4 h-4" /> Institutional
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTier('departmental')}
                                        className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${tier === 'departmental' ? 'bg-secondary-600 text-white border-secondary-600' : 'bg-white dark:bg-gray-700'
                                            }`}
                                    >
                                        <Building className="w-4 h-4" /> Departmental
                                    </button>
                                </div>
                            </div>
                            {tier === 'departmental' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Department</label>
                                    <select
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                                        required
                                    >
                                        <option value="">Select Dept</option>
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Content</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={3}
                                placeholder="Details about the update..."
                                className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600"
                                required
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="sendPush"
                                checked={sendPush}
                                onChange={(e) => setSendPush(e.target.checked)}
                                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            />
                            <label htmlFor="sendPush" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Send Push Notification
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-lg disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : editingId ? 'Update Announcement' : 'Post Announcement'}
                        </button>
                    </form>
                </div>
            )}

            <div className="grid gap-4">
                {announcements.map((ann) => (
                    <div key={ann.id} className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border ${ann.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${ann.tier === 'institutional' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                                        }`}>
                                        {ann.tier}
                                    </span>
                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">
                                        To: {ann.audience || 'All'}
                                    </span>
                                    {ann.department && (
                                        <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                                            {ann.department}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white">{ann.title}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{ann.content}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <button
                                    onClick={() => toggleStatus(ann.id!, ann.isActive)}
                                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${ann.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {ann.isActive ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                    onClick={() => handleEdit(ann)}
                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(ann.id!)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
