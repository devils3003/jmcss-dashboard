import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import AbsenceForm from '../AbsenceForm';
import AbsenceReport from '../components/AbsenceReport';
import StipendTracker from '../components/StipendTracker';

export default function StaffPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'log';

    const tabs = [
        { id: 'log', label: 'Log Absence & Split Coverage' },
        { id: 'report', label: 'Absenteeism Report' },
        { id: 'stipends', label: 'Stipend & Hourly Tracker' },
    ];

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#0f172a] text-slate-100 px-6 py-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 no-print">
                    <Link to="/" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                        ← Back to Command Hub
                    </Link>
                    <h1 className="text-2xl font-bold text-white mt-1">
                        Staff, Absenteeism & Stipends
                    </h1>
                </div>

                <div className="flex flex-wrap gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800 no-print">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setSearchParams({ tab: tab.id })}
                            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === tab.id
                                ? 'bg-emerald-600 text-white shadow'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-6">
                {activeTab === 'log' && <AbsenceForm />}
                {activeTab === 'report' && <AbsenceReport />}
                {activeTab === 'stipends' && <StipendTracker />}
            </div>
        </div>
    );
}