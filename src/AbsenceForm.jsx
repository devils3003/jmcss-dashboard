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
  const [endDate, setEndDate] = useState('')
  const getWeekdayDates = (startStr, endStr) => {
    if (!startStr) return []
    if (!endStr || endStr <= startStr) return [startStr]

    const [sY, sM, sD] = startStr.split('-').map(Number)
    const [eY, eM, eD] = endStr.split('-').map(Number)
    const current = new Date(sY, sM - 1, sD)
    const last = new Date(eY, eM - 1, eD)

    const dates = []
    while (current <= last) {
      const dayOfWeek = current.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const yyyy = current.getFullYear()
        const mm = String(current.getMonth() + 1).padStart(2, '0')
        const dd = String(current.getDate()).padStart(2, '0')
        dates.push(`${yyyy}-${mm}-${dd}`)
      }
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  const createEmptyAssignment = () => ({
    missed_run_id: '',
    covering_staff_id: '',
    notes: '',
    selected_route_id: '',
    covering_search_text: ''
  })

  const [assignments, setAssignments] = useState([
    createEmptyAssignment(),
    createEmptyAssignment()
  ])

  const getAutoRunsForRouteAndShift = (routeId, currentShift) => {
    if (!routeId || currentShift === 'Midday') return []

    const routeRuns = runsList.filter(
      (r) => String(r.route_id) === String(routeId)
    )

    const amRuns = routeRuns.filter((r) => {
      const id = String(r.run_id || '').toUpperCase()
      return !id.endsWith('_DO') && !id.includes('MID')
    })

    const pmRuns = routeRuns.filter((r) => {
      const id = String(r.run_id || '').toUpperCase()
      return id.endsWith('_DO')
    })

    if (currentShift === 'AM') return amRuns
    if (currentShift === 'PM') return pmRuns
    if (currentShift === 'Both') return [...amRuns, ...pmRuns]
    return []
  }

  const handleShiftChange = (newShift) => {
    setShift(newShift)
    const targetCount = newShift === 'Both' ? 4 : newShift === 'Midday' ? 1 : 2

    setAssignments((prev) => {
      const firstRouteId = prev[0]?.selected_route_id || ''
      const autoRuns = getAutoRunsForRouteAndShift(firstRouteId, newShift)

      if (firstRouteId && newShift !== 'Midday' && autoRuns.length > 0) {
        const rowCount = Math.max(targetCount, autoRuns.length)
        return Array.from({ length: rowCount }, (_, i) => ({
          ...createEmptyAssignment(),
          selected_route_id: firstRouteId,
          missed_run_id: autoRuns[i]?.run_id || '',
          covering_staff_id: prev[i]?.covering_staff_id || '',
          covering_search_text: prev[i]?.covering_search_text || '',
          notes: prev[i]?.notes || '',
        }))
      }

      const populatedRows = prev.filter(
        (row) =>
          row.missed_run_id ||
          row.covering_staff_id ||
          row.notes ||
          row.selected_route_id
      )

      if (populatedRows.length === 0) {
        return Array.from({ length: targetCount }, () => createEmptyAssignment())
      }

      if (populatedRows.length < targetCount) {
        const extraNeeded = targetCount - populatedRows.length
        return [
          ...populatedRows,
          ...Array.from({ length: extraNeeded }, () => createEmptyAssignment()),
        ]
      }

      return populatedRows
    })
  }

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
      const activeStaff = staffData.filter(person => person.Active === 'Yes')
      activeStaff.sort((a, b) => {
        const lastA = (a['Last Name'] || '').toLowerCase()
        const lastB = (b['Last Name'] || '').toLowerCase()
        if (lastA !== lastB) return lastA.localeCompare(lastB)
        return (a['First Name'] || '').toLowerCase().localeCompare((b['First Name'] || '').toLowerCase())
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
    const fullName = `${person['First Name'] || ''} ${person['Last Name'] || ''}`.toLowerCase()
    return fullName.includes(absentSearchText.toLowerCase())
  })

  const uniqueRouteIds = [...new Set(runsList.map(run => run.route_id).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), undefined, { numeric: true })
  )

  const handleAddAssignment = () => {
    setAssignments([...assignments, { missed_run_id: '', covering_staff_id: '', notes: '', selected_route_id: '', covering_search_text: '' }])
  }

  const handleRemoveAssignment = (index) => {
    setAssignments(assignments.filter((_, i) => i !== index))
  }

  const handleAssignmentChange = (index, field, value) => {
    const updated = [...assignments]
    updated[index] = { ...updated[index], [field]: value }

    if (field === 'selected_route_id') {
      updated[index].missed_run_id = ''

      // Auto-populate runs across rows when selecting a route in row 1 (ignored for Midday)
      if (index === 0 && value && shift !== 'Midday') {
        const autoRuns = getAutoRunsForRouteAndShift(value, shift)
        if (autoRuns.length > 0) {
          const targetCount = Math.max(updated.length, autoRuns.length)
          const nextAssignments = Array.from({ length: targetCount }, (_, i) => {
            const existing = updated[i] || createEmptyAssignment()
            return {
              ...existing,
              selected_route_id: value,
              missed_run_id: autoRuns[i]?.run_id || '',
            }
          })
          setAssignments(nextAssignments)
          return
        }
      }
    }

    setAssignments(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const targetDates = getWeekdayDates(absenceDate, endDate)
    if (targetDates.length === 0) {
      setMessage('No valid weekdays found in the selected date range.')
      setLoading(false)
      return
    }

    const logPayloads = targetDates.map((d) => ({
      absence_date: d,
      shift: shift,
      absent_staff_id: absentStaffId,
      notes: notes,
    }))

    const { data: logData, error: logError } = await supabase
      .from('coverage_logs')
      .insert(logPayloads)
      .select()

    if (logError) {
      setMessage('Error logging absence: ' + logError.message)
      setLoading(false)
      return
    }

    const populatedAssignments = assignments.filter(
      (a) => a.missed_run_id || a.covering_staff_id
    )

    if (populatedAssignments.length > 0 && logData && logData.length > 0) {
      const allAssignments = []
      logData.forEach((createdLog) => {
        populatedAssignments.forEach((a) => {
          allAssignments.push({
            coverage_log_id: createdLog.id,
            missed_run_id: a.missed_run_id || null,
            covering_staff_id: a.covering_staff_id || null,
            notes: a.notes || null,
          })
        })
      })

      const { error: assignError } = await supabase
        .from('coverage_assignments')
        .insert(allAssignments)

      if (assignError) {
        setMessage('Absence saved, but assignment error: ' + assignError.message)
        setLoading(false)
        return
      }
    }

    setMessage(
      targetDates.length > 1
        ? `Successfully logged ${targetDates.length} weekday absences (${targetDates[0]} through ${targetDates[targetDates.length - 1]})!`
        : 'Absence and coverage logged successfully!'
    )
    setAbsenceDate('')
    setEndDate('')
    setShift('AM')
    setAbsentStaffId('')
    setAbsentSearchText('')
    setNotes('')
    setAssignments([createEmptyAssignment(), createEmptyAssignment()])
    setLoading(false)
    if (onLogAdded) onLogAdded()
  }

  const inputStyle = { width: '100%', padding: '10px 12px', marginTop: '6px', backgroundColor: '#1b2a4a', color: '#ffffff', border: '1px solid #3b5998', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }
  const searchInputStyle = { ...inputStyle, backgroundColor: '#0f172a', border: '1px dashed #38bdf8', padding: '6px 10px', fontSize: '13px', marginBottom: '4px' }
  return (
    <div style={{ maxWidth: '850px', margin: '30px auto', padding: '28px', backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', fontFamily: 'Segoe UI, sans-serif' }}>
      <h2 style={{ marginTop: 0, color: '#38bdf8', borderBottom: '2px solid #1e293b', paddingBottom: '12px' }}>Log Driver/Aide Absence & Coverage</h2>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: '6px', marginBottom: '18px', fontWeight: '600', backgroundColor: message.includes('Error') ? '#7f1d1d' : '#065f46', color: message.includes('Error') ? '#fca5a5' : '#6ee7b7' }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontWeight: '600', color: '#cbd5e1' }}>
              {endDate ? 'Start Date:' : 'Absence Date:'}
            </label>
            <input
              type="date"
              required
              value={absenceDate}
              onChange={(e) => setAbsenceDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontWeight: '600', color: '#cbd5e1' }}>
              End Date <span style={{ fontWeight: '400', color: '#94a3b8' }}>(Optional - Multi-Day)</span>:
            </label>
            <input
              type="date"
              min={absenceDate || undefined}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontWeight: '600', color: '#cbd5e1' }}>Shift:</label>
            <select value={shift} onChange={(e) => handleShiftChange(e.target.value)} style={inputStyle}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
              <option value="Midday">Midday</option>
              <option value="Both">Both (All Day)</option>
            </select>
          </div>
        </div>

        {absenceDate && endDate && endDate > absenceDate && (
          <div
            style={{
              marginBottom: '16px',
              padding: '8px 12px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#fbbf24',
              fontSize: '0.85rem',
              fontWeight: '600',
            }}
          >
            Multi-Day Leave Active: Will create {getWeekdayDates(absenceDate, endDate).length} weekday entries (Mon–Fri, skipping weekends).
          </div>
        )}

        <div style={{ marginBottom: '22px', padding: '12px', background: '#1e293b', borderRadius: '8px' }}>
          <label style={{ fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Absent Staff Member:</label>
          <input type="text" placeholder="Type name to filter absent staff list..." value={absentSearchText} onChange={(e) => setAbsentSearchText(e.target.value)} style={searchInputStyle} />
          <select required value={absentStaffId} onChange={(e) => setAbsentStaffId(e.target.value)} style={inputStyle}>
            <option value="">-- Select Absent Staff ({filteredAbsentStaffList.length} found) --</option>
            {filteredAbsentStaffList.map(person => (
              <option key={person['Staff ID']} value={person['Staff ID']}>
                {(person['First Name'] || '') + ' ' + (person['Last Name'] || '')}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '22px' }}>
          <label style={{ fontWeight: '600', color: '#cbd5e1' }}>General Absence Notes:</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, height: '70px', resize: 'vertical' }} placeholder="Add extra structural details or general comments..." />
        </div>

        <h3 style={{ color: '#38bdf8', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>Coverage Assignments</h3>

        {assignments.map((assignment, index) => {
          const associatedRuns = runsList.filter(run => String(run.route_id) === String(assignment.selected_route_id))
          const filteredCoverStaff = staffList.filter(person => `${person['First Name'] || ''} ${person['Last Name'] || ''}`.toLowerCase().includes((assignment.covering_search_text || '').toLowerCase()))

          return (
            <div key={index} style={{ padding: '16px', background: '#111827', borderRadius: '8px', marginBottom: '16px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>1. Route Filter:</label>
                  <select value={assignment.selected_route_id} onChange={(e) => handleAssignmentChange(index, 'selected_route_id', e.target.value)} style={inputStyle}>
                    <option value="">-- All Routes --</option>
                    {uniqueRouteIds.map(id => <option key={id} value={id}>Route {id}</option>)}
                  </select>
                </div>

                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>2. Missed Run:</label>
                  <select value={assignment.missed_run_id} onChange={(e) => handleAssignmentChange(index, 'missed_run_id', e.target.value)} style={inputStyle}>
                    <option value="">-- Select Run --</option>
                    {(assignment.selected_route_id ? associatedRuns : runsList).map(run => (
                      <option key={run.run_id} value={run.run_id}>{run.run_name || `Run ${run.run_id}`} (Route {run.route_id})</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: '1 1 250px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8' }}>3. Covering Staff Member:</label>
                  <input type="text" placeholder="Search covering staff..." value={assignment.covering_search_text || ''} onChange={(e) => handleAssignmentChange(index, 'covering_search_text', e.target.value)} style={searchInputStyle} />
                  <select value={assignment.covering_staff_id} onChange={(e) => handleAssignmentChange(index, 'covering_staff_id', e.target.value)} style={inputStyle}>
                    <option value="">-- Select Covering Staff --</option>
                    {filteredCoverStaff.map(p => <option key={p['Staff ID']} value={p['Staff ID']}>{(p['First Name'] || '') + ' ' + (p['Last Name'] || '')}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <input type="text" placeholder="Specific assignment details/notes..." value={assignment.notes} onChange={(e) => handleAssignmentChange(index, 'notes', e.target.value)} style={inputStyle} />
                </div>
                {assignments.length > 1 && (
                  <button type="button" onClick={() => handleRemoveAssignment(index)} style={{ padding: '10px 14px', backgroundColor: '#991b1b', color: '#fca5a5', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Remove</button>
                )}
              </div>
            </div>
          )
        })}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button type="button" onClick={handleAddAssignment} style={{ padding: '10px 16px', backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #38bdf8', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>+ Add Another Assignment Row</button>
          <button type="submit" disabled={loading} style={{ padding: '12px 24px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}>
            {loading ? 'Saving Data...' : 'Submit Entry Log'}
          </button>
        </div>
      </form>
    </div>
  )
}
