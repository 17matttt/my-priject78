import { useState } from 'react'
import { ArrowRight, Lock, ShieldCheck, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { BrandMark } from '../components/Layout'

type View = 'signin' | 'signup' | 'reset'

export default function AuthPage() {
  const { signIn, signUp, requestPasswordReset, cloudConfigured } = useAuth()
  const [view, setView] = useState<View>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setError(null)
    setNotice(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    if (view !== 'reset' && password.length < 8) {
      setError('Use at least 8 characters for your password.')
      return
    }
    if (view === 'signup' && name.trim().length < 2) {
      setError('Tell us your name so VAULT can personalise your space.')
      return
    }

    setBusy(true)
    try {
      if (view === 'signin') {
        await signIn(email, password)
      } else if (view === 'signup') {
        const result = await signUp(email, password, name)
        if (result.needsConfirmation) {
          setNotice('Account created. Confirm your email address to sign in.')
          setView('signin')
          setPassword('')
        }
      } else {
        await requestPasswordReset(email)
        setNotice('If that email exists, a reset link is on its way.')
        setView('signin')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const switchView = (next: View) => {
    reset()
    setView(next)
  }

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand">
          <BrandMark />
          <div>
            <div className="brand-name">VAULT</div>
            <div className="brand-tag">Your money. Your control.</div>
          </div>
        </div>

        <div className="auth-copy">
          <h1 className="auth-headline">
            Private banking
            <br />
            clarity for
            <br />
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>everyday money.</em>
          </h1>
          <p className="auth-sub">
            Track every euro, set limits that actually hold, and watch your savings goals close in.
            No noise. No fake numbers. Just your position, precisely.
          </p>
        </div>

        <div className="auth-points">
          <div className="auth-point">
            <TrendingUp size={16} />
            <div>
              <strong>Live position</strong>
              <span>Balance, savings rate and category spend recalculated on every entry.</span>
            </div>
          </div>
          <div className="auth-point">
            <ShieldCheck size={16} />
            <div>
              <strong>Row-level security</strong>
              <span>Each record is bound to your user id in the database, not just the interface.</span>
            </div>
          </div>
          <div className="auth-point">
            <Lock size={16} />
            <div>
              <strong>Yours to leave</strong>
              <span>Export everything to CSV or erase your account whenever you want.</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="brand auth-mobile-brand">
          <BrandMark />
          <div>
            <div className="brand-name">VAULT</div>
            <div className="brand-tag">Your money. Your control.</div>
          </div>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div>
            <h2 className="auth-title">
              {view === 'signin' ? 'Welcome back' : view === 'signup' ? 'Create your vault' : 'Reset access'}
            </h2>
            <p className="auth-sub" style={{ marginTop: 6 }}>
              {view === 'signin'
                ? 'Sign in to continue to your financial workspace.'
                : view === 'signup'
                  ? 'Two fields and you are in. No card, no clutter.'
                  : 'We will email you a secure link to choose a new password.'}
            </p>
          </div>

          {!cloudConfigured ? (
            <div className="auth-alert">
              <strong>Device-local mode.</strong> Supabase is not connected to this project yet, so
              your account and data stay in this browser. Add <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> in Settings → Environment variables to switch to
              real cloud sync automatically.
            </div>
          ) : null}

          {error ? <div className="auth-alert" style={{ borderColor: 'rgba(255,125,107,0.3)', color: 'var(--danger)' }}>{error}</div> : null}
          {notice ? <div className="auth-alert" style={{ borderColor: 'var(--accent-line)', color: 'var(--accent)' }}>{notice}</div> : null}

          <div className="auth-fields">
            {view === 'signup' ? (
              <label className="field">
                <span className="field-label">Full name</span>
                <input
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Alex Moreau"
                  autoComplete="name"
                />
              </label>
            ) : null}

            <label className="field">
              <span className="field-label">Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            {view !== 'reset' ? (
              <label className="field">
                <span className="field-label">Password</span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={view === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
              </label>
            ) : null}
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy
              ? 'Working…'
              : view === 'signin'
                ? 'Sign in'
                : view === 'signup'
                  ? 'Create account'
                  : 'Send reset link'}
            {!busy ? <ArrowRight /> : null}
          </button>

          <div className="auth-switch">
            {view === 'signin' ? (
              <>
                <span>New to VAULT?</span>
                <button type="button" className="link-btn" onClick={() => switchView('signup')}>
                  Create an account
                </button>
                <span style={{ marginLeft: 'auto' }}>
                  <button type="button" className="link-btn" onClick={() => switchView('reset')}>
                    Forgot password?
                  </button>
                </span>
              </>
            ) : (
              <>
                <span>Already have a vault?</span>
                <button type="button" className="link-btn" onClick={() => switchView('signin')}>
                  Sign in instead
                </button>
              </>
            )}
          </div>

          <p className="auth-foot">
            By continuing you agree to keep your own money private. VAULT never invents balances —
            every figure comes from entries you create.
          </p>
        </form>
      </main>
    </div>
  )
}
