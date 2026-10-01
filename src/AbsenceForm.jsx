import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function AbsenceForm({ onLogAdded }) {
  const [staffList, setStaffList] = useState([])
  const [runsList, setRunsList] = useState([])

  const [absenceDate, setAbsenceDate] = useState('')
  const [shift, setShift] = useState('AM')
  const [absentStaffId, setAbsentStaffId] = useState('')
  const [notes, setNotes] = useState('')

  const [absentSearchText, setAbsentSearchText] = useState('')

  const [assignments, setAssignments] = useState([
    { 
      missed_run_id: '', 
      covering_staff_id: '', 
      notes: '', 
      selected_route_id: '', 
      covering_search_text: '' 
    }
  ])

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchDropdownData()
  }, [])

  const fetchDropdownData = async () => {
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return
    }

    if (staffData) {
      const activeStaff = staffData.filter(
        (person) => person.Active === 'Yes'
      )

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

  const filteredAbsentStaffList = staffList.filter((person) => {
    const fName = person['First Name'] || ''
    const lName = person['Last Name'] || ''
    const fullName = (fName + ' ' + lName).toLowerCase()
    return fullName.includes(absentSearchText.toLowerCase())
  })

  const uniqueRouteIds = [...new Set(runsList.map((run) => run.route_id).filter(Boolean))].sort((a, b) => 
    String(a).localeCompare(String(b), undefined, { numeric: true })
  )

  const handleAddAssignment = () => {
    setAssignments([
      ...assignments,
      { 
        missed_run_id: '', 
        covering_staff_id: '', 
        notes: '', 
        selected_route_id: '', 
        covering_search_text: '' 
      }
    ])
  }

  const handleRemoveAssignment = (index) => {
    const updated = assignments.filter((_, i) => i !== index)
    setAssignments(updated)
  }

  const handleAssignmentChange = (index, field, value) => {
    const updated = [...assignments]
    updated[index][field] = value

    if (field === 'selected_route_id') {
      updated[index]['missed_run_id'] = ''
    }
    setAssignments(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

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
      setMessage('Error logging absence: ' + logError.message)
      setLoading(false)
      return
    }

    if (!logData || logData.length === 0) {
      setMessage('Error: No data returned from logging insertion.')
      setLoading(false)
      return
    }

    const createdLogId = logData[0].id

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
        setMessage('Absence saved, but assignment error: ' + assignError.message)
        setLoading(false)
        return
      }
    }

    setMessage('Coverage log recorded successfully!')
    setLoading(false)

    setAbsentStaffId('')
    setAbsentSearchText('')
    setNotes('')
    setAssignments([{ missed_run_id: '', covering_staff_id: '', notes: '', selected_route_id: '', covering_search_text: '' }])

    if (onLogAdded) onLogAdded()
  }

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

  const searchInputStyle = {
    ...inputStyle,
    backgroundColor: '#0f172a',
    border: '1px dashed #38bdf8',
    padding: '6px 10px',
    fontSize: '13px',
    marginBottom: '4px'
  }
  return (
    <div
      style={{
        maxWidth: '850px',
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

        <div style={{ marginBottom: '22px', padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
          <label style={{ fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
            Absent Staff Member:
          </label>
          <input
            type="text"
            placeholder="Type name to filter absent staff list..."
            value={absentSearchText}
            onChange={(e) => setAbsentSearchText(e.target.value)}
            style={searchInputStyle}
          />
          <select
            required
            value={absentStaffId}
            onChange={(e) => setAbsentStaffId(e.target.value)}
            style={inputStyle}
          >
            <option value="">-- Select Absent Staff ({filteredAbsentStaffList.length} found) --</option>
            {filteredAbsentStaffList.map((person) => {
              const firstName = person['First Name'] || ''
              const lastName = person['Last Name'] || ''
              const fullName = firstName + ' ' + lastName
              const role = person['Role'] || person['role'] || ''
              return (
                <option key={person['Staff ID']} value={person['Staff ID']}>
                  {fullName.trim()} {role ? '(' + role + ')' : ''}
                </option>
              )
            })}
          </select>
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label style={{ fontWeight: '600', color: '#cbd5e1' }}>General Notes:</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ ...inputStyle, height: '60px', resize: 'vertical' }}
            placeholder="Add general details about the shift constraints or context..."
          />
        </div>

                <hr style={{ borderColor: '#1e293b', margin: '24px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: '#38bdf8', margin: 0 }}>Coverage Assignments (Multi-Driver Split)</h3>
          <button
            type="button"
            onClick={handleAddAssignment}
            style={{
              padding: '6px 14px',
              backgroundColor: '#0369a1',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            + Add Row
          </button>
        </div>

        {assignments.map((item, index) => {
          const filteredRunsOptions = runsList.filter((run) => {
            const matchesRoute = item.selected_route_id ? String(run.route_id) === String(item.selected_route_id) : true
            
            let matchesShift = true
            const rid = (run.run_id || '').toLowerCase()
            if (shift === 'AM') matchesShift = rid.includes('am') || rid.includes('-a')
            if (shift === 'PM') matchesShift = rid.includes('pm') || rid.includes('-p')
            if (shift === 'Midday') matchesShift = rid.includes('mid') || rid.includes('-m')
            
            return matchesRoute && matchesShift
          })

          const filteredCoveringStaffList = staffList.filter((person) => {
            const fName = person['First Name'] || ''
            const lName = person['Last Name'] || ''
            const fullName = (fName + ' ' + lName).toLowerCase()
            return fullName.includes((item.covering_search_text || '').toLowerCase())
          })

          return (
            <div 
              key={index} 
              style={{ 
                padding: '14px', 
                backgroundColor: '#111e38', 
                borderRadius: '8px', 
                marginBottom: '14px',
                border: '1px solid #1e293b'
              }}
            >
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                
                <div style={{ flex: '1 1 140px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>Filter Route:</label>
                  <select
                    value={item.selected_route_id}
                    onChange={(e) => handleAssignmentChange(index, 'selected_route_id', e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">-- All Routes --</option>
                    {uniqueRouteIds.map((routeId) => (
                      <option key={routeId} value={routeId}>
                        Route {routeId}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>Missed Run Selector:</label>
                  <select
                    value={item.missed_run_id}
                    onChange={(e) => handleAssignmentChange(index, 'missed_run_id', e.target.value)}
                    style={inputStyle}
                    required={!!item.covering_staff_id}
                  >
                    <option value="">-- Choose Run ({filteredRunsOptions.length}) --</option>
                    {filteredRunsOptions.map((run) => (
                      <option key={run.run_id} value={run.run_id}>
                        {run.run_id} (Route {run.route_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: '1 1 220px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>Covering Staff Search:</label>
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={item.covering_search_text || ''}
                    onChange={(e) => handleAssignmentChange(index, 'covering_search_text', e.target.value)}
                    style={searchInputStyle}
                  />
                  <select
                    value={item.covering_staff_id}
                    onChange={(e) => handleAssignmentChange(index, 'covering_staff_id', e.target.value)}
                    style={inputStyle}
                    required={!!item.missed_run_id}
                  >
                    <option value="">-- Covering Staff --</option>
                    {filteredCoveringStaffList.map((person) => {
                      const firstName = person['First Name'] || ''
                      const lastName = person['Last Name'] || ''
                      const fullName = firstName + ' ' + lastName
                      const role = person['Role'] || person['role'] || ''
                      return (
                        <option key={person['Staff ID']} value={person['Staff ID']}>
                          {fullName.trim()} {role ? '(' + role + ')' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '20px' }}>
                  {assignments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignment(index)}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#991b1b',
                        color: '#fca5a5',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '8px' }}>
                <input
                  type="text"
                  placeholder="Optional specific notes for this run split..."
                  value={item.notes}
                  onChange={(e) => handleAssignmentChange(index, 'notes', e.target.value)}
                  style={{ ...inputStyle, padding: '6px 10px', fontSize: '13px' }}
                />
              </div>

            </div>
          )
        })}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '16px',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
          }}
        >
          {loading ? 'Saving to Database...' : 'Submit Coverage Log'}
        </button>
      </form>
    </div>
  )
}
