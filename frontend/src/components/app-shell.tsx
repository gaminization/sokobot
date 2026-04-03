import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { api } from '../lib/api'
import { useAuth } from '../lib/auth-context'
import { downloadJson } from '../lib/download'
import { getApiErrorMessage } from '../lib/errors'
import { formatName } from '../lib/helpers'
import { useToast } from '../lib/toast-context'
import { Button, Field, Icon, Panel } from './ui'

const navigation = [
  { to: '/app/dashboard', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/app/robots', label: 'Robots', icon: 'precision_manufacturing' },
  { to: '/app/tasks', label: 'Tasks', icon: 'assignment' },
  { to: '/app/waypoints', label: 'Waypoints', icon: 'route' },
  { to: '/app/charging-stations', label: 'Charging Stations', icon: 'ev_station' },
  { to: '/app/analytics', label: 'Analytics', icon: 'analytics' },
  { to: '/app/alerts', label: 'Alerts', icon: 'notifications' },
  { to: '/app/admin', label: 'Admin', icon: 'settings' },
]

export function AppShell({
  title,
  description,
  searchPlaceholder: _searchPlaceholder,
  children,
}: {
  title: string
  description: string
  searchPlaceholder: string
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [type, setType] = useState('TRANSPORT')
  const [priority, setPriority] = useState('HIGH')
  const [sourceWaypointId, setSourceWaypointId] = useState<number | ''>('')
  const [destinationWaypointId, setDestinationWaypointId] = useState<number | ''>('')
  const [assignedRobotId, setAssignedRobotId] = useState<number | ''>('')
  const [taskDescription, setTaskDescription] = useState('Dispatch stock between warehouse zones.')

  const { data: waypoints = [], isLoading: isLoadingWaypoints } = useQuery({
    queryKey: ['waypoints'],
    queryFn: api.listWaypoints,
    enabled: isCreateTaskOpen,
  })
  const { data: robots = [], isLoading: isLoadingRobots } = useQuery({
    queryKey: ['robots'],
    queryFn: api.listRobots,
    enabled: isCreateTaskOpen,
  })

  const resetTaskDraft = () => {
    setType('TRANSPORT')
    setPriority('HIGH')
    setSourceWaypointId('')
    setDestinationWaypointId('')
    setAssignedRobotId('')
    setTaskDescription('Dispatch stock between warehouse zones.')
  }

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const source = waypoints.find((waypoint) => waypoint.id === sourceWaypointId)
      const destination = waypoints.find((waypoint) => waypoint.id === destinationWaypointId)
      if (!source || !destination) {
        throw new Error('Select source and destination waypoints before submitting.')
      }

      return api.createTask({
        type,
        priority,
        source_waypoint_id: source.id,
        destination_waypoint_id: destination.id,
        source_label: source.name,
        source_x: source.x,
        source_y: source.y,
        destination_label: destination.name,
        destination_x: destination.x,
        destination_y: destination.y,
        assigned_robot_id: assignedRobotId || null,
        description: taskDescription,
      })
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['robots'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      setIsCreateTaskOpen(false)
      resetTaskDraft()
      showToast({
        tone: 'success',
        title: 'Task created',
        description: `${task.task_id} was added to the queue.`,
      })
      if (!location.pathname.startsWith('/app/tasks')) {
        navigate('/app/tasks')
      }
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'Task creation failed',
        description: getApiErrorMessage(error, 'The task could not be created.'),
      })
    },
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (location.pathname.startsWith('/app/tasks')) {
        return { filename: 'sokobot-tasks.json', payload: await api.listTasks(), label: 'task queue' }
      }
      if (location.pathname.startsWith('/app/waypoints')) {
        return { filename: 'sokobot-waypoints.json', payload: await api.listWaypoints(), label: 'warehouse waypoints' }
      }
      if (location.pathname.startsWith('/app/robots')) {
        return { filename: 'sokobot-robots.json', payload: await api.listRobots(), label: 'robot fleet' }
      }
      if (location.pathname.startsWith('/app/charging-stations')) {
        return { filename: 'sokobot-charging-stations.json', payload: await api.listChargingStations(), label: 'charging stations' }
      }
      if (location.pathname.startsWith('/app/alerts')) {
        return { filename: 'sokobot-alerts.json', payload: await api.listAlerts(), label: 'alerts feed' }
      }
      return { filename: 'sokobot-dashboard.json', payload: await api.dashboardSnapshot(), label: 'dashboard snapshot' }
    },
    onSuccess: ({ filename, payload, label }) => {
      downloadJson(filename, payload)
      showToast({
        tone: 'success',
        title: 'Export complete',
        description: `Downloaded the current ${label}.`,
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'Export failed',
        description: getApiErrorMessage(error, 'The export could not be generated.'),
      })
    },
  })

  const closeCreateTask = () => {
    setIsCreateTaskOpen(false)
    resetTaskDraft()
  }

  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createTaskMutation.mutateAsync()
  }

  const handleLogout = async () => {
    await logout()
    showToast({
      tone: 'info',
      title: 'Signed out',
      description: 'Your session has been closed.',
    })
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-surface-container-low px-4 py-6">
        <div className="mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-on-primary">
              <Icon name="precision_manufacturing" className="text-lg" filled />
            </div>
            <div>
              <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface">Sokobot</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary/60">Smart Warehouse</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2.5 font-headline text-sm tracking-tight transition-all ${
                  isActive
                    ? 'border-r-2 border-primary bg-surface-container text-primary font-bold'
                    : 'text-on-surface/60 hover:bg-surface-container hover:text-on-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} className="text-lg" filled={isActive} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-outline-variant/20 px-2 pt-6">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-container px-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest text-primary">
              <Icon name="account_circle" className="text-2xl" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-on-surface">{formatName(user)}</p>
              <p className="truncate text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">{user?.role ?? 'GUEST'}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => void handleLogout()}>
            Sign Out
          </Button>
        </div>
      </aside>
      <header className="fixed right-0 top-0 z-30 flex h-16 w-[calc(100%-16rem)] items-center justify-end bg-background/90 px-8 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
          </Button>
          <Button onClick={() => setIsCreateTaskOpen(true)}>Create Task</Button>
          <div className="mx-2 h-6 w-px bg-outline-variant/20" />
          <button
            type="button"
            className="text-on-surface-variant transition-colors hover:text-primary"
            onClick={() => navigate('/app/alerts')}
            aria-label="Open alerts"
          >
            <Icon name="notifications" className="text-xl" />
          </button>
          <button
            type="button"
            className="text-on-surface-variant transition-colors hover:text-primary"
            onClick={() => navigate(user?.role === 'ADMIN' ? '/app/admin' : '/app/dashboard')}
            aria-label="Open account"
          >
            <Icon name="account_circle" className="text-xl" />
          </button>
        </div>
      </header>
      <main className="ml-64 min-h-screen pt-16">
        <div className="px-8 py-7">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Command Center</span>
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">{description}</p>
        </div>
        {children}
      </main>
      {isCreateTaskOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl">
            <Panel
              title="Create Task"
              subtitle="Dispatch a real task through the backend allocation flow."
              action={
                <button type="button" className="text-on-surface-variant transition-colors hover:text-on-surface" onClick={closeCreateTask}>
                  <Icon name="close" className="text-lg" />
                </button>
              }
            >
              <form className="space-y-4" onSubmit={submitTask}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Task Type">
                    <select
                      className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
                      value={type}
                      onChange={(event) => setType(event.target.value)}
                    >
                      <option value="TRANSPORT">Transport</option>
                      <option value="PICK_AND_PLACE">Pick and Place</option>
                      <option value="INVENTORY_SCAN">Inventory Scan</option>
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select
                      className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
                      value={priority}
                      onChange={(event) => setPriority(event.target.value)}
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </Field>
                  <Field label="Source Waypoint">
                    <select
                      className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
                      value={sourceWaypointId}
                      onChange={(event) => setSourceWaypointId(event.target.value ? Number(event.target.value) : '')}
                      disabled={isLoadingWaypoints}
                    >
                      <option value="">Select source</option>
                      {waypoints.map((waypoint) => (
                        <option key={waypoint.id} value={waypoint.id}>
                          {waypoint.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Destination Waypoint">
                    <select
                      className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
                      value={destinationWaypointId}
                      onChange={(event) => setDestinationWaypointId(event.target.value ? Number(event.target.value) : '')}
                      disabled={isLoadingWaypoints}
                    >
                      <option value="">Select destination</option>
                      {waypoints.map((waypoint) => (
                        <option key={waypoint.id} value={waypoint.id}>
                          {waypoint.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Robot Selection">
                  <select
                    className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary"
                    value={assignedRobotId}
                    onChange={(event) => setAssignedRobotId(event.target.value ? Number(event.target.value) : '')}
                    disabled={isLoadingRobots}
                  >
                    <option value="">Auto Assign</option>
                    {robots
                      .filter((robot) => robot.status === 'IDLE')
                      .map((robot) => (
                        <option key={robot.id} value={robot.id}>
                          {robot.robot_id}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Description">
                  <textarea
                    className="min-h-24 rounded border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:border-primary"
                    value={taskDescription}
                    onChange={(event) => setTaskDescription(event.target.value)}
                  />
                </Field>
                <div className="flex items-center justify-end gap-3">
                  <Button variant="ghost" onClick={closeCreateTask}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTaskMutation.isPending}>
                    {createTaskMutation.isPending ? 'Creating...' : 'Submit Task'}
                  </Button>
                </div>
              </form>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  )
}
