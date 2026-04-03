import type { ReactNode } from 'react'

import { statusTone } from '../lib/helpers'

export function Icon({ name, className = '', filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
    >
      {name}
    </span>
  )
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl bg-surface-container-low ${className}`}>
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h3 className="font-headline text-base font-bold tracking-tight text-on-surface">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-on-surface-variant/70">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string | number
  hint: string
  tone?: 'primary' | 'tertiary' | 'error' | 'neutral'
}) {
  const toneClass =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'tertiary'
        ? 'text-tertiary'
        : tone === 'error'
          ? 'text-error'
          : 'text-on-surface'

  return (
    <div className="flex h-28 flex-col justify-between rounded-xl bg-surface-container px-4 py-4">
      <span className={`text-[10px] font-bold uppercase tracking-[0.22em] ${toneClass}`}>{label}</span>
      <div>
        <p className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">{value}</p>
        <p className="text-[11px] text-on-surface-variant/75">{hint}</p>
      </div>
    </div>
  )
}

export function StatusBadge({ label }: { label: string }) {
  const tone = statusTone(label)
  const className =
    tone === 'error'
      ? 'bg-error/10 text-error'
      : tone === 'warning'
        ? 'bg-primary/10 text-primary'
        : tone === 'primary'
          ? 'bg-primary/15 text-primary'
          : tone === 'tertiary'
            ? 'bg-tertiary/10 text-tertiary'
            : 'bg-surface-variant text-on-surface-variant'

  return <span className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${className}`}>{label.replaceAll('_', ' ')}</span>
}

export function BatteryBar({ value }: { value: number }) {
  const tone = value < 20 ? 'bg-error' : value < 50 ? 'bg-primary' : 'bg-tertiary'
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
        <span>Battery</span>
        <span className="font-bold text-on-surface">{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'solid',
  type = 'button',
  className = '',
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'solid' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  className?: string
  disabled?: boolean
}) {
  const base = 'rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed disabled:opacity-50'
  const style =
    variant === 'ghost'
      ? 'border border-outline-variant/20 bg-surface-container text-on-surface hover:bg-surface-container-highest'
      : variant === 'danger'
        ? 'bg-error-container text-error hover:opacity-90'
        : 'bg-primary text-on-primary hover:opacity-90'
  return (
    <button type={type} onClick={onClick} className={`${base} ${style} ${className}`} disabled={disabled}>
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">{label}</span>
      {children}
    </label>
  )
}

export function SegmentedTabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ label: string; value: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="inline-flex rounded-lg bg-surface px-1 py-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${
            item.value === value ? 'bg-surface-container-highest text-primary' : 'text-on-surface-variant hover:text-on-surface'
          }`}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
