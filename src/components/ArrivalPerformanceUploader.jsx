import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ArrivalPerformanceUploader({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

 // Dynamic date normalizer: handles full YYYY, 2-digit YY, and truncated 3-digit years
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    
    if (cleanStr.includes('/')) {
      const parts = cleanStr.split('/');
      if (parts.length === 3) {
        let month = parts[0].padStart(2, '0');
        let day = parts[1].padStart(2, '0');
        let year = parts[2];

        const currentYear = new Date().getFullYear(); // e.g., 2026, 2027, 2028
        const decadePrefix = String(currentYear).slice(0, 3); // "202"

        // Handle full 4-digit year (e.g. "2027")
        if (year.length === 4) {
          return `${year}-${month}-${day}`;
        }
        
        // Handle truncated 3-digit year (e.g. "202" or "2027" cut off)
        if (year.length === 3) {
          if (year === decadePrefix) {
            // "202" -> uses active system year (e.g., 2026 or 2027)
            year = String(currentYear);
          } else {
            // If year is "027", prepend "2" -> "2027"
            year = '2' + year;
          }
        } else if (year.length === 2) {
          // Handle 2-digit year "27" -> "2027"
          year = '20' + year;
        }

        return `${year}-${month}-${day}`;
      }
    }
    return cleanStr;
  };

  // Convert "8:05 AM" or "7:41" to standard SQL time "08:05:00"
  const formatTime = (timeStr) => {
    if (!timeStr) return null;
    let cleanStr = timeStr.trim().toUpperCase();
    let isPM = cleanStr.includes('PM');
    let isAM = cleanStr.includes('AM');
    cleanStr = cleanStr.replace(/(AM|PM)/g, '').trim();

    const parts = cleanStr.split(':');
    if (parts.length < 2) return null;

    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    let seconds = parts[2] ? parseInt(parts[2], 10) : 0;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r\n|\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
      const values = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      return row;
    });
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setStatusMessage({ type: 'error', text: 'Please select a CSV file.' });
      return;
    }

    setLoading(true);
    setStatusMessage({ type: 'info', text: 'Parsing CSV file and normalizing dates/times...' });

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsedRows = parseCSV(event.target.result);

        if (parsedRows.length === 0) {
          throw new Error('CSV file contains no valid rows.');
        }

        const formattedPayload = parsedRows.map(row => ({
          school_number: row['school_number'] || row['school_no'] || null,
          school_name: row['school_name'] || row['school'] || null,
          bell_time: formatTime(row['bell_time']),
          bus_number: row['bus_number'] || row['bus_no'] || row['bus'] || null,
          route_id: row['route_id'] || null,
          run_id: row['run_id'] || null,
          avg_arrival_time: formatTime(row['avg_arrival_time'] || row['arrival_time']),
          week_start_date: formatDate(row['week_start_date'] || row['week_start']),
          week_end_date: formatDate(row['week_end_date'] || row['week_end'])
        })).filter(item => item.week_start_date && item.avg_arrival_time);

        if (formattedPayload.length === 0) {
          throw new Error('No valid rows found matching required fields (week_start_date, avg_arrival_time).');
        }

        setStatusMessage({ type: 'info', text: `Uploading ${formattedPayload.length} normalized rows to Supabase...` });

        const { error } = await supabase
          .from('run_arrival_performances')
          .upsert(formattedPayload, { 
            onConflict: 'school_number,bus_number,run_id,avg_arrival_time,week_start_date',
            ignoreDuplicates: true 
          });

        if (error) throw error;

        setStatusMessage({
          type: 'success',
          text: `Successfully uploaded batch! ${formattedPayload.length} arrival performance records processed.`
        });

        if (onUploadComplete) onUploadComplete();
      } catch (err) {
        console.error('CSV Upload Error:', err);
        setStatusMessage({ type: 'error', text: `Upload failed: ${err.message}` });
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="bg-[#0f172a] p-6 rounded-lg border border-slate-700 text-slate-100 max-w-xl shadow-lg">
      <h3 className="text-lg font-semibold mb-2 text-sky-400">Upload Run Arrival Performance CSV</h3>
      <p className="text-xs text-slate-400 mb-4">
        Normalizes dates to <code className="text-amber-300">YYYY-MM-DD</code> and times to <code className="text-amber-300">HH:MM:SS</code> automatically.
      </p>

      <form onSubmit={handleFileUpload} className="space-y-4">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700 cursor-pointer"
        />

        <button
          type="submit"
          disabled={loading || !file}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            loading || !file
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-sky-600 hover:bg-sky-500 text-white'
          }`}
        >
          {loading ? 'Processing...' : 'Upload & Process CSV'}
        </button>
      </form>

      {statusMessage.text && (
        <div className={`mt-4 p-3 rounded-md text-sm font-medium ${
          statusMessage.type === 'error' ? 'bg-red-900/50 text-red-300 border border-red-700' :
          statusMessage.type === 'success' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' :
          'bg-slate-800 text-sky-300 border border-slate-700'
        }`}>
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}