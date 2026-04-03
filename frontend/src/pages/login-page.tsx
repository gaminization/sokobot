import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from '../lib/auth-context'
import { Button, Field, Icon, Panel } from '../components/ui'
import { getApiErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast-context'

export function LoginPage({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) {
  const { login, signup, isAuthenticated, isLoading } = useAuth()
  const { showToast } = useToast()
  const mode = initialMode
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface">
        <div className="rounded-xl bg-surface-container px-6 py-5 font-headline text-sm uppercase tracking-[0.18em]">
          Validating session...
        </div>
      </div>
    )
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'login') {
        await login({ email, password })
        showToast({
          tone: 'success',
          title: 'Signed in',
          description: 'Your command center session is ready.',
        })
      } else {
        await signup({ first_name: firstName, last_name: lastName, email, password })
        showToast({
          tone: 'success',
          title: 'Account created',
          description: 'Your operator account is ready to use.',
        })
      }
    } catch (caught) {
      const message = getApiErrorMessage(caught, 'Authentication failed.')
      setError(message)
      showToast({
        tone: 'error',
        title: mode === 'login' ? 'Sign in failed' : 'Signup failed',
        description: message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-between rounded-[2rem] bg-surface-container-low p-8 lg:p-10">
            <div>
              <Link to="/" className="mb-10 inline-flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-on-primary">
                  <Icon name="precision_manufacturing" className="text-xl" filled />
                </div>
                <div>
                  <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">Sokobot</h1>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Smart Warehouse</p>
                </div>
              </Link>
              <h2 className="max-w-xl font-headline text-4xl font-extrabold leading-tight text-on-surface lg:text-5xl">
                Calm, readable warehouse control for multi-robot operations.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-on-surface-variant">
                Monitor active robots, task execution, charging activity, alerts, and route movement from one clean command surface built for operators and admins.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-surface px-5 py-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Live Fleet</p>
                <p className="mt-3 font-headline text-3xl font-bold text-on-surface">2s</p>
                <p className="text-xs text-on-surface-variant">Simulation cadence</p>
              </div>
              <div className="rounded-2xl bg-surface px-5 py-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Access</p>
                <p className="mt-3 font-headline text-3xl font-bold text-on-surface">JWT</p>
                <p className="text-xs text-on-surface-variant">Role-secured sessions</p>
              </div>
              <div className="rounded-2xl bg-surface px-5 py-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">State</p>
                <p className="mt-3 font-headline text-3xl font-bold text-on-surface">5</p>
                <p className="text-xs text-on-surface-variant">Robot lifecycle phases</p>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-full">
              <Panel
                title={mode === 'login' ? 'Login' : 'Signup'}
                subtitle={mode === 'login' ? 'Sign in with a valid Sokobot account to access the protected command center.' : 'Create an operator account to access Sokobot.'}
              >
                <form className="space-y-5" onSubmit={submit}>
                  {mode === 'signup' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="First Name">
                        <input
                          className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                        />
                      </Field>
                      <Field label="Last Name">
                        <input
                          className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                        />
                      </Field>
                    </div>
                  ) : null}
                  <Field label="Email">
                    <input
                      className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                    />
                  </Field>
                  <Field label="Password">
                    <input
                      className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type="password"
                    />
                  </Field>
                  {mode === 'login' ? (
                    <div className="rounded-xl bg-surface px-4 py-4 text-xs text-on-surface-variant">
                      <div>Admin demo: <span className="text-on-surface">admin@wrms.com / admin123</span></div>
                      <div className="mt-1">Operator demo: <span className="text-on-surface">operator@wrms.com / operator123</span></div>
                    </div>
                  ) : null}
                  {error ? <div className="rounded border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">{error}</div> : null}
                  <div className="flex items-center justify-between">
                    <Link
                      to={mode === 'login' ? '/signup' : '/login'}
                      className="text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant hover:text-primary"
                    >
                      {mode === 'login' ? 'Need an account?' : 'Back to login'}
                    </Link>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Working...' : mode === 'login' ? 'Login' : 'Create Account'}
                    </Button>
                  </div>
                </form>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
