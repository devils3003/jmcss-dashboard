import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
    const [status, setStatus] = useState('Checking database connection...')

    useEffect(() => {
        async function testConnection() {
            // Pulls current Auth state to verify your keys are valid
            const { data, error } = await supabase.auth.getSession()
            if (error) {
                setStatus('❌ Connection Error: ' + error.message)
            } else {
                setStatus('⚡ Connected to Supabase Successfully!')
            }
        }
        testConnection()
    }, [])

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
            <h1>My Cross-Device Application</h1>
            <p style={{ fontSize: '1.2rem', color: '#4caf50' }}>{status}</p>
        </div>
    )
}

export default App