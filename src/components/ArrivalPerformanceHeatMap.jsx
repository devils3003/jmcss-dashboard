import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export default function ArrivalPerformanceHeatMap() {
  const [shiftMode, setShiftMode] = useState('AM'); // 'AM' | 'PM'
  const [weekStartDate, setWeekStartDate] = useState('2026-10-26');
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

 const fetchHeatMap = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch runs from the view
      let query = supabase
        .from('v_run_manager_with_coverage')
        .select('*')
        .eq('week_start_date', weekStartDate);

      if (shiftMode === 'PM') {
        query = query.ilike('run_id', '%_DO%');
      } else {
        query = query.not('run_id', 'ilike', '%_DO%');
      }

      const { data: runsData, error: fetchErr } = await query.order('school_name', { ascending: true });
      if (fetchErr) throw fetchErr;

      // 2. Fetch student counts from the run_student_counts table
      const { data: countsData, error: countsErr } = await supabase
        .from('run_student_counts')
        .select('run_id, student_count');

      if (countsErr) {
        console.warn('Could not fetch student counts:', countsErr);
      }

      // Create a quick lookup map: { [run_id]: student_count }
      const countsMap = {};
      if (countsData) {
        countsData.forEach(item => {
          countsMap[item.run_id] = Number(item.student_count || 0);
        });
      }

      // 3. Attach student counts to each run record
      const formattedData = (runsData || []).map(row => ({
        ...row,
        estimated_impacted_students: countsMap[row.run_id] || 0
      }));

      setHeatmapData(formattedData);
    } catch (err) {
      console.error(`Error loading ${shiftMode} heatmap:`, err);
      setError(`DB Error [${err.code || 'UNKNOWN'}]: ${err.message || 'No message'} | Details: ${err.details || 'None'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatMap();
  }, [shiftMode, weekStartDate]);

  // Aggregate Metrics with shiftMode included in dependencies
  const metrics = useMemo(() => {
    const activeData = heatmapData.filter((r) => !r.exclude_from_heatmap);
    const total = activeData.length;

    const delayedRuns = activeData.filter((r) => {
      const minutesLate = Number(r.calculated_minutes_late ?? r.minutes_late ?? 0);
      return minutesLate > 10;
    });

    const lateruns = delayedRuns.length;
    const onTimeruns = total - lateruns;

    const impactedStudents = delayedRuns.reduce(
      (sum, r) => sum + Number(r.estimated_impacted_students || r.student_count || r.total_students || 0), 
      0
    );

    return { 
      total, 
      lateruns, 
      delayed: lateruns, 
      onTimeruns, 
      onTime: onTimeruns, 
      impactedStudents 
    };
  }, [heatmapData, shiftMode]);

const getRunColorClass = (run) => {
    if (run.is_second_run || run.is_covered_run || run.run_tag === 'Second' || run.run_tag === 'Covered') {
      return 'bg-blue-600 text-blue-100 border-blue-400';
    }
    if (run.exclude_from_heatmap || run.run_tag === 'Ignore') {
      return 'bg-gray-800 text-gray-500 border-gray-700';
    }
    
    const minutesLate = Number(run.calculated_minutes_late ?? run.minutes_late ?? run.delay_minutes ?? 0);
    if (minutesLate > 10) {
      return 'bg-red-950 text-red-200 border-red-700';
    }
    return 'bg-emerald-950 text-emerald-200 border-emerald-700';
  };

  // Group records by School Name (Filtering out omitted runs)
  const schoolGroups = useMemo(() => {
    const groups = {};
    heatmapData.forEach((row) => {
      // Exclude omitted runs from appearing in school cards
      if (row.exclude_from_heatmap) return;

      const school = row.school_name || 'Unassigned School';
      if (!groups[school]) {
        groups[school] = [];
      }
      groups[school].push(row);
    });

    return Object.entries(groups).map(([schoolName, runs]) => {
      const lateCount = runs.filter((r) => Number(r.calculated_minutes_late || 0) > 10).length;
      const totalImpactedStudents = runs
        .filter((r) => Number(r.calculated_minutes_late || 0) > 10)
        .reduce((sum, r) => sum + Number(r.estimated_impacted_students || 0), 0);

      const targetTime = shiftMode === 'AM'
        ? runs[0]?.bell_time || '—'
        : runs[0]?.pm_dismissal_time || '—';

      return {
        schoolName,
        targetTime,
        runs,
        totalRuns: runs.length,
        lateCount,
        totalImpactedStudents
      };
    });
  }, [heatmapData, shiftMode]);

  // Trigger Print Window
  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="printable-heatmap" style={{ padding: '4px' }}>
      {/* Global Print Isolation CSS */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-heatmap, #printable-heatmap * {
              visibility: visible !important;
            }
            #printable-heatmap {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background-color: #020617 !important;
              color: #f8fafc !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print, .no-print * {
              display: none !important;
              visibility: hidden !important;
            }
            .school-card-print {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-bottom: 16px !important;
            }
          }
        `}
      </style>

      {/* Header & Controls Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{shiftMode === 'AM' ? '🌅 Morning Arrival Heatmap' : '`🌆 Afternoon Dismissal Heatmap`'}</span>
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            {shiftMode === 'AM'
              ? 'Grouped by school. Delays past morning bell (>10m) highlighted in red.'
              : 'Grouped by school. Delays past PM dismissal (>10m) highlighted in red.'}
          </p>
        </div>

        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Shift Switcher */}
          <div style={{ backgroundColor: '#020617', padding: '5px', borderRadius: '9999px', border: '1px solid #334155', display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setShiftMode('AM')}
              style={{
                backgroundColor: shiftMode === 'AM' ? '#2563eb' : 'transparent',
                color: shiftMode === 'AM' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              AM Morning Bell
            </button>
            <button
              onClick={() => setShiftMode('PM')}
              style={{
                backgroundColor: shiftMode === 'PM' ? '#7c3aed' : 'transparent',
                color: shiftMode === 'PM' ? '#ffffff' : '#94a3b8',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              PM Dismissal Time
            </button>
          </div>

          <div>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              style={{
                backgroundColor: '#020617',
                border: '1px solid #334155',
                color: '#f8fafc',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '600'
              }}
            />
          </div>

          <button
            onClick={handlePrint}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              padding: '6px 16px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            🖨️ Print / Export Heatmap
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '24px' }}>
  <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '14px 18px' }}>
    <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Total Active Runs</span>
    <div style={{ fontSize: '26px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>{metrics?.total ?? 0}</div>
  </div>

  <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '14px 18px' }}>
    <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>On-Time (&le;10m)</span>
    <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>{metrics?.onTimeruns ?? 0}</div>
  </div>

  <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '14px 18px' }}>
    <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Delayed (&gt;10m)</span>
    <div style={{ fontSize: '26px', fontWeight: '800', color: '#ef4444', marginTop: '2px' }}>{metrics?.lateruns ?? 0}</div>
  </div>

  <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '14px 18px' }}>
    <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Estimated Impacted Students</span>
    <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', marginTop: '2px' }}>{metrics?.impactedStudents ?? 0}</div>
  </div>
