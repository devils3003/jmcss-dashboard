import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardHub() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const modules = [
        {
            id: 'fleet',
            title: 'Fleet & Route Performance',
            subtitle: 'Bus Arrival Times, Heat Maps & Run Coverage',
            description:
                'Monitor AM/PM arrival variance against bell and dismissal times, school-grouped delay heat maps, and daily run assignments.',
            route: '/fleet',
            accent: 'border-blue-500/40 hover:border-blue-400',
            badgeBg: 'bg-blue-500/10 text-blue-400',
            badgeText: 'Operations',
            quickLinks: [
                { label: 'Arrival Heat Map', path: '/fleet?tab=heatmap' },
                { label: 'Run Manager', path: '/fleet?tab=runs' },
            ],
            icon: (
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
            ),
        },
        {
            id: 'staff',
            title: 'Staff, Absenteeism & Stipends',
            subtitle: 'Attendance Logs, Split Coverage & Stipend Tracking',
            description:
                'Log driver/monitor absences, assign multi-driver split coverage, export absenteeism reports, and audit hourly/stipend payouts.',
            route: '/staff',
            accent: 'border-emerald-500/40 hover:border-emerald-400',
            badgeBg: 'bg-emerald-500/10 text-emerald-400',
            badgeText: 'Personnel',
            quickLinks: [
                { label: 'Log Absence', path: '/staff?tab=log' },
                { label: 'Absence Report', path: '/staff?tab=report' },
                { label: 'Stipend Tracker', path: '/staff?tab=stipends' },
            ],
            icon: (
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
        {
            id: 'admin',
            title: 'Admin & Data Maintenance',
            subtitle: 'Employee Onboarding, Bell Schedules & Cleanup',
            description:
                'Add new drivers and monitors, update active roster status, adjust school bell/dismissal times, and clean up historical records.',
            route: '/admin',
            accent: 'border-amber-500/40 hover:border-amber-400',
            badgeBg: 'bg-amber-500/10 text-amber-400',
            badgeText: 'System Admin',
            quickLinks: [
                { label: 'Manage Employees', path: '/admin?tab=employees' },
                { label: 'School Times', path: '/admin?tab=schools' },
                { label: 'Data Cleanup', path: '/admin?tab=cleanup' },
            ],
            icon: (
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
        },
    ];

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#0f172a] text-slate-100 px-6 py-10">
            <div className="max-w-6xl mx-auto">
                {/* Header Welcome Strip */}
                <div className="mb-10 border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            JMCSS Transportation Command Hub
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Select an operational workspace below to manage fleet performance, staff coverage, or system data.
                        </p>
                    </div>
                    {user?.email && (
                        <div className="text-xs text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-lg">
                            Signed in as <span className="text-slate-200 font-medium">{user.email}</span>
                        </div>
                    )}
                </div>

                {/* 3-Pillar Workspace Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {modules.map((mod) => (
                        <div
                            key={mod.id}
                            onClick={() => navigate(mod.route)}
                            className={`group cursor-pointer bg-slate-900/90 border ${mod.accent} rounded-xl p-6 transition-all duration-200 hover:bg-slate-800/80 hover:shadow-xl hover:shadow-black/30 flex flex-col justify-between`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-5">
                                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 group-hover:border-slate-700">
                                        {mod.icon}
                                    </div>
                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${mod.badgeBg}`}>
                                        {mod.badgeText}
                                    </span>
                                </div>

                                <h2 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                                    {mod.title}
                                </h2>
                                <p className="text-xs font-medium text-slate-400 mt-1">{mod.subtitle}</p>
                                <p className="text-sm text-slate-300/90 mt-4 leading-relaxed">
                                    {mod.description}
                                </p>
                            </div>

                            {/* Direct Sub-Section Pills */}
                            <div className="mt-6 pt-4 border-t border-slate-800/80">
                                <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2.5">
                                    Quick Jump
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {mod.quickLinks.map((link) => (
                                        <button
                                            key={link.path}
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(link.path);
                                            }}
                                            className="text-xs bg-slate-950 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-800 px-2.5 py-1.5 rounded-md transition-colors"
                                        >
                                            {link.label} →
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}