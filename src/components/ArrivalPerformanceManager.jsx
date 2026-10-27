import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ArrivalPerformanceManager() {
  const [selectedWeek, setSelectedWeek] = useState('2026-10-19');
  const [records, setRecords] = useState([]);
  const [availableRuns, setAvailableRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showOnlyLate, setShowOnlyLate] = useState(false);

  // Fetch performance records and master runs table
  const fetchWeekRecords = async () => {
    setLoading(true);
    try {
      // 1. Fetch performance records
      let query = supabase
        .from('run_arrival_performances')
        .select('*')
        .eq('week_start_date', selectedWeek)
        .order('school_name', { ascending: true });

      if (showOnlyLate) {
        query = query.or('minutes_late.gt.10,is_late_10_plus.eq.true');
      }

      const { data: perfData, error: perfError } = await query;
      if (perfError) throw perfError;

      // 2. Fetch master runs list
      const { data: runMasterData, error: runMasterError } = await supabase
        .from('runs')
        .select('run_id, route_id')
        .order('run_id', { ascending: true });

      if (runMasterError) console.warn('Could not fetch runs master table:', runMasterError);

      setRecords(perfData || []);
      setAvailableRuns(runMasterData || []);
    } catch (err) {
      console.error('Error loading records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeekRecords();
  }, [selectedWeek, showOnlyLate]);

  // Handle instant updates for checkboxes and run assignment drops
  const updateRecordFlag = async (id, field, value) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

    try {
      const { data, error } = await supabase
        .from('run_arrival_performances')
        .update({ [field]: value })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        console.warn('Supabase update returned 0 rows! Check RLS policies.');
      } else {
        console.log(`Successfully updated ${field}:`, data[0]);
      }
    } catch (err) {
      console.error(`Failed to update ${field} in DB:`, err);
      fetchWeekRecords();
    }
  };

  // Dynamic run list selection
  const getMatchingRunsForRow = (row) => {
    const isSpecialRun = row.is_second_run || row.is_covered_run;

    // Rule: If marked as Second Run or Covered Run, provide ALL available runs
    if (isSpecialRun) {
      return availableRuns;
    }

    // Default: Filter runs matching this bus/route number
    const routeIdentifier = String(row.route_id || row.bus_number || '').trim().toLowerCase();
    
    if (!routeIdentifier) return availableRuns;

    const matched = availableRuns.filter(r => {
      const rRoute = String(r.route_id || '').trim().toLowerCase();
      const rRun = String(r.run_id || '').trim().toLowerCase();
      return rRoute === routeIdentifier || rRoute.includes(routeIdentifier) || rRun.includes(routeIdentifier);
    });

    return matched.length > 0 ? matched : availableRuns;
  };

  const filteredRecords = records.filter(r => {
    const search = searchFilter.toLowerCase();
    
    const matchesSearch = 
      (r.school_name && r.school_name.toLowerCase().includes(search)) ||
      (r.bus_number && r.bus_number.toLowerCase().includes(search)) ||
      (r.run_id && r.run_id.toLowerCase().includes(search));

    const isOver10MinLate = Number(r.minutes_late) > 10 || r.is_late_10_plus === true;

    if (showOnlyLate) {
      return matchesSearch && isOver10MinLate;
    }

    return matchesSearch;
  });

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#cbd5e1', padding: '24px', borderRadius: '8px', border: '1px solid #334155', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', margin: '0 0 6px 0' }}>
            Manage Run Classifications &amp; Heat Map Filters
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
            Tag split loads, covered runs, assign missing run IDs, or exclude records from heat map analytics.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#10b981', marginBottom: '4px' }}>
              Week Start
            </label>
            <input
              type="date"
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #059669',
                color: '#f8fafc',
                fontSize: '13px',
                borderRadius: '4px',
                padding: '6px 10px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#10b981', marginBottom: '4px' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Bus #, Run, School..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#f8fafc',
                fontSize: '13px',
                borderRadius: '4px',
                padding: '6px 10px',
                outline: 'none',
                width: '200px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px' }}>
            <input
              type="checkbox"
              id="lateOnly"
              checked={showOnlyLate}
              onChange={(e) => setShowOnlyLate(e.target.checked)}
              style={{
                accentColor: '#10b981',
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <label htmlFor="lateOnly" style={{ fontSize: '13px', color: '#10b981', fontWeight: '600', cursor: 'pointer' }}>
              Late (&gt;10 min)
            </label>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid #1e293b' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
              <th style={{ padding: '12px 14px', color: '#10b981', fontWeight: 'bold' }}>School</th>
              <th style={{ padding: '12px 14px', color: '#10b981', fontWeight: 'bold' }}>Bus #</th>
              <th style={{ padding: '12px 14px', color: '#10b981', fontWeight: 'bold' }}>Run ID / Assign</th>
              <th style={{ padding: '12px 14px', color: '#10b981', fontWeight: 'bold' }}>Arrival</th>
              <th style={{ padding: '12px 14px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>Minutes Late</th>
              <th style={{ padding: '12px 14px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>Second Run</th>
              <th style={{ padding: '12px 14px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>Covered Run</th>
              <th style={{ padding: '12px 14px', color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>Exclude Heat Map</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  Loading records...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No records found matching criteria.
                </td>
              </tr>
            ) : (
              filteredRecords.map((row) => {
                const matchingRuns = getMatchingRunsForRow(row);
                const hasAssignedRun = row.run_id && row.run_id !== '-' && row.run_id !== 'N/A';
                const isSpecialRun = row.is_second_run || row.is_covered_run;

                return (
                  <tr 
                    key={row.id} 
                    style={{ 
                      borderBottom: '1px solid #1e293b',
                      backgroundColor: row.exclude_from_heatmap ? '#090d16' : 'transparent',
                      opacity: row.exclude_from_heatmap ? 0.5 : 1
                    }}
                  >
                    <td style={{ padding: '10px 14px', color: '#e2e8f0', fontWeight: '500' }}>
                      {row.school_name} <span style={{ fontSize: '11px', color: '#64748b' }}>({row.school_number})</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#cbd5e1', fontWeight: 'bold' }}>{row.bus_number || '-'}</td>
                    
                    {/* Run ID Column */}
                    <td style={{ padding: '10px 14px' }}>
                      {hasAssignedRun ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: isSpecialRun ? '#fbbf24' : '#38bdf8', fontWeight: 'bold' }}>
                            {row.run_id}
                          </span>
                          <button
                            onClick={() => updateRecordFlag(row.id, 'run_id', null)}
                            title="Re-assign Run ID"
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '11px', padding: 0 }}
                          >
                            ✏️
                          </button>
                        </div>
                      ) : (
                        <select
                          value={row.run_id || ''}
                          onChange={(e) => updateRecordFlag(row.id, 'run_id', e.target.value)}
                          style={{
                            backgroundColor: '#1e293b',
                            border: `1px solid ${isSpecialRun ? '#38bdf8' : '#059669'}`,
                            color: '#fbbf24',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            outline: 'none',
                            maxWidth: '180px'
                          }}
                        >
                          <option value="">
                            {isSpecialRun ? '-- All Runs (Covered/2nd) --' : '-- Select Run --'}
                          </option>
                          {matchingRuns.map((r, i) => (
                            <option key={`${r.run_id}-${i}`} value={r.run_id}>
                              {r.run_id} ({r.route_id})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>

                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#cbd5e1' }}>{row.avg_arrival_time}</td>
                    <td style={{ 
                      padding: '10px 14px', 
                      textAlign: 'center', 
                      fontWeight: 'bold',
                      color: row.minutes_late > 10 ? '#f87171' : row.minutes_late > 0 ? '#fbbf24' : '#34d399'
                    }}>
                      +{row.minutes_late || 0} min
                    </td>

                    {/* Checkboxes */}
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={row.is_second_run || false}
                        onChange={(e) => updateRecordFlag(row.id, 'is_second_run', e.target.checked)}
                        style={{ accentColor: '#10b981', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>

                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={row.is_covered_run || false}
                        onChange={(e) => updateRecordFlag(row.id, 'is_covered_run', e.target.checked)}
                        style={{ accentColor: '#10b981', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>

                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={row.exclude_from_heatmap || false}
                        onChange={(e) => updateRecordFlag(row.id, 'exclude_from_heatmap', e.target.checked)}
                        style={{ accentColor: '#f87171', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}