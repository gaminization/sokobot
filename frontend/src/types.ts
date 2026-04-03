export type UserRole = 'ADMIN' | 'OPERATOR'

export type RobotStatus = 'IDLE' | 'NAVIGATING' | 'EXECUTING' | 'CHARGING' | 'ERROR' | 'RECOVERY' | 'OFFLINE'
export type TaskStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type ChargingStationStatus = 'FREE' | 'OCCUPIED' | 'MAINTENANCE'
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at?: string | null
}

export interface Robot {
  id: number
  robot_id: string
  model: string
  battery_level: number
  status: RobotStatus
  x: number
  y: number
  heading: number
  max_speed: number
  load_capacity: number
  battery_capacity: number
  software_version: string
  error_message?: string | null
  current_station_id?: number | null
  last_seen_at?: string | null
  active_task_id?: string | null
  active_task_status?: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: number
  task_id: string
  type: string
  priority: TaskPriority
  status: TaskStatus
  source_label: string
  destination_label: string
  source_x: number
  source_y: number
  destination_x: number
  destination_y: number
  route_plan?: Array<Record<string, unknown>> | null
  route_progress_index: number
  assigned_robot_id?: number | null
  created_by_user_id?: number | null
  estimated_distance: number
  estimated_duration_seconds: number
  description?: string | null
  assignment_mode: string
  started_at?: string | null
  ended_at?: string | null
  failure_reason?: string | null
  created_at: string
  updated_at: string
}

export interface Waypoint {
  id: number
  code: string
  name: string
  type: string
  x: number
  y: number
  created_at: string
  updated_at: string
}

export interface ChargingStation {
  id: number
  station_id: string
  name: string
  status: ChargingStationStatus
  x: number
  y: number
  current_robot_id?: number | null
  created_at: string
  updated_at: string
}

export interface ChargingSession {
  id: number
  station_id: number
  robot_id: number
  battery_start: number
  battery_end?: number | null
  started_at: string
  ended_at?: string | null
}

export interface AlertItem {
  id: number
  alert_id: string
  severity: AlertSeverity
  category: string
  title: string
  message: string
  robot_id?: number | null
  task_id?: number | null
  acknowledged_by_user_id?: number | null
  acknowledged_at?: string | null
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface LogEntry {
  id: number
  event_type: string
  severity: AlertSeverity | 'ERROR'
  message: string
  details?: Record<string, unknown> | null
  user_id?: number | null
  robot_id?: number | null
  task_id?: number | null
  created_at: string
  updated_at: string
}

export interface DashboardKpis {
  active_robots: number
  idle_robots: number
  charging_robots: number
  error_robots: number
  tasks_pending: number
  tasks_in_progress: number
  tasks_completed_today: number
  fleet_utilization_rate: number
  average_task_duration_seconds: number
  average_battery_level: number
}

export interface DashboardRobot {
  robot_id: string
  status: RobotStatus
  battery_level: number
  x: number
  y: number
  heading: number
  active_task_id?: string | null
  trail: Array<{ x: number; y: number }>
}

export interface DashboardStation {
  station_id: string
  name: string
  status: ChargingStationStatus
  x: number
  y: number
  current_robot_id?: number | null
}

export interface DashboardWaypoint {
  waypoint_id: string
  name: string
  type: string
  x: number
  y: number
}

export interface DashboardTask {
  task_id: string
  status: TaskStatus
  priority: TaskPriority
  assigned_robot_id?: number | null
  route_plan: Array<Record<string, unknown>>
}

export interface DashboardSnapshot {
  generated_at: string
  kpis: DashboardKpis
  robots: DashboardRobot[]
  stations: DashboardStation[]
  waypoints: DashboardWaypoint[]
  tasks: DashboardTask[]
  alerts: Array<{
    alert_id: string
    severity: AlertSeverity
    category: string
    title: string
    message: string
    created_at: string
    robot_id?: number | null
    task_id?: number | null
    is_read: boolean
  }>
  recent_logs: Array<{
    id: number
    event_type: string
    severity: string
    message: string
    created_at: string
  }>
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}
