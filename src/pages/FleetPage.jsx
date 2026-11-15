import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ArrivalPerformanceHeatMap from '../components/ArrivalPerformanceHeatMap';
import ArrivalPerformanceManager from '../components/ArrivalPerformanceManager';
import LateArrivalsReport from '../components/LateArrivalsReport';
import ArrivalPerformanceUploader from '../components/ArrivalPerformanceUploader';

export default function FleetPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'heatmap';

    const tabs = [
        { id: 'heatmap', label: 'Arrival Heat Map' },
        { id: 'runs', label: 'Run & Coverage Manager' },
        { id: 'late', label: 'Late Arrivals Report' },
        { id: 'upload', label: 'Upload Arrival Data' },
    ];

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#0f172a] text-slate-100 px-6 py-8">
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumb & Title */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <Link to="/" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
                            ← Back to Command Hub
                        </Link>
                        <h1 className="text-2xl font-bold text-white mt-1">
                            Fleet & Route Performance
                        </h1>
                    </div>

                    {/* Sub-navigation Tabs */}
                    <div className="flex flex-wrap gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setSearchParams({ tab: tab.id })}
                                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Workspace Content */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-6">
                    {activeTab === 'heatmap' && <ArrivalPerformanceHeatMap />}
                    {activeTab === 'runs' && <ArrivalPerformanceManager />}
                    {activeTab === 'late' && <LateArrivalsReport />}
                    {activeTab === 'upload' && <ArrivalPerformanceUploader />}
                </div>
            </div>
        </div>
    );
}