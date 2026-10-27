import React, { useState } from 'react'
import AbsenceForm from './AbsenceForm'
import ArrivalPerformanceUploader from './components/ArrivalPerformanceUploader'
import LateArrivalsReport from './components/LateArrivalsReport'
import ArrivalPerformanceManager from './components/ArrivalPerformanceManager'
import ArrivalPerformanceHeatMap from './components/ArrivalPerformanceHeatMap'

function App() {
  const [showHeatMap, setShowHeatMap] = useState(true)
  const [showManager, setShowManager] = useState(false)
  const [showLateReport, setShowLateReport] = useState(false)

  return (
    <div style={{ backgroundColor: '#020617', color: '#f8fafc', minHeight: '100vh', padding: '30px 20px', fontFamily: 'sans-serif' }}>
      
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
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '24px', maxWidth: '1200px', margin: '0 auto 30px auto', alignItems: 'flex-start' }}>
        <AbsenceForm />
        <ArrivalPerformanceUploader />
      </div>

      {/* Tool Cards Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Heat Map Card (Full Width) */}
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
          <button
            onClick={() => setShowHeatMap(prev => !prev)}
            style={{
              width: '100%',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              backgroundColor: '#0f172a',
              border: 'none',
              color: '#f8fafc',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                Arrival Performance Heat Map
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Visual grid color-coded by on-time status, split/covered runs, and student impact numbers
              </div>
            </div>
            <span style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#cbd5e1' }}>
              {showHeatMap ? '▲ Hide Heat Map' : '▼ Show Heat Map'}
            </span>
          </button>

          {showHeatMap && (
            <div style={{ padding: '20px', borderTop: '1px solid #1e293b', backgroundColor: '#020617' }}>
              <ArrivalPerformanceHeatMap />
            </div>
          )}
        </div>

        {/* Manager & Late Report Tools */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          
          {/* Run Classification Manager */}
          <div style={{ flex: showManager ? '1 1 100%' : '1 1 480px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', transition: 'all 0.2s ease-in-out' }}>
            <button
              onClick={() => setShowManager(prev => !prev)}
              style={{
                width: '100%',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                backgroundColor: '#0f172a',
                border: 'none',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>
                  Run Classification & Heat Map Manager
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Tag second/covered runs or exclude non-relevant records
                </div>
              </div>
              <span style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#cbd5e1' }}>
                {showManager ? '▲ Hide Manager' : '▼ Show Manager'}
              </span>
            </button>

            {showManager && (
              <div style={{ padding: '20px', borderTop: '1px solid #1e293b', backgroundColor: '#020617' }}>
                <ArrivalPerformanceManager />
              </div>
            )}
          </div>

          {/* Late Arrivals Report */}
          <div style={{ flex: showLateReport ? '1 1 100%' : '1 1 480px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden', transition: 'all 0.2s ease-in-out' }}>
            <button
              onClick={() => setShowLateReport(prev => !prev)}
              style={{
                width: '100%',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                backgroundColor: '#0f172a',
                border: 'none',
                color: '#f8fafc',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>
                  Late Arrivals Report (&gt; 10 Minutes)
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  View and export runs delayed past bell times
                </div>
              </div>
              <span style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', color: '#cbd5e1' }}>
                {showLateReport ? '▲ Hide Report' : '▼ Show Report'}
              </span>
            </button>

            {showLateReport && (
              <div style={{ padding: '20px', borderTop: '1px solid #1e293b', backgroundColor: '#020617' }}>
                <LateArrivalsReport />
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}

export default App