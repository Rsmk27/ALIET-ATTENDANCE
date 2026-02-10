'use client';

import { useRouter } from 'next/navigation';
import { GraduationCap, User, Briefcase, ChevronRight } from 'lucide-react';

export default function RegisterLandingPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                {/* Logo and Title */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-6 shadow-xl animate-bounce-slow">
                        <GraduationCap className="w-14 h-14 text-primary-600" />
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">Join ALIETAKE</h1>
                    <p className="text-primary-100 text-lg max-w-2xl mx-auto">
                        Select your role to begin the registration process. Join our digital campus community today.
                    </p>
                </div>

                {/* Role Selection Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                    {/* Student Card */}
                    <div
                        onClick={() => router.push('/register/student')}
                        className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 hover:bg-white/20 transition-all duration-300 cursor-pointer group transform hover:-translate-y-2 hover:shadow-2xl"
                    >
                        <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <User className="w-8 h-8 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Student</h2>
                        <p className="text-primary-100 mb-6">
                            For students to access attendance, fees, results, and academic resources.
                        </p>
                        <div className="flex items-center text-white font-semibold group-hover:translate-x-2 transition-transform">
                            Continue as Student <ChevronRight className="w-5 h-5 ml-1" />
                        </div>
                    </div>

                    {/* Faculty Card */}
                    <div
                        onClick={() => router.push('/register/faculty')}
                        className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-8 hover:bg-white/20 transition-all duration-300 cursor-pointer group transform hover:-translate-y-2 hover:shadow-2xl"
                    >
                        <div className="bg-purple-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                            <Briefcase className="w-8 h-8 text-purple-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Staff</h2>
                        <p className="text-primary-100 mb-6">
                            For staff members and HODs to manage classes, attendance, and department activities.
                        </p>
                        <div className="flex items-center text-white font-semibold group-hover:translate-x-2 transition-transform">
                            Continue as Staff <ChevronRight className="w-5 h-5 ml-1" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-12">
                    <p className="text-primary-200 text-sm">
                        Already have an account? <a href="/login" className="text-white hover:underline font-semibold">Sign In</a>
                    </p>
                    <p className="text-primary-300/50 text-xs mt-4">
                        © {new Date().getFullYear()} Andhra Loyola Institute of Engineering and Technology
                    </p>
                </div>
            </div>
        </div>
    );
}
