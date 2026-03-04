'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Home, Calendar, MessageCircle, FileText, Settings, LogOut, Menu, X, User, Bell } from 'lucide-react';
import {
    loadSettings, saveSettings, loadNotifications, getUnreadCount,
    checkAndGenerateNotifications
} from '@/lib/utils/notifications';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, userProfile, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Check for due notifications on mount and periodically
    useEffect(() => {
        const checkNotifs = () => {
            const settings = loadSettings();
            // Sync settings to service worker for offline notifications
            saveSettings(settings);
            // Check and generate notifications (no cycle info here, dashboard handles that)
            checkAndGenerateNotifications(settings);
            setUnreadCount(getUnreadCount());
        };

        checkNotifs();
        const interval = setInterval(checkNotifs, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        console.log('Dashboard layout - Auth state:', {
            loading,
            hasUser: !!user,
            hasProfile: !!userProfile,
            onboardingComplete: userProfile?.onboardingComplete
        });

        if (!loading) {
            if (!user) {
                console.log('No user, redirecting to login');
                router.push('/login');
            }
            // Temporarily disable onboarding redirect to debug
            // else if (userProfile && userProfile.onboardingComplete === false) {
            //     console.log('Onboarding incomplete, redirecting to onboarding');
            //     router.push('/onboarding');
            // }
        }
    }, [user, userProfile, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-text-secondary">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: Home },
        { name: 'Log Symptoms', href: '/log', icon: Calendar },
        { name: 'Chat with AI', href: '/chat', icon: MessageCircle },
        { name: 'Reports', href: '/reports', icon: FileText },
        { name: 'Notifications', href: '/notifications', icon: Bell, badge: unreadCount },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-screen w-64 bg-surface border-r border-border transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-border">
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <span className="text-white font-bold text-lg">O</span>
                            </div>
                            <span className="text-xl font-bold gradient-text">Ovira AI</span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                                        }`}
                                >
                                    <item.icon size={20} />
                                    <span className="flex-1">{item.name}</span>
                                    {item.badge != null && item.badge > 0 && (
                                        <span className="bg-accent text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                            {item.badge > 9 ? '9+' : item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-border">
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                {userProfile?.photoURL ? (
                                    <img
                                        src={userProfile.photoURL}
                                        alt="Profile"
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <User size={20} className="text-primary" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {userProfile?.displayName || 'User'}
                                </p>
                                <p className="text-xs text-text-muted truncate">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-3 mt-2 rounded-xl text-error hover:bg-error/10 transition-colors"
                        >
                            <LogOut size={20} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Mobile header */}
                <header className="sticky top-0 z-30 lg:hidden bg-surface/80 backdrop-blur-lg border-b border-border">
                    <div className="flex items-center justify-between px-4 h-16">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <span className="font-bold gradient-text">Ovira AI</span>
                        <Link
                            href="/notifications"
                            className="relative p-2 rounded-lg hover:bg-surface-elevated transition-colors"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-accent text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
