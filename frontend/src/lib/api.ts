import axios from 'axios'

import type {
  AlertItem,
  AuthResponse,
  ChargingSession,
  ChargingStation,
  DashboardSnapshot,
  LogEntry,
  Robot,
  Task,
  User,
  Waypoint,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !error.config?.url?.includes('/auth/signup')
    ) {
      window.dispatchEvent(new CustomEvent('wrms:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export const api = {
  login: async (payload: { email: string; password: string }) => (await http.post<AuthResponse>('/auth/login', payload)).data,
  signup: async (payload: { first_name: string; last_name: string; email: string; password: string }) =>
    (await http.post<AuthResponse>('/auth/signup', payload)).data,
  logout: async () => (await http.post('/auth/logout')).data,
  me: async () => (await http.get<User>('/auth/me')).data,
  dashboardSnapshot: async () => (await http.get<DashboardSnapshot>('/dashboard/snapshot')).data,
  dashboardMap: async () => (await http.get('/dashboard/map')).data,
  listRobots: async () => (await http.get<Robot[]>('/robots')).data,
  getRobot: async (robotId: number) => (await http.get<Robot>(`/robots/${robotId}`)).data,
  createRobot: async (payload: Record<string, unknown>) => (await http.post<Robot>('/robots', payload)).data,
  updateRobot: async (robotId: number, payload: Record<string, unknown>) => (await http.patch<Robot>(`/robots/${robotId}`, payload)).data,
  resetRobot: async (robotId: number) => (await http.post<Robot>(`/robots/${robotId}/reset`)).data,
  sendRobotToCharge: async (robotId: number) => (await http.post<Robot>(`/robots/${robotId}/charge`)).data,
  manualControlRobot: async (robotId: number, payload: { direction: string; step_size?: number }) =>
    (await http.post<Robot>(`/robots/${robotId}/manual-control`, payload)).data,
  listTasks: async () => (await http.get<Task[]>('/tasks')).data,
  createTask: async (payload: Record<string, unknown>) => (await http.post<Task>('/tasks', payload)).data,
  updateTask: async (taskId: number, payload: Record<string, unknown>) => (await http.patch<Task>(`/tasks/${taskId}`, payload)).data,
  cancelTask: async (taskId: number) => (await http.post<Task>(`/tasks/${taskId}/cancel`)).data,
  listChargingStations: async () => (await http.get<ChargingStation[]>('/charging-stations')).data,
  listChargingSessions: async () => (await http.get<ChargingSession[]>('/charging-stations/sessions')).data,
  createChargingStation: async (payload: Record<string, unknown>) => (await http.post<ChargingStation>('/charging-stations', payload)).data,
  updateChargingStation: async (stationId: number, payload: Record<string, unknown>) =>
    (await http.patch<ChargingStation>(`/charging-stations/${stationId}`, payload)).data,
  deleteChargingStation: async (stationId: number) => (await http.delete(`/charging-stations/${stationId}`)).data,
  listAlerts: async () => (await http.get<AlertItem[]>('/alerts')).data,
  acknowledgeAlert: async (alertId: number) => (await http.post<AlertItem>(`/alerts/${alertId}/acknowledge`)).data,
  listLogs: async () => (await http.get<LogEntry[]>('/logs')).data,
  listUsers: async () => (await http.get<User[]>('/users')).data,
  createUser: async (payload: Record<string, unknown>) => (await http.post<User>('/users', payload)).data,
  updateUser: async (userId: number, payload: Record<string, unknown>) => (await http.patch<User>(`/users/${userId}`, payload)).data,
  deleteUser: async (userId: number) => (await http.delete(`/users/${userId}`)).data,
  profile: async () => (await http.get<User>('/users/profile')).data,
  listWaypoints: async () => (await http.get<Waypoint[]>('/waypoints')).data,
  createWaypoint: async (payload: Record<string, unknown>) => (await http.post<Waypoint>('/waypoints', payload)).data,
  updateWaypoint: async (waypointId: number, payload: Record<string, unknown>) => (await http.patch<Waypoint>(`/waypoints/${waypointId}`, payload)).data,
  deleteWaypoint: async (waypointId: number) => (await http.delete(`/waypoints/${waypointId}`)).data,
  pauseSystem: async () => (await http.post('/system/pause')).data,
  resumeSystem: async () => (await http.post('/system/resume')).data,
  emergencyStop: async () => (await http.post('/system/emergency-stop')).data,
  clearEmergency: async () => (await http.post('/system/clear-emergency')).data,
  clearRobotEmergency: async (robotId: number) => (await http.post<Robot>(`/robots/${robotId}/clear-emergency`)).data,
}

export const dashboardWebSocketUrl = () => {
  const base = API_BASE_URL.replace(/\/api$/, '')
  const url = new URL(base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = `${url.pathname.replace(/\/$/, '')}/api/dashboard/ws`
  return url.toString()
}
