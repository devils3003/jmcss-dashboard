import React, { useState } from 'react'
import AbsenceForm from './AbsenceForm'
import AbsenceReport from './components/AbsenceReport'
import ArrivalPerformanceUploader from './components/ArrivalPerformanceUploader'
import LateArrivalsReport from './components/LateArrivalsReport'
import ArrivalPerformanceManager from './components/ArrivalPerformanceManager'
import ArrivalPerformanceHeatMap from './components/ArrivalPerformanceHeatMap'

function App() {
  const [showReport, setShowReport] = useState(true)
  const [showHeatMap, setShowHeatMap] = useState(true)
  const [showManager, setShowManager] = useState(false)
  const [showLateReport, setShowLateReport] = useState(false)

  return (
    <div style={{ backgroundColor: '#020617', color: '#f8fafc', minHeight: '100vh', padding: '24px' }}>

      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#10b981', margin: '0 0 8px 0' }}>
          JMCSS Bus Driver & Aide Coverage Dashboard
        </h1>
        <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
          Transportation operations tracking, arrival performance monitoring, and run management.
        </p>
      </header>

      {/* Main Core Forms Side-by-Side */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '24px', maxWidth: '1200px', margin: '0 auto 24px auto' }}>
        <AbsenceForm />
        <ArrivalPerformanceUploader />
      </div>

      {/* Tool Cards Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Absence & Delay Report Card */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            onClick={() => setShowReport(prev => !prev)}
            style={{
              width: '100%',
              padding: '16px 20px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: 'none',
              borderBottom: showReport ? '1px solid #334155' : 'none',
              textAlign: 'left',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>📊 Absenteeism & On-Time Performance Report</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{showReport ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showReport && (
            <div style={{ padding: '20px' }}>
              <AbsenceReport />
            </div>
          )}
        </div>

        {/* Heat Map Card */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            onClick={() => setShowHeatMap(prev => !prev)}
            style={{
              width: '100%',
              padding: '16px 20px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: 'none',
              borderBottom: showHeatMap ? '1px solid #334155' : 'none',
              textAlign: 'left',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>🔥 Weekly Arrival Performance Heatmap</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{showHeatMap ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showHeatMap && (
            <div style={{ padding: '20px' }}>
              <ArrivalPerformanceHeatMap />
            </div>
          )}
        </div>

        {/* Late Arrivals Report Card */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            onClick={() => setShowLateReport(prev => !prev)}
            style={{
              width: '100%',
              padding: '16px 20px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: 'none',
              borderBottom: showLateReport ? '1px solid #334155' : 'none',
              textAlign: 'left',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>⏱️ Late Arrivals Report</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{showLateReport ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showLateReport && (
            <div style={{ padding: '20px' }}>
              <LateArrivalsReport />
            </div>
          )}
        </div>

        {/* Run Manager Card */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden' }}>
          <button
            onClick={() => setShowManager(prev => !prev)}
            style={{
              width: '100%',
              padding: '16px 20px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: 'none',
              borderBottom: showManager ? '1px solid #334155' : 'none',
              textAlign: 'left',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>⚙️ Run & Route Manager</span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{showManager ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showManager && (
            <div style={{ padding: '20px' }}>
              <ArrivalPerformanceManager />
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default App