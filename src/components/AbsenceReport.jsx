import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export default function AbsenceReport() {
    const todayStr = new Date().toISOString().split('T')[0];
    const firstOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(firstOfMonthStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [activePreset, setActivePreset] = useState('THIS_MONTH');

    const [roleFilter, setRoleFilter] = useState('ALL');
    const [shiftFilter, setShiftFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [lateFilter, setLateFilter] = useState(false); // Toggle for late-impact runs only
    const [searchQuery, setSearchQuery] = useState('');

    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Apply Date Presets
    const applyDatePreset = (presetKey) => {
        const now = new Date();
        const formatDate = (d) => d.toISOString().split('T')[0];

        setActivePreset(presetKey);

        if (presetKey === 'TODAY') {
            const today = formatDate(now);
            setStartDate(today);
            setEndDate(today);
        } else if (presetKey === 'YESTERDAY') {
            const yest = new Date(now);
            yest.setDate(yest.getDate() - 1);
            const yestStr = formatDate(yest);
            setStartDate(yestStr);
            setEndDate(yestStr);
        } else if (presetKey === 'THIS_WEEK') {
            const day = now.getDay();
            const diffToMon = day === 0 ? -6 : 1 - day;
            const mon = new Date(now);
            mon.setDate(now.getDate() + diffToMon);
            setStartDate(formatDate(mon));
            setEndDate(formatDate(now));
        } else if (presetKey === 'LAST_WEEK') {
            const day = now.getDay();
            const diffToMon = day === 0 ? -6 : 1 - day;
            const lastMon = new Date(now);
            lastMon.setDate(now.getDate() + diffToMon - 7);
            const lastFri = new Date(lastMon);
            lastFri.setDate(lastMon.getDate() + 4);
            setStartDate(formatDate(lastMon));
            setEndDate(formatDate(lastFri));
        } else if (presetKey === 'THIS_MONTH') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1);
            setStartDate(formatDate(first));
            setEndDate(formatDate(now));
        }
    };

    // Fetch report data from Supabase
    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchErr } = await supabase
                .from('v_absenteeism_report')
                .select('*')
                .gte('absence_date', startDate)
                .lte('absence_date', endDate)
                .order('absence_date', { ascending: false });

            if (fetchErr) throw fetchErr;
            setReportData(data || []);
        } catch (err) {
            console.error('Error loading absenteeism report:', err);
            setError('Failed to load report data. Please check network or Supabase view connection.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [startDate, endDate]);

    // Client-side Filtered Records
    const filteredData = useMemo(() => {
        return reportData.filter((row) => {
            const matchesRole = roleFilter === 'ALL' || row.staff_role === roleFilter;
            const matchesShift = shiftFilter === 'ALL' || row.shift === shiftFilter;
            const matchesStatus = statusFilter === 'ALL' || row.coverage_status === statusFilter;
            const matchesLate = !lateFilter || Number(row.late_runs_count) > 0;
            const matchesSearch =
                searchQuery === '' ||
                row.absent_staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                row.coverage_details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (row.late_run_details && row.late_run_details.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (row.log_notes && row.log_notes.toLowerCase().includes(searchQuery.toLowerCase()));

            return matchesRole && matchesShift && matchesStatus && matchesLate && matchesSearch;
        });
    }, [reportData, roleFilter, shiftFilter, statusFilter, lateFilter, searchQuery]);

    // Aggregate Summary Metrics
    const metrics = useMemo(() => {
        const total = filteredData.length;
        const uncovered = filteredData.filter((r) => r.coverage_status === 'Uncovered').length;
        const split = filteredData.filter((r) => r.coverage_status === 'Split Coverage').length;
        const fullyCovered = filteredData.filter((r) => r.coverage_status === 'Fully Covered').length;
        const drivers = filteredData.filter((r) => r.staff_role === 'Driver').length;
        const attendants = filteredData.filter((r) => r.staff_role === 'Bus Attendant').length;

        // Late Run Impact Metrics
        const totalLateImpactRuns = filteredData.reduce((acc, r) => acc + Number(r.late_runs_count || 0), 0);
        const absencesWithLateRuns = filteredData.filter((r) => Number(r.late_runs_count) > 0).length;

        const rate = total > 0 ? (((total - uncovered) / total) * 100).toFixed(1) : '100.0';

        return { total, uncovered, split, fullyCovered, drivers, attendants, rate, totalLateImpactRuns, absencesWithLateRuns };
    }, [filteredData]);

    // Export Dataset to CSV (Includes Late Run Details)
    // Export Dataset to CSV (Includes Late Run Details)
    const exportToCSV = () => {
        if (!filteredData.length) return;

        const headers = [
            'Absence Date',
            'Shift',
            'Absent Staff Name',
            'Position',
            'Coverage Status',
            'Covering Staff / Missed Runs',
            'Correlated Late Runs',
            'Late Run Details',
            'Absence Notes',
            'Assignment Notes'
        ];

        const escapeCsvCell = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };

        const csvRows = [
            headers.map(escapeCsvCell).join(','),
            ...filteredData.map((r) => [
                r.absence_date || '',
                r.shift || '',
                r.absent_staff_name || '',
                r.staff_role || '',
                r.coverage_status || '',
                r.coverage_details || '',
                r.late_runs_count || 0,
                r.late_run_details || '',
                r.log_notes && r.log_notes !== 'EMPTY' ? r.log_notes : '',
                r.assignment_notes || ''
            ].map(escapeCsvCell).join(','))
        ];

        // Prepend UTF-8 BOM (\uFEFF) to prevent Excel string truncation & character mangling
        const csvString = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `JMCSS_Absenteeism_Impact_Report_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-slate-900 text-slate-100 min-h-screen p-6 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Absenteeism & On-Time Performance Report</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Track driver absences, coverage execution, and correlated late arrival impacts (&gt;10m delays)
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Quick Filter: Uncovered Toggle */}
                    <button
                        onClick={() => setStatusFilter((prev) => (prev === 'Uncovered' ? 'ALL' : 'Uncovered'))}
                        className={`px-3.5 py-2 font-medium rounded-lg text-sm transition border flex items-center gap-2 ${statusFilter === 'Uncovered'
                                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-950/50'
                                : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border-rose-900/50'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${statusFilter === 'Uncovered' ? 'bg-white animate-pulse' : 'bg-rose-500'}`}></span>
                        {statusFilter === 'Uncovered' ? 'Uncovered Only' : 'Filter Uncovered'}
                    </button>

                    {/* Quick Filter: Late Impact Toggle */}
                    <button
                        onClick={() => setLateFilter((prev) => !prev)}
                        className={`px-3.5 py-2 font-medium rounded-lg text-sm transition border flex items-center gap-2 ${lateFilter
                                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-950/50'
                                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-amber-900/50'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${lateFilter ? 'bg-white animate-pulse' : 'bg-amber-500'}`}></span>
                        {lateFilter ? 'Late Delays Only' : 'Filter Late Impact'}
                    </button>

                    <button
                        onClick={fetchReport}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium rounded-lg text-sm transition"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={exportToCSV}
                        disabled={!filteredData.length}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 border border-emerald-500/30 text-white font-medium rounded-lg text-sm transition shadow-sm"
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition shadow-sm"
                    >
                        Print
                    </button>
                </div>
            </div>

            {/* Date Presets Toolbar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Date Presets:</span>
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { key: 'TODAY', label: 'Today' },
                        { key: 'YESTERDAY', label: 'Yesterday' },
                        { key: 'THIS_WEEK', label: 'This Week' },
                        { key: 'LAST_WEEK', label: 'Last Week' },
                        { key: 'THIS_MONTH', label: 'This Month' },
                    ].map((preset) => (
                        <button
                            key={preset.key}
                            onClick={() => applyDatePreset(preset.key)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${activePreset === preset.key
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 my-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                            setStartDate(e.target.value);
                            setActivePreset('CUSTOM');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                            setEndDate(e.target.value);
                            setActivePreset('CUSTOM');
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Position</label>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                        <option value="ALL">All Positions</option>
                        <option value="Driver">Drivers</option>
                        <option value="Bus Attendant">Bus Attendants</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Shift</label>
                    <select
                        value={shiftFilter}
                        onChange={(e) => setShiftFilter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                        <option value="ALL">All Shifts</option>
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                        <option value="Both">Full Day (Both)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="Fully Covered">Fully Covered</option>
                        <option value="Split Coverage">Split Coverage</option>
                        <option value="Uncovered">Uncovered</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Search Staff / Runs</label>
                    <input
                        type="text"
                        placeholder="Search name, run..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            {/* KPI Cards (5 Metrics) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Absences</p>
                    <p className="text-3xl font-extrabold text-white mt-2">{metrics.total}</p>
                    <p className="text-xs text-slate-400 mt-1">
                        {metrics.drivers} Drivers | {metrics.attendants} Attendants
                    </p>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shift Coverage Rate</p>
                    <p className="text-3xl font-extrabold text-blue-400 mt-2">{metrics.rate}%</p>
                    <p className="text-xs text-slate-400 mt-1">{metrics.fullyCovered} fully covered</p>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Split Coverage Shifts</p>
                    <p className="text-3xl font-extrabold text-amber-400 mt-2">{metrics.split}</p>
                    <p className="text-xs text-slate-400 mt-1">Multi-driver run splits</p>
                </div>
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-sm">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uncovered Shifts</p>
                    <p className="text-3xl font-extrabold text-rose-400 mt-2">{metrics.uncovered}</p>
                    <p className="text-xs text-slate-400 mt-1">Open shifts requiring resolution</p>
                </div>
                <div className="bg-slate-800/80 border border-amber-500/30 bg-amber-950/20 rounded-xl p-4 shadow-sm col-span-2 lg:col-span-1">
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Late Bus Impact</p>
                    <p className="text-3xl font-extrabold text-amber-300 mt-2">{metrics.totalLateImpactRuns}</p>
                    <p className="text-xs text-amber-400/80 mt-1">Runs &gt;10m late from absences</p>
                </div>
            </div>

            {/* Main Report Table */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 font-medium">Loading report records...</div>
                ) : error ? (
                    <div className="p-12 text-center text-rose-400">{error}</div>
                ) : filteredData.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">No absence records found for the selected criteria.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-800 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700">
                                <tr>
                                    <th className="py-3.5 px-4 font-semibold">Date</th>
                                    <th className="py-3.5 px-4 font-semibold">Shift</th>
                                    <th className="py-3.5 px-4 font-semibold">Absent Staff</th>
                                    <th className="py-3.5 px-4 font-semibold">Position</th>
                                    <th className="py-3.5 px-4 font-semibold">Status</th>
                                    <th className="py-3.5 px-4 font-semibold">Assigned Coverage & Runs</th>
                                    <th className="py-3.5 px-4 font-semibold">On-Time Delay Impact</th>
                                    <th className="py-3.5 px-4 font-semibold">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {filteredData.map((row) => {
                                    const hasLateImpact = Number(row.late_runs_count) > 0;

                                    return (
                                        <tr key={row.log_id} className={`transition-colors ${hasLateImpact ? 'bg-amber-950/10 hover:bg-amber-950/20' : 'hover:bg-slate-800/60'}`}>
                                            <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-200">{row.absence_date}</td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-xs font-semibold ${row.shift === 'AM'
                                                            ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                                            : row.shift === 'PM'
                                                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                                                : 'bg-purple-950 text-purple-300 border border-purple-800'
                                                        }`}
                                                >
                                                    {row.shift}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap font-semibold text-white">{row.absent_staff_name}</td>
                                            <td className="py-3 px-4 whitespace-nowrap text-slate-400">{row.staff_role || '—'}</td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.coverage_status === 'Fully Covered'
                                                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                                            : row.coverage_status === 'Split Coverage'
                                                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                                                        }`}
                                                >
                                                    {row.coverage_status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-200 max-w-sm font-mono text-xs leading-relaxed" title={row.coverage_details}>
                                                {row.coverage_details}
                                            </td>
                                            {/* Late Impact Column */}
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {hasLateImpact ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950 text-amber-300 border border-amber-700/80 text-xs font-semibold" title={row.late_run_details}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                                                        {row.late_run_details}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600 text-xs">On-Time / Untracked</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                                                {row.log_notes && row.log_notes !== 'EMPTY' && (
                                                    <span className="text-slate-200 block font-medium">{row.log_notes}</span>
                                                )}
                                                {row.assignment_notes && (
                                                    <span className="text-xs text-slate-400 block">{row.assignment_notes}</span>
                                                )}
                                                {(!row.log_notes || row.log_notes === 'EMPTY') && !row.assignment_notes && (
                                                    <span className="text-slate-600">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}