</div>

      {/* School Cards Grid */}
      {loading ? (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>
          Loading {shiftMode} Heatmap...
        </div>
      ) : error ? (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#ef4444' }}>
          {error}
        </div>
      ) : schoolGroups.length === 0 ? (
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          No active performance records found for week start <strong>{weekStartDate}</strong> in {shiftMode} mode.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {schoolGroups.map((group) => {
            const hasLateRuns = group.lateCount > 0;

            return (
              <div
                key={group.schoolName}
                className="school-card-print"
                style={{
                  backgroundColor: '#0f172a',
                  border: hasLateRuns ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #334155',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
                }}
              >
                {/* School Header Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', borderBottom: '1px solid #1e293b', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#f8fafc' }}>
                      {group.schoolName}
                    </h4>
                    <span style={{ fontSize: '11px', backgroundColor: '#1e293b', color: '#94a3b8', padding: '3px 10px', borderRadius: '9999px', border: '1px solid #334155', fontWeight: '600' }}>
                      {shiftMode === 'AM' ? `🔔 Bell: ${group.targetTime}` : `🚪 Dismissal: ${group.targetTime}`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '600' }}>
                      {group.totalRuns} {group.totalRuns === 1 ? 'Run' : 'Runs'}
                    </span>
                    {hasLateRuns ? (
                      <>
                        <span style={{ fontSize: '11px', backgroundColor: '#7f1d1d', color: '#fca5a5', border: '1px solid #ef4444', padding: '2px 10px', borderRadius: '9999px', fontWeight: 'bold' }}>
                          {group.lateCount} Delayed
                        </span>
                        <span style={{ fontSize: '11px', backgroundColor: '#78350f', color: '#fde68a', border: '1px solid #f59e0b', padding: '2px 10px', borderRadius: '9999px', fontWeight: 'bold' }}>
                          👥 {group.totalImpactedStudents} Impacted
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: '11px', backgroundColor: '#064e3b', color: '#6ee7b7', border: '1px solid #10b981', padding: '2px 10px', borderRadius: '9999px', fontWeight: 'bold' }}>
                        All On-Time
                      </span>
                    )}
                  </div>
                </div>

                {/* Run Pill Chips Container (Active Runs Only) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {group.runs.map((row) => {
                    const minutesLate = Number(row.calculated_minutes_late || 0);
    const isSecond = row.is_second_run;
    const isCovered = row.is_covered_run;
    const isLate = minutesLate > 10;
    const studentCount = Number(row.estimated_impacted_students || 0);

    // Prioritize Second / Covered (Blue) FIRST, then Late (Red), then On-Time (Green)
    const pillBg = isSecond
      ? '#1e3a8a'     // Deep blue for second run
      : isCovered
      ? '#1e3a8a'     // Blue for covered run (or use #064e3b if you want distinct greens/blues)
      : isLate
      ? '#7f1d1d'     // Red for late
      : '#064e3b';    // Green for on-time

    const pillBorder = isSecond
      ? '#3b82f6'     // Bright blue border
      : isCovered
      ? '#3b82f6'     // Bright blue border
      : isLate
      ? '#ef4444'     // Red border
      : '#10b981';    // Green border

    const pillTextColor = isSecond
      ? '#93c5fd'     // Light blue text
      : isCovered
      ? '#93c5fd'     // Light blue text
      : isLate
      ? '#fca5a5'     // Light red text
      : '#6ee7b7';    // Light green text

                    return (
                      <div
                        key={row.id}
                        style={{
                          backgroundColor: pillBg,
                          border: `1px solid ${pillBorder}`,
                          color: pillTextColor,
                          borderRadius: '9999px',
                          padding: '6px 14px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        <span style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '2px 7px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold' }}>
                          Bus {row.bus_number || '—'}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                          {row.run_id || '—'}
                        </span>
                        <span style={{ fontSize: '11px', opacity: 0.9 }}>
                          ({row.avg_arrival_time || '—'})
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>
  {isSecond ? (
    `2ND RUN`
  ) : isCovered ? (
    `COVERED`
  ) : isLate ? (
    `+${minutesLate}m LATE`
  ) : (
    `ON-TIME`
  )}
</span>
                        {studentCount > 0 && (
                          <span
                            style={{
                              backgroundColor: 'rgba(0, 0, 0, 0.35)',
                              color: '#fbbf24',
                              padding: '2px 7px',
                              borderRadius: '9999px',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            👥 {studentCount}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}