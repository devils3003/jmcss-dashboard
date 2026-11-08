import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export default function LateArrivalsReport() {
  const defaultFrom = '2026-10-01';
  const defaultTo = new Date().toISOString().split('T')[0];

  const [fromWeek, setFromWeek] = useState(defaultFrom);
  const [toWeek, setToWeek] = useState(defaultTo);
  const [excludeOmitted, setExcludeOmitted] = useState(true);
  const [excludeVans, setExcludeVans] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [rawRecords, setRawRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch late arrival records from v_arrival_heatmap_with_counts or run_arrival_performances
  const fetchLateArrivals = async () => {
    setLoading(true);
    setError(null);
    try {
      // Querying v_arrival_heatmap_with_counts gives access to exclude_from_heatmap, is_second_run, etc.
      const { data, error: fetchErr } = await supabase
        .from('v_arrival_heatmap_with_counts')
        .select('*')
        .gte('week_start_date', fromWeek)
        .lte('week_start_date', toWeek)
        .gt('minutes_late', 10)
        .order('week_start_date', { ascending: false });

      if (fetchErr) {
        // Fallback to raw table if view querying differs in schema
        const { data: rawData, error: rawErr } = await supabase
          .from('run_arrival_performances')
          .select('*')
          .gte('week_start_date', fromWeek)
          .lte('week_start_date', toWeek)
          .gt('minutes_late', 10)
          .order('week_start_date', { ascending: false });

        if (rawErr) throw rawErr;
        setRawRecords(rawData || []);
      } else {
        setRawRecords(data || []);
      }
    } catch (err) {
      console.error('Error fetching late arrivals:', err);
      setError('Failed to load late arrivals data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLateArrivals();
  }, [fromWeek, toWeek]);

  // Helper to identify Van / Special Passenger Vehicles
  const isVanRecord = (row) => {
    const busNum = String(row.bus_number || row.bus_no || '').trim().toUpperCase();
    const runId = String(row.run_id || '').trim().toUpperCase();

    // Check for 'P' suffix (e.g., 15P), 'VAN' keywords, or Special Ed Van prefixes
    return (
      busNum.endsWith('P') ||
      busNum.includes('VAN') ||
      runId.includes('_VAN_') ||
      runId.startsWith('VAN_')
    );
  };

  // Filtered dataset based on UI controls
  const filteredRecords = useMemo(() => {
    return rawRecords.filter((row) => {
      // 1. Omit / Exclude logic check
      if (excludeOmitted && (row.exclude_from_heatmap === true || row.classification === 'ignore' || row.classification === 'ignored')) {
        return false;
      }

      // 2. Van filter check
      if (excludeVans && isVanRecord(row)) {
        return false;
      }

      // 3. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const schoolName = String(row.school_name || '').toLowerCase();
        const busNo = String(row.bus_number || row.bus_no || '').toLowerCase();
        const runId = String(row.run_id || '').toLowerCase();
        return schoolName.includes(query) || busNo.includes(query) || runId.includes(query);
      }

      return true;
    });
  }, [rawRecords, excludeOmitted, excludeVans, searchQuery]);

  // Summary Metrics
  const summary = useMemo(() => {
    const total = filteredRecords.length;
    if (total === 0) return { total: 0, maxDelay: 0, avgDelay: 0 };

    const delays = filteredRecords.map((r) => Number(r.minutes_late || 0));
    const maxDelay = Math.max(...delays);
    const sumDelay = delays.reduce((a, b) => a + b, 0);
    const avgDelay = (sumDelay / total).toFixed(1);

    return { total, maxDelay, avgDelay };
  }, [filteredRecords]);

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredRecords.length) return;

    const headers = ['School Name', 'Bus #', 'Run ID', 'Bell Time', 'Avg Arrival', 'Minutes Late', 'Week Start', 'Classification'];

    // Helper to safely escape double quotes and wrap values in quotes
    const escapeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [
      headers.map(escapeCsvCell).join(','),
      ...filteredRecords.map((r) => [
        r.school_name || '',
        r.bus_number || r.bus_no || '',
        r.run_id || '',
        r.bell_time || '',
        r.avg_arrival_time || '',
        r.minutes_late || 0,
        r.week_start_date || '',
        r.classification || 'Regular'
      ].map(escapeCsvCell).join(','))
    ];

    // Prepend UTF-8 BOM (\uFEFF) so Excel opens CSVs in multi-column UTF-8 cleanly
    const csvString = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Late_Arrivals_Report_${fromWeek}_to_${toWeek}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '8px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#f8fafc', margin: '0 0 4px 0' }}>
          Late Arrivals Report (&gt; 10 Minutes)
        </h2>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          Filter runs arriving 10+ minutes past bell time by week start date
        </p>
      </div>

      {/* Control Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>From Week</label>
          <input
            type="date"
            value={fromWeek}
            onChange={(e) => setFromWeek(e.target.value)}
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '6px 10px', borderRadius: '6px', fontSize: '13px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>To Week</label>
          <input
            type="date"
            value={toWeek}
            onChange={(e) => setToWeek(e.target.value)}
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', padding: '6px 10px', borderRadius: '6px', fontSize: '13px' }}
          />
        </div>

        {/* Omit Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
          <input
            type="checkbox"
            id="excludeOmitted"
            checked={excludeOmitted}
            onChange={(e) => setExcludeOmitted(e.target.checked)}
            style={{ accentColor: '#10b981', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="excludeOmitted" style={{ fontSize: '13px', color: '#f8fafc', cursor: 'pointer', fontWeight: '500' }}>
            Exclude Omitted Runs
          </label>
        </div>

        {/* Van Filter Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
          <input
            type="checkbox"
            id="excludeVans"
            checked={excludeVans}
            onChange={(e) => setExcludeVans(e.target.checked)}
            style={{ accentColor: '#3b82f6', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="excludeVans" style={{ fontSize: '13px', color: '#f8fafc', cursor: 'pointer', fontWeight: '500' }}>
            Exclude Vans (e.g. 15P)
          </label>
        </div>

        <div style={{ marginTop: '16px', marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchLateArrivals}
            style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Run Report
          </button>
          <button
            onClick={exportToCSV}
            disabled={!filteredRecords.length}
            style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', opacity: filteredRecords.length ? 1 : 0.5 }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Delayed Runs</span>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginTop: '4px' }}>{summary.total}</div>
        </div>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Max Delay</span>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444', marginTop: '4px' }}>{summary.maxDelay} m</div>
        </div>
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold' }}>Avg Delay</span>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>{summary.avgDelay} m</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading late arrivals...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No delayed runs matching criteria.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', color: '#f8fafc' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>School</th>
                <th style={{ padding: '12px 16px' }}>Bus #</th>
                <th style={{ padding: '12px 16px' }}>Run ID</th>
                <th style={{ padding: '12px 16px' }}>Bell Time</th>
                <th style={{ padding: '12px 16px' }}>Avg Arrival</th>
                <th style={{ padding: '12px 16px' }}>Minutes Late</th>
                <th style={{ padding: '12px 16px' }}>Week Start</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => {
                const isVan = isVanRecord(r);

                return (
                  <tr key={r.id || idx} style={{ borderBottom: '1px solid #1e293b', backgroundColor: idx % 2 === 0 ? 'transparent' : '#0f172a' }}>
                    <td style={{ padding: '12px 16px', fontWeight: '600' }}>{r.school_name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {r.bus_number || r.bus_no || '—'}
                        {isVan && (
                          <span style={{ fontSize: '10px', backgroundColor: '#1e3a8a', color: '#93c5fd', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                            VAN
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>{r.run_id || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{r.bell_time || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>{r.avg_arrival_time || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: 'bold' }}>+{r.minutes_late} min</td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{r.week_start_date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}