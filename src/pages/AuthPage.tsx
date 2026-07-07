import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Package, LogIn, UserPlus } from 'lucide-react'

export function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')
  
  const navigate = useNavigate()
  const { session } = useAuth()

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true })
    }
  }, [session, navigate])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email for the confirmation link.')
      }
    } catch (error: any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-split">
      {/* Left side Graphic */}
      <div className="auth-graphic">
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', color: 'white' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '20px', background: 'var(--primary)', marginBottom: '2rem', boxShadow: 'var(--shadow-glow)' }}>
            <Package size={40} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
            Inventory Pro
          </h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.8, maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
            Enterprise-grade inventory management. Streamline your inward and outward flows with ease.
          </p>
        </div>
      </div>

      {/* Right side Form */}
      <div className="auth-form-container">
        <div style={{ width: '100%', maxWidth: '400px' }}>
          
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 className="page-title" style={{ marginBottom: '0.5rem', fontSize: '2rem' }}>
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            <p className="page-subtitle">
              {isLogin ? 'Enter your details to access your dashboard.' : 'Sign up to start managing your inventory.'}
            </p>
          </div>
          
          {message && (
            <div style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--danger)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '0.75rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>{message}</div>
            </div>
          )}
          
          <form onSubmit={handleAuth}>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input 
                type="email" 
                className="form-input" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="name@company.com"
                required 
              />
            </div>
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={loading}>
              {loading ? (
                'Processing...'
              ) : (
                isLogin ? <><LogIn size={20} /> Sign in</> : <><UserPlus size={20} /> Sign up</>
              )}
            </button>
          </form>
          
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setMessage(''); setEmail(''); setPassword(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600, padding: 0 }}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  )
}
