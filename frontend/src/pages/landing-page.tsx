import { Link } from 'react-router-dom'

import { Button, Icon } from '../components/ui'
import { useAuth } from '../lib/auth-context'

const features = [
  {
    title: 'Fleet Monitoring',
    body: 'Track robot status, battery, and active assignments from one command surface.',
    icon: 'dashboard',
  },
  {
    title: 'Task Allocation',
    body: 'Assign the nearest available robot while respecting queue priority and battery state.',
    icon: 'assignment',
  },
  {
    title: 'Charging Control',
    body: 'Coordinate shared charging stations and recover robots automatically when power drops.',
    icon: 'ev_station',
  },
  {
    title: 'Audit Visibility',
    body: 'Review system alerts, logs, and operator actions with a minimal readable layout.',
    icon: 'history',
  },
]

export function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const commandCenterPath = isAuthenticated ? '/app' : '/login'

  return (
    <div className="min-h-screen bg-background text-on-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-primary text-on-primary">
            <Icon name="precision_manufacturing" className="text-xl" filled />
          </div>
          <div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">Sokobot</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/70">Smart Warehouse</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/signup">
            <Button>Signup</Button>
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 pb-20 pt-8">
        <section className="rounded-[2rem] bg-surface-container-low px-8 py-14 lg:px-14 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Sokobot Platform</p>
            <h2 className="mt-5 font-headline text-5xl font-extrabold leading-tight text-on-surface lg:text-7xl">
              A minimal command center for warehouse robot operations.
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-on-surface-variant">
              Clean fleet visibility, readable task orchestration, structured alerting, and a properly grounded warehouse map for demo-ready robot management.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {isLoading ? (
                <Button disabled>Checking Session...</Button>
              ) : (
                <Link to={commandCenterPath}>
                  <Button>Open Command Center</Button>
                </Link>
              )}
              <Link to="/signup">
                <Button variant="ghost">Create Operator Account</Button>
              </Link>
            </div>
          </div>
        </section>
        <section className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl bg-surface-container-low px-6 py-6">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-surface text-primary">
                <Icon name={feature.icon} className="text-xl" />
              </div>
              <h3 className="mt-5 font-headline text-xl font-bold tracking-tight text-on-surface">{feature.title}</h3>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">{feature.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
