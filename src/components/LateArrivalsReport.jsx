import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function LateArrivalsReport() {
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchLateArrivals = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase
        .from('run_arrival_performances')
        .select('*')
        .gte('week_start_date', startDate)
        .lte('week_start_date', endDate)
        .or('is_late_10_plus.eq.true,minutes_late.gt.10')
        .order('week_start_date', { ascending: false })
        .order('school_name', { ascending: true });

      if (error) throw error;
      setReportData(data || []);
    } catch (err) {
      console.error('Error fetching report:', err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLateArrivals();
  }, []);

  // Export filtered report to CSV
  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = ['School #', 'School Name', 'Bus #', 'Route ID', 'Run ID', 'Bell Time', 'Avg Arrival', 'Minutes Late', 'Week Start', 'Week End'];
    const rows = reportData.map(r => [
      r.school_number || '',
      `"${r.school_name || ''}"`,
      r.bus_number || '',
      r.route_id || '',
      r.run_id || '',
      r.bell_time || '',
      r.avg_arrival_time || '',
      r.minutes_late || 0,
      r.week_start_date || '',
      r.week_end_date || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Late_Arrivals_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0f172a] p-6 rounded-lg border border-slate-700 text-slate-100 max-w-6xl w-full shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-amber-400">Late Arrivals Report (&gt; 10 Minutes)</h2>
          <p className="text-xs text-slate-400">Filter runs arriving 10+ minutes past bell time by week start date</p>
        </div>

        {/* Date Range Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">From Week</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-sm text-slate-100 rounded px-3 py-1.5 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">To Week</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-sm text-slate-100 rounded px-3 py-1.5 focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            onClick={fetchLateArrivals}
            className="mt-5 bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm px-4 py-1.5 rounded transition-colors"
          >
            Run Report
          </button>
          <button
            onClick={exportToCSV}
            disabled={reportData.length === 0}
            className={`mt-5 font-medium text-sm px-4 py-1.5 rounded transition-colors ${
              reportData.length === 0 
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            Export CSV
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-900/50 text-red-300 border border-red-700 p-3 rounded mb-4 text-sm">
          {errorMsg}
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700/50">
          <span className="text-xs text-slate-400">Total Delayed Runs</span>
          <p className="text-2xl font-bold text-amber-400">{reportData.length}</p>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700/50">
          <span className="text-xs text-slate-400">Max Delay (Minutes)</span>
          <p className="text-2xl font-bold text-red-400">
            {reportData.length > 0 ? Math.max(...reportData.map(r => r.minutes_late || 0)) : 0} m
          </p>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700/50">
          <span className="text-xs text-slate-400">Avg Delay (Minutes)</span>
          <p className="text-2xl font-bold text-sky-400">
            {reportData.length > 0 
              ? (reportData.reduce((acc, r) => acc + (r.minutes_late || 0), 0) / reportData.length).toFixed(1) 
              : 0} m
          </p>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-800 text-xs uppercase text-slate-400 border-b border-slate-700">
            <tr>
              <th className="py-3 px-4">School</th>
              <th className="py-3 px-4">Bus #</th>
              <th className="py-3 px-4">Run ID</th>
              <th className="py-3 px-4">Bell Time</th>
              <th className="py-3 px-4">Avg Arrival</th>
              <th className="py-3 px-4 text-center">Minutes Late</th>
              <th className="py-3 px-4">Week Start</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-6 text-center text-slate-500">
                  Loading report data...
                </td>
              </tr>
            ) : reportData.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-6 text-center text-slate-500">
                  No runs found exceeding 10 minutes late within this date range.
                </td>
              </tr>
            ) : (
              reportData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-200">
                    {row.school_name} <span className="text-xs text-slate-500">({row.school_number})</span>
                  </td>
                  <td className="py-3 px-4">{row.bus_number || '-'}</td>
                  <td className="py-3 px-4 font-mono text-xs text-sky-300">{row.run_id || '-'}</td>
                  <td className="py-3 px-4 font-mono text-xs">{row.bell_time}</td>
                  <td className="py-3 px-4 font-mono text-xs text-amber-300">{row.avg_arrival_time}</td>
                  <td className="py-3 px-4 text-center font-bold text-red-400">
                    +{row.minutes_late} min
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">{row.week_start_date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}