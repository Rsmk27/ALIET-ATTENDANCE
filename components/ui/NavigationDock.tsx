'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Presentation,
    BarChart3,
    User,
    Settings,
    Shield,
    Wallet
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function NavigationDock() {
    const router = useRouter();
    const pathname = usePathname();
    const { currentUser } = useAuth();

    const isDashboard = pathname.startsWith('/dashboard');

    if (!currentUser || !isDashboard) return null;

    const role = currentUser.role;

    // Do not show dock for admin as per request
    if (role === 'admin') return null;

    // Define navigation items based on role
    const getNavItems = () => {


        if (role === 'faculty' || role === 'hod') {
            return [
                { icon: LayoutDashboard, label: 'Home', path: '/dashboard/faculty' },
                { icon: Presentation, label: 'Attendance', path: '/dashboard/faculty/attendance' },
                { icon: BarChart3, label: 'Analytics', path: '/dashboard/faculty/analytics' },
                { icon: User, label: 'Profile', path: '/dashboard/faculty/profile' },
            ];
        }

        if (role === 'student') {
            return [
                { icon: LayoutDashboard, label: 'Home', path: '/dashboard/student' },
                { icon: Wallet, label: 'Fees', path: '/dashboard/student/fees' },
                { icon: User, label: 'Profile', path: '/dashboard/student/profile' },
            ];
        }

        return [];
    };

    const navItems = getNavItems();

    if (navItems.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-0.5 p-1 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/20 dark:border-gray-800/50 rounded-xl shadow-2xl overflow-visible group/dock">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={`
                                relative p-1.5 rounded-lg transition-all duration-300 group/item flex flex-col items-center justify-center
                                ${isActive
                                    ? 'bg-primary-600 text-white shadow-md scale-105'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }
                                hover:-translate-y-1 hover:scale-110 active:scale-95
                            `}
                        >
                            <Icon className="w-4 h-4" />

                            {/* Label that appears on hover */}
                            <span className="absolute -top-8 px-2 py-0.5 bg-gray-900 dark:bg-gray-800 text-white text-[10px] font-bold rounded shadow-lg opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-gray-700 -translate-x-1/2 left-1/2 ml-0">
                                {item.label}
                                {/* Pointer */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                            </span>

                            {/* Active dot */}
                            {isActive && (
                                <div className="absolute -bottom-0.5 w-0.5 h-0.5 bg-white rounded-full opacity-70"></div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
