import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path to your client as needed

export default function RunCountsUploader({ onUploadComplete }) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);

                // Extract headers from the first row
                const headers = rows[0].split(',').map(h => h.trim());

                const parsedData = [];

                // Loop through data rows (skipping the header row)
                for (let i = 1; i < rows.length; i++) {
                    const values = rows[i].split(',').map(v => v.trim());
                    const rowObj = {};

                    headers.forEach((header, index) => {
                        rowObj[header] = values[index];
                    });

                    // Map CSV columns to your Supabase table columns
                    parsedData.push({
                        run_id: rowObj.run_id,
                        shift: rowObj.shift,
                        student_count: parseInt(rowObj.student_count, 10) || 0,
                        effective_date: rowObj.effective_date || new Date().toISOString().split('T')[0],
                        run_description: rowObj.run_description || null
                    });
                }

                // Perform Upsert in Supabase (updating existing run_id matches)
                const { error } = await supabase
                    .from('run_student_counts')
                    .upsert(parsedData, { onConflict: 'run_id' });

                if (error) throw error;

                setMessage({ type: 'success', text: `Successfully processed ${parsedData.length} run records!` });
                if (onUploadComplete) onUploadComplete();
            } catch (err) {
                console.error('Upload error:', err);
                setMessage({ type: 'error', text: `Error uploading CSV: ${err.message}` });
            } finally {
                setLoading(false);
            }
        };

        reader.readAsText(file);
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-slate-100 shadow-xl max-w-xl">
            <h3 className="text-lg font-bold text-white mb-2">Upload Run Student Counts CSV</h3>
            <p className="text-xs text-slate-400 mb-4">
                CSV must include headers: <code className="text-slate-200">run_id, shift, student_count, effective_date, run_description</code>
            </p>

            <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={loading}
                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-550 cursor-pointer"
            />

            {loading && <p className="text-xs text-sky-400 mt-3 animate-pulse">Processing and updating database records...</p>}

            {message && (
                <p className={`text-xs mt-3 p-2 rounded-lg ${message.type === 'success' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                    {message.text}
                </p>
            )}
        </div>
    );
}