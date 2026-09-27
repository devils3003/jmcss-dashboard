Import react, {useEffect, useState} from 'react'
Import {supabase} from './supabaseClient'

Function App() {
    Const [status, setStatus] = useState('Checking database connection...')
    
    UseEffect(() => {
        Async function testConnection() {
            // Pulls current Auth state to verify your keys are valid
            Const {data, error} = await supabase.auth.getSession()
            If (error){
                SetStatus('❌ Connection Error:' + error.message)
            } else {
                SetStatus('⚡ Connected to Supabase Successfully!')
            }
        }
        TestConnection()
    },[])

    Return (
        <div style={{fontfamily:'sans-serif',padding:'2rem',textAlign:"center"}}>
            <h1>My Cross-Device Application</h1>
            <p style={{fontsize: '1.2rem', color:'#4caf50'}}>{status}</p>
            </div>
        )
    }
Export default app