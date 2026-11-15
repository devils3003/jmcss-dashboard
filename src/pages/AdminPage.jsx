import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function AdminPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'employees';

    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({
        staffId: '',
        firstName: '',
        lastName: '',
        hireDate: '',
        Position: 'Driver',
        Active: 'Yes',
    });
    const [statusMsg, setStatusMsg] = useState(null);

    const tabs = [
        { id: 'employees', label: 'Employee Roster' },
        { id: 'schools', label: 'School Bell Times' },
        { id: 'cleanup', label: 'Data Cleanup' },
    ];

    const fetchStaff = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('staff')
            .select('*')
            .order('Last Name', { ascending: true });
        if (!error && data) setStaffList(data);
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'employees') fetchStaff();
    }, [activeTab]);

    const handleAddEmployee = async (e) => {
        e.preventDefault();
        setStatusMsg(null);
        const { error } = await supabase.from('staff').insert([
            {
                'Staff ID': parseInt(form.staffId, 10),
                'First Name': form.firstName.trim(),
                'Last Name': form.lastName.trim(),
                'Hire Date': form.hireDate || null,
                Position: form.Position,
                Active: form.Active,
            },
        ]);

        if (error) {
            setStatusMsg({ type: 'error', text: error.message });
        } else {
            setStatusMsg({ type: 'success', text: 'Employee added to roster.' });
            setForm({
                staffId: '',
                firstName: '',
                lastName: '',
                hireDate: '',
                Position: 'Driver',
                Active: 'Yes',
            });
            fetchStaff();
        }
    };

    const toggleActiveStatus = async (member) => {
        const nextStatus = String(member.Active).trim().toLowerCase() === 'yes' ? 'No' : 'Yes';
        const { error } = await supabase
            .from('staff')
            .update({ Active: nextStatus })
            .eq('Staff ID', member['Staff ID']);

        if (!error) fetchStaff();
    };

    const filteredStaff = staffList.filter((s) =>
        `${s['First Name'] || ''} ${s['Last Name'] || ''} ${s['Staff ID'] || ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-[#0f172a] text-slate-100 px-6 py-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <Link to="/" className="text-xs text-amber-400 hover:text-amber-300 font-medium">
                            ← Back to Command Hub
                        </Link>
                        <h1 className="text-2xl font-bold text-white mt-1">Admin & Data Maintenance</h1>
                    </div>

                    <div className="flex flex-wrap gap-2 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setSearchParams({ tab: tab.id })}
                                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === tab.id
                                        ? 'bg-amber-600 text-white shadow'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'employees' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <form
                            onSubmit={handleAddEmployee}
                            className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 h-fit"
                        >
                            <h2 className="text-lg font-bold text-white mb-4">Add New Employee</h2>

                            {statusMsg && (
                                <div
                                    className={`mb-4 p-3 rounded-lg text-xs font-medium ${statusMsg.type === 'error'
                                            ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                        }`}
                                >
                                    {statusMsg.text}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                                        Staff ID
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        value={form.staffId}
                                        onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                                        placeholder="e.g. 19298"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={form.firstName}
                                            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={form.lastName}
                                            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                                        Hire Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.hireDate}
                                        onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                                        Position / Role
                                    </label>
                                    <select
                                        value={form.Position}
                                        onChange={(e) => setForm({ ...form, Position: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="Driver">Driver</option>
                                        <option value="Bus Attendant">Bus Attendant</option>
                                        <option value="Crossing Guard">Crossing Guard</option>
                                        <option value="Cafeteria Monitor">Cafeteria Monitor</option>
                                        <option value="Transportation Office Mgr-7 Hr">Office / Staff</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
                                >
                                    + Add to Roster
                                </button>
                            </div>
                        </form>

                        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <h2 className="text-lg font-bold text-white">
                                    Current Roster ({filteredStaff.length})
                                </h2>
                                <input
                                    type="text"
                                    placeholder="Search name or ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            {loading ? (
                                <p className="text-sm text-slate-400 py-8 text-center">Loading roster...</p>
                            ) : (
                                <div className="overflow-x-auto max-h-130 overflow-y-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-xs uppercase text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-900">
                                            <tr>
                                                <th className="py-2.5 px-3">Staff ID</th>
                                                <th className="py-2.5 px-3">Name</th>
                                                <th className="py-2.5 px-3">Position</th>
                                                <th className="py-2.5 px-3">Status</th>
                                                <th className="py-2.5 px-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60">
                                            {filteredStaff.map((person) => {
                                                const isActive = String(person.Active).trim().toLowerCase() === 'yes';
                                                return (
                                                    <tr key={person['Staff ID']} className="hover:bg-slate-800/40">
                                                        <td className="py-2.5 px-3 font-mono text-xs text-slate-400">
                                                            {person['Staff ID']}
                                                        </td>
                                                        <td className="py-2.5 px-3 font-medium text-white">
                                                            {person['Last Name']}, {person['First Name']}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-300">{person.Position}</td>
                                                        <td className="py-2.5 px-3">
                                                            <span
                                                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${isActive
                                                                        ? 'bg-emerald-500/10 text-emerald-400'
                                                                        : 'bg-slate-800 text-slate-400'
                                                                    }`}
                                                            >
                                                                {isActive ? 'Yes' : 'No'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleActiveStatus(person)}
                                                                className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                                                            >
                                                                {isActive ? 'Deactivate' : 'Activate'}
                                                            </button>
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
                )}

                {activeTab === 'schools' && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center">
                        <h2 className="text-lg font-bold text-white">School Bell & Dismissal Schedule Editor</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Ready to connect to <code className="text-amber-400">school_info</code>.
                        </p>
                    </div>
                )}

                {activeTab === 'cleanup' && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center">
                        <h2 className="text-lg font-bold text-white">Database Audit & Record Cleanup</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Ready to connect for duplicate arrival upload cleanup and coverage log fixes.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}