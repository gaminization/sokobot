import type { AlertSeverity, ChargingStationStatus, RobotStatus, TaskPriority, TaskStatus, User } from '../types'

export function statusTone(status: RobotStatus | TaskStatus | ChargingStationStatus | AlertSeverity | string) {
  if (['ERROR', 'FAILED', 'CRITICAL'].includes(status)) return 'error'
  if (['CHARGING', 'WARNING', 'OCCUPIED'].includes(status)) return 'warning'
  if (['EXECUTING', 'NAVIGATING', 'ASSIGNED', 'IN_PROGRESS'].includes(status)) return 'primary'
  if (['COMPLETED', 'FREE', 'INFO', 'IDLE', 'RECOVERY'].includes(status)) return 'tertiary'
  return 'neutral'
}

export function priorityTone(priority: TaskPriority) {
  if (priority === 'HIGH') return 'error'
  if (priority === 'MEDIUM') return 'primary'
  return 'tertiary'
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString()
}

export function formatDuration(seconds: number) {
  if (!seconds) return '0m'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export function formatName(user?: User | null) {
  if (!user) return 'Guest'
  return `${user.first_name} ${user.last_name}`
}

