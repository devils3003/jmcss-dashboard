import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ArrivalPerformanceHeatMap() {
  const [selectedWeek, setSelectedWeek] = useState('2026-10-19');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Normalize run/route IDs for consistent key lookups
  const normalizeKey = (val) => {
    if (!val) return '';
    return String(val).trim().replace(/-/g, '_').toLowerCase();
  };

  const fetchHeatMapData = async () => {
    setLoading(true);
    try {
      // 1. Fetch performance records
      const { data: perfData, error: perfError } = await supabase
        .from('run_arrival_performances')
        .select('*')
        .eq('week_start_date', selectedWeek)
        .or('exclude_from_heatmap.eq.false,exclude_from_heatmap.is.null')
        .order('school_name', { ascending: true })
        .order('run_id', { ascending: true });

      if (perfError) throw perfError;

      // 2. Fetch student counts
      const { data: countData, error: countError } = await supabase
        .from('run_student_counts')
        .select('*');

      // Map normalized keys to student counts
      const countsMap = {};
      if (countData) {
        countData.forEach(item => {
          const count = Number(item.student_count || item.count || item.total_students || 0);
          if (item.run_id) countsMap[normalizeKey(item.run_id)] = count;
          if (item.route_id) countsMap[normalizeKey(item.route_id)] = count;
        });
      }

      // Merge counts into performance records
      const mergedRecords = (perfData || []).map(row => {
        const runKey = normalizeKey(row.run_id);
        const routeKey = normalizeKey(row.route_id);
        
        const count = 
          row.student_count ?? 
          countsMap[runKey] ?? 
          countsMap[routeKey] ?? 
          0;

        return { ...row, student_count: count };
      });

      setRecords(mergedRecords);
    } catch (err) {
      console.error('Error fetching heat map records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatMapData();
  }, [selectedWeek]);

  // Group records by school
  const groupedBySchool = records.reduce((acc, row) => {
    const search = searchFilter.toLowerCase();
    const matchesSearch =
      !searchFilter ||
      (row.school_name && row.school_name.toLowerCase().includes(search)) ||
      (row.bus_number && row.bus_number.toLowerCase().includes(search)) ||
      (row.run_id && row.run_id.toLowerCase().includes(search));

    if (!matchesSearch) return acc;

    const school = row.school_name || 'Unassigned School';
    if (!acc[school]) acc[school] = [];
    acc[school].push(row);
    return acc;
  }, {});

  // Determine card style based on rules
  const getCardStyle = (row) => {
    const isSpecialRun = row.is_second_run || row.is_covered_run;
    const isLateOver10 = Number(row.minutes_late) > 10 || row.is_late_10_plus === true;

    if (isSpecialRun) {
      return {
        bg: '#0284c7',
        border: '#38bdf8',
        text: '#ffffff',
        badge: 'Covered / 2nd Run',
        badgeBg: '#0369a1'
      };
    }

    if (isLateOver10) {
      return {
        bg: '#dc2626',
        border: '#f87171',
        text: '#ffffff',
        badge: `+${row.minutes_late} min Late`,
        badgeBg: '#991b1b'
      };
    }

    return {
      bg: '#059669',
      border: '#34d399',
      text: '#ffffff',
      badge: row.minutes_late > 0 ? `+${row.minutes_late} min` : 'On Time',
      badgeBg: '#047857'
    };
  };

  // Printable Table Export Function
  const handlePrintExport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRowsHtml = '';

    Object.entries(groupedBySchool).forEach(([schoolName, runs]) => {
      const totalStudents = runs.reduce((sum, r) => sum + Number(r.student_count || 0), 0);
      const impactedStudents = runs
        .filter(r => r.is_second_run || r.is_covered_run || Number(r.minutes_late) > 10 || r.is_late_10_plus)
        .reduce((sum, r) => sum + Number(r.student_count || 0), 0);

      tableRowsHtml += `
        <tr class="school-header-row">
          <td colSpan="6">
            <div class="school-header">
              <span><strong>${schoolName}</strong> (${runs.length} runs)</span>
              <span>Total Students: <strong>${totalStudents}</strong> | Est. Impacted: <strong>${impactedStudents}</strong></span>
            </div>
          </td>
        </tr>
      `;

      runs.forEach((run) => {
        const style = getCardStyle(run);
        tableRowsHtml += `
          <tr style="background-color: ${style.bg}; color: #ffffff;">
            <td><strong>Bus ${run.bus_number || 'N/A'}</strong></td>
            <td>${run.run_id || '-'}</td>
            <td>${run.bell_time || '-'}</td>
            <td>${run.avg_arrival_time || '-'}</td>
            <td><span class="status-badge" style="background-color: ${style.badgeBg};">${style.badge}</span></td>
            <td><strong>${run.student_count || 0}</strong></td>
          </tr>
        `;
      });
    });

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>JMCSS Heat Map Report - Week of ${selectedWeek}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #020617;
              color: #f8fafc;
              padding: 20px;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            h1 { color: #10b981; font-size: 22px; margin-bottom: 4px; }
            p { color: #94a3b8; font-size: 13px; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background-color: #0f172a; color: #10b981; padding: 10px; text-align: left; border: 1px solid #334155; }
            td { padding: 8px 10px; border: 1px solid #1e293b; }
            .school-header-row { background-color: #0f172a !important; color: #f8fafc !important; }
            .school-header { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; color: #f8fafc; }
            .status-badge { padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; color: #ffffff; }
            @media print {
              body { background-color: #020617 !important; color: #f8fafc !important; }
            }
          </style>
        </head>
        <body>
          <h1>JMCSS Arrival Performance Heat Map Report</h1>
          <p>Week Starting: <strong>${selectedWeek}</strong> | Exported: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Bus #</th>
                <th>Run ID</th>
                <th>Bell Time</th>
                <th>Arrival Time</th>
                <th>Status</th>
                <th>Students</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  // KPI Calculations
  const greenCount = records.filter(r => !r.is_second_run && !r.is_covered_run && (Number(r.minutes_late) <= 10 && !r.is_late_10_plus)).length;
  const blueCount = records.filter(r => r.is_second_run || r.is_covered_run).length;
  const redCount = records.filter(r => !r.is_second_run && !r.is_covered_run && (Number(r.minutes_late) > 10 || r.is_late_10_plus)).length;
  
  const totalStudentsImpactedLate = records
    .filter(r => (Number(r.minutes_late) > 10 || r.is_late_10_plus) && !r.is_second_run && !r.is_covered_run)
    .reduce((sum, r) => sum + Number(r.student_count || 0), 0);

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#cbd5e1', padding: '24px', borderRadius: '8px', border: '1px solid #334155', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', margin: '0 0 6px 0' }}>
              Arrival Performance Heat Map
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              Visual tracking of arrival statuses, split/covered runs, and student impact numbers.
            </p>
          </div>

          {/* Export Button */}
          <button
            onClick={handlePrintExport}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            🖨️ Print / Export Report
          </button>
        </div>

        {/* Toolbar & KPI Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
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
                Search Filter
              </label>
              <input
                type="text"
                placeholder="School, Bus #, Run..."
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
          </div>

          {/* Legend / KPI summary */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ padding: '6px 12px', backgroundColor: '#047857', border: '1px solid #34d399', borderRadius: '6px', fontSize: '12px', color: '#ffffff', fontWeight: '600' }}>
              On Time / &le;10m: {greenCount}
            </div>
            <div style={{ padding: '6px 12px', backgroundColor: '#0369a1', border: '1px solid #38bdf8', borderRadius: '6px', fontSize: '12px', color: '#ffffff', fontWeight: '600' }}>
              Covered / 2nd Run: {blueCount}
            </div>
            <div style={{ padding: '6px 12px', backgroundColor: '#991b1b', border: '1px solid #f87171', borderRadius: '6px', fontSize: '12px', color: '#ffffff', fontWeight: '600' }}>
              Unclassified &gt;10m: {redCount} ({totalStudentsImpactedLate} Students)
            </div>
          </div>
        </div>
      </div>

      {/* Grid Display grouped by School */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Loading heat map analytics...
        </div>
      ) : Object.keys(groupedBySchool).length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          No relevant active records found for this week.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(groupedBySchool).map(([schoolName, runs]) => {
            const schoolTotalStudents = runs.reduce((sum, r) => sum + Number(r.student_count || 0), 0);
            
            const schoolImpactedStudents = runs
              .filter(r => r.is_second_run || r.is_covered_run || Number(r.minutes_late) > 10 || r.is_late_10_plus)
              .reduce((sum, r) => sum + Number(r.student_count || 0), 0);

            return (
              <div key={schoolName} style={{ backgroundColor: '#020617', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span>
                    {schoolName} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>({runs.length} runs)</span>
                  </span>
                  
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#10b981', backgroundColor: '#0f172a', padding: '4px 10px', borderRadius: '4px', border: '1px solid #059669', fontWeight: '600' }}>
                      Total Students: {schoolTotalStudents}
                    </span>
                    <span style={{ fontSize: '12px', color: '#fbbf24', backgroundColor: '#451a03', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d97706', fontWeight: '600' }}>
                      Est. Impacted: {schoolImpactedStudents}
                    </span>
                  </div>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
                  {runs.map((run) => {
                    const style = getCardStyle(run);
                    return (
                      <div
                        key={run.id}
                        style={{
                          backgroundColor: style.bg,
                          border: `1px solid ${style.border}`,
                          borderRadius: '6px',
                          padding: '12px',
                          color: style.text,
                          display: 'flex',
                          flexDirection: 'column',
                          justify: 'space-between',
                          gap: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
                            Bus {run.bus_number || 'N/A'}
                          </span>
                          <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: style.badgeBg, borderRadius: '4px', fontWeight: '600' }}>
                            {style.badge}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', opacity: 0.95 }}>
                          <div><strong style={{ opacity: 0.8 }}>Run:</strong> {run.run_id || 'N/A'}</div>
                          <div><strong style={{ opacity: 0.8 }}>Bell:</strong> {run.bell_time}</div>
                          <div><strong style={{ opacity: 0.8 }}>Arrival:</strong> {run.avg_arrival_time}</div>
                          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.25)', fontWeight: 'bold', fontSize: '12px', color: '#ffffff' }}>
                            Students: {run.student_count || 0}
                          </div>
                        </div>
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