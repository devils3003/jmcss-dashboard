import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function AbsenceForm({ onLogAdded }) {
  const [staffList, setStaffList] = useState([])
  const [runsList, setRunsList] = useState([])

  const [absenceDate, setAbsenceDate] = useState('')
  const [shift, setShift] = useState('AM')
  const [absentStaffId, setAbsentStaffId] = useState('')
  const [notes, setNotes] = useState('')

  // Dynamic list for multiple coverage split rows
  const [assignments, setAssignments] = useState([
    { missed_run_id: '', covering_staff_id: '', notes: '' }
  ])

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchDropdownData()
  }, [])

 const fetchDropdownData = async () => {
    // Fetch staff directly from Supabase
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return
    }

    if (staffData) {
      // 1. Filter text column 'Active' specifically for 'Yes'
      const activeStaff = staffData.filter(
        (person) => person.Active === 'Yes'
      )

      // 2. Sort alphabetically by Last Name, then First Name
      activeStaff.sort((a, b) => {
        const lastA = (a['Last Name'] || '').toLowerCase()
        const lastB = (b['Last Name'] || '').toLowerCase()
        if (lastA !== lastB) return lastA.localeCompare(lastB)

        const firstA = (a['First Name'] || '').toLowerCase()
        const firstB = (b['First Name'] || '').toLowerCase()
        return firstA.localeCompare(firstB)
      })

      setStaffList(activeStaff)
    }

    // Fetch Runs
    const { data: runsData, error: runsError } = await supabase
      .from('runs')
      .select('*')
      .order('run_id', { ascending: true })

    if (runsError) {
      console.error('Error fetching runs:', runsError)
    } else if (runsData) {
      setRunsList(runsData)
    }
  }

  const handleAddAssignment = () => {
    setAssignments([
      ...assignments,
      { missed_run_id: '', covering_staff_id: '', notes: '' }
    ])
  }

  const handleRemoveAssignment = (index) => {
    const updated = assignments.filter((_, i) => i !== index)
    setAssignments(updated)
  }

  const handleAssignmentChange = (index, field, value) => {
    const updated = [...assignments]
    updated[index][field] = value
    setAssignments(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // 1. Create the Parent Log
    const { data: logData, error: logError } = await supabase
      .from('coverage_logs')
      .insert([
        {
          absence_date: absenceDate,
          shift: shift,
          absent_staff_id: absentStaffId,
          notes: notes
        }
      ])
      .select()

    if (logError) {
      setMessage(`Error logging absence: ${logError.message}`)
      setLoading(false)
      return
    }

    const createdLogId = logData[0].id

    // 2. Prepare and Insert Child Coverage Assignments
    const validAssignments = assignments
      .filter((a) => a.missed_run_id || a.covering_staff_id)
      .map((a) => ({
        coverage_log_id: createdLogId,
        missed_run_id: a.missed_run_id || null,
        covering_staff_id: a.covering_staff_id || null,
        notes: a.notes || null
      }))

    if (validAssignments.length > 0) {
      const { error: assignError } = await supabase
        .from('coverage_assignments')
        .insert(validAssignments)

      if (assignError) {
        setMessage(`Absence saved, but assignment error: ${assignError.message}`)
        setLoading(false)
        return
      }
    }

    setMessage('Coverage log recorded successfully!')
    setLoading(false)

    // Reset Form
    setAbsentStaffId('')
    setNotes('')
    setAssignments([{ missed_run_id: '', covering_staff_id: '', notes: '' }])

    if (onLogAdded) onLogAdded()
  }

  // Common styles for dark mode inputs
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    marginTop: '6px',
    backgroundColor: '#1b2a4a',
    color: '#ffffff',
    border: '1px solid #3b5998',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box'
  }

  return (
    <div
      style={{
        maxWidth: '750px',
        margin: '30px auto',
        padding: '28px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
      }}
    >
      <h2 style={{ marginTop: 0, color: '#38bdf8', borderBottom: '2px solid #1e293b', paddingBottom: '12px' }}>
        Log Driver/Aide Absence & Coverage
      </h2>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '18px',
            fontWeight: '600',
            backgroundColor: message.includes('Error') ? '#7f1d1d' : '#065f46',
            color: message.includes('Error') ? '#fca5a5' : '#6ee7b7'
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '18px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: '600', color: '#cbd5e1' }}>Absence Date:</label>
            <input
              type="date"
              required
              value={absenceDate}
              onChange={(e) => setAbsenceDate(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: '600', color: '#cbd5e1' }}>Shift:</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              style={inputStyle}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
              <option value="Midday">Midday</option>
              <option value="Both">Both (All Day)</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label style={{ fontWeight: '600', color: '#cbd5e1' }}>Absent Staff Member:</label>
          <select
            required
            value={absentStaffId}
            onChange={(e) => setAbsentStaffId(e.target.value)}
            style={inputStyle}
          >
            <option value="">-- Select Absent Staff --</option>
          {staffList.map((person) => {
  const firstName = person['First Name'] || ''
  const lastName = person['Last Name'] || ''
  const fullName = `${firstName} ${lastName}`.trim()
  const role = person['Role'] || person['role'] || ''

  return (
    <option key={person['Staff ID']} value={person['Staff ID']}>
      {fullName} {role ? `(${role})` : ''}
    </option>
  )
})}
          </select>
        </div>

        <hr style={{ borderColor: '#1e293b', margin: '24px 0' }} />

        <h3 style={{ color: '#38bdf8', marginBottom: '16px' }}>Coverage Assignments (Multi-Driver Split)</h3>

        {assignments.map((item, index) => (
          <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <select
                value={item.missed_run_id}
                onChange={(e) => handleAssignmentChange(index, 'missed_run_id', e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Missed Run --</option>
                {runsList.map((run) => (
                  <option key={run.run_id} value={run.run_id}>
                    {run.run_id} (Route {run.route_id})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <select
  value={item.covering_staff_id}
  onChange={(e) => handleAssignmentChange(index, 'covering_staff_id', e.target.value)}
  style={inputStyle}
>
  <option value="">-- Covering Staff --</option>
  {staffList.map((person) => {
    const firstName = person['First Name'] || ''
    const lastName = person['Last Name'] || ''
    const fullName = `${firstName}${lastName}`.trim()
    const role = person['Role'] || person['role'] || ''

    return (
      <option key={person['Staff ID']} value={person['Staff ID']}>
        {fullName} {role ? `(${role})` : ''}
      </option>
    )
  })}
</select>
            </div>

            {assignments.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveAssignment(index)}
                style={{
                  marginTop: '6px',
                  padding: '10px 16px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  height: '42px'
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddAssignment}
          style={{
            marginTop: '8px',
            marginBottom: '24px',
            padding: '10px 18px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-block'
          }}
        >
          + Add Another Covered Run
        </button>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontWeight: '600', color: '#cbd5e1' }}>General Notes:</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
            style={inputStyle}
            placeholder="Additional details (e.g. sub bus number, special equipment details)..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 20px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease-in-out'
          }}
        >
          {loading ? 'Submitting...' : 'Save Absence & Coverage Record'}
        </button>
      </form>
    </div>
  )
}