import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '../components/app-shell'
import { BatteryBar, Button, MetricCard, Panel, SegmentedTabs, StatusBadge } from '../components/ui'
import { WarehouseMap } from '../components/warehouse-map'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/errors'
import { formatDateTime, formatDuration } from '../lib/helpers'
import { useToast } from '../lib/toast-context'

export function DashboardPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { data: snapshot } = useQuery({
    queryKey: ['dashboard-snapshot'],
    queryFn: api.dashboardSnapshot,
    refetchInterval: 2000,
  })
  const { data: robots = [] } = useQuery({
    queryKey: ['robots'],
    queryFn: api.listRobots,
    refetchInterval: 2000,
  })
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: api.listTasks,
    refetchInterval: 2000,
  })
  const { data: logs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: api.listLogs,
    refetchInterval: 4000,
  })
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null)
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null)
  const [tab, setTab] = useState<'overview' | 'alerts' | 'logs'>('overview')

  useEffect(() => {
    if (!selectedRobotId && robots.length) {
      setSelectedRobotId(robots[0].robot_id)
    }
  }, [robots, selectedRobotId])

  const selectedRobot = useMemo(
    () => robots.find((robot) => robot.robot_id === selectedRobotId) ?? robots[0],
    [robots, selectedRobotId],
  )

  const selectedTask = useMemo(
    () =>
      tasks.find((task) => task.task_id === selectedRobot?.active_task_id) ??
      tasks.find((task) => task.status === 'IN_PROGRESS' || task.status === 'ASSIGNED'),
    [selectedRobot?.active_task_id, tasks],
  )

  const selectedWaypoint = useMemo(
    () => snapshot?.waypoints.find((waypoint) => waypoint.waypoint_id === selectedWaypointId) ?? snapshot?.waypoints[0],
    [selectedWaypointId, snapshot?.waypoints],
  )

  const robotAlerts = useMemo(
    () =>
      snapshot?.alerts.filter((alert) => {
        if (!selectedRobot) return false
        return selectedTask?.id ? alert.task_id === selectedTask.id || alert.robot_id === selectedRobot.id : alert.robot_id === selectedRobot.id
      }) ?? [],
    [selectedRobot, selectedTask?.id, snapshot?.alerts],
  )

  const robotLogs = useMemo(
    () => logs.filter((log) => log.robot_id === selectedRobot?.id || (selectedTask && log.task_id === selectedTask.id)).slice(0, 8),
    [logs, selectedRobot?.id, selectedTask],
  )

  const systemMutation = useMutation({
    mutationFn: async (action: 'pause' | 'resume' | 'emergency' | 'clear') => {
      if (action === 'pause') return api.pauseSystem()
      if (action === 'resume') return api.resumeSystem()
      if (action === 'clear') return api.clearEmergency()
      return api.emergencyStop()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] })
      queryClient.invalidateQueries({ queryKey: ['robots'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      showToast({
        tone: 'success',
        title: 'System command applied',
        description: 'The fleet control state has been updated.',
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'System command failed',
        description: getApiErrorMessage(error, 'The command could not be applied.'),
      })
    },
  })

  const robotActionMutation = useMutation({
    mutationFn: async (action: 'clear' | 'reset') => {
      if (!selectedRobot) {
        throw new Error('No robot selected.')
      }
      if (action === 'clear') return api.clearRobotEmergency(selectedRobot.id)
      return api.resetRobot(selectedRobot.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] })
      queryClient.invalidateQueries({ queryKey: ['robots'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      showToast({
        tone: 'success',
        title: 'Robot recovered',
        description: 'The selected robot has been returned to idle.',
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'Robot command failed',
        description: getApiErrorMessage(error, 'The robot could not be recovered.'),
      })
    },
  })

  if (!snapshot) {
    return (
      <AppShell title="Dashboard" description="Loading fleet state." searchPlaceholder="Search fleet, tasks, or logs...">
        <div className="p-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-surface-container-low" />
            ))}
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Fleet Dashboard"
      description="A cleaned-up command layout focused on active robots, the selected work context, and the warehouse floor map."
      searchPlaceholder="Search fleet, tasks, or logs..."
    >
      <div className="space-y-8 p-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active Robots" value={snapshot.kpis.active_robots} hint="Currently navigating or executing" tone="tertiary" />
          <MetricCard label="Tasks Running" value={snapshot.kpis.tasks_in_progress} hint="Assigned and in progress" tone="primary" />
          <MetricCard label="Errors" value={snapshot.kpis.error_robots} hint="Robots requiring recovery" tone="error" />
          <MetricCard label="Queue Size" value={snapshot.kpis.tasks_pending} hint="Pending tasks waiting for assignment" tone="primary" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <Panel title="Robots" subtitle="Compact fleet list with current state">
            <div className="space-y-2">
              {robots.map((robot) => (
                <button
                  key={robot.id}
                  className={`w-full rounded-xl px-4 py-3 text-left transition-colors ${
                    selectedRobot?.id === robot.id ? 'bg-surface text-on-surface' : 'bg-surface-container hover:bg-surface'
                  }`}
                  onClick={() => setSelectedRobotId(robot.robot_id)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-headline text-sm font-bold tracking-tight text-on-surface">{robot.robot_id}</span>
                    <StatusBadge label={robot.status} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                    <span>{robot.model}</span>
                    <span>{Math.round(robot.battery_level)}%</span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          {selectedRobot ? (
            <Panel
              title={selectedRobot.robot_id}
              subtitle={`Selected robot • ${selectedRobot.model}`}
              action={
                <div className="flex items-center gap-2">
                  <StatusBadge label={selectedRobot.status} />
                </div>
              }
            >
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <SegmentedTabs
                    items={[
                      { label: 'Overview', value: 'overview' },
                      { label: 'Alerts', value: 'alerts' },
                      { label: 'Logs', value: 'logs' },
                    ]}
                    value={tab}
                    onChange={(value) => setTab(value as 'overview' | 'alerts' | 'logs')}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" onClick={() => systemMutation.mutate('pause')} disabled={systemMutation.isPending || snapshot.kpis.error_robots > 0}>
                      Pause
                    </Button>
                    <Button variant="ghost" onClick={() => systemMutation.mutate('resume')} disabled={systemMutation.isPending || snapshot.kpis.error_robots > 0}>
                      Resume
                    </Button>
                    {selectedRobot.status === 'ERROR' ? (
                      <>
                        <Button variant="ghost" onClick={() => robotActionMutation.mutate('clear')} disabled={robotActionMutation.isPending}>
                          Clear Emergency
                        </Button>
                        <Button onClick={() => robotActionMutation.mutate('reset')} disabled={robotActionMutation.isPending}>
                          Reset Robot
                        </Button>
                      </>
                    ) : null}
                    {snapshot.kpis.error_robots > 0 ? (
                      <Button variant="ghost" onClick={() => systemMutation.mutate('clear')} disabled={systemMutation.isPending}>
                        Clear Fleet Emergency
                      </Button>
                    ) : null}
                    <Button variant="danger" onClick={() => systemMutation.mutate('emergency')} disabled={systemMutation.isPending}>
                      E-Stop
                    </Button>
                  </div>
                </div>

                {tab === 'overview' ? (
                  <div className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="space-y-5 rounded-2xl bg-surface px-5 py-5">
                        <BatteryBar value={selectedRobot.battery_level} />
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Position</p>
                            <p className="mt-2 font-headline text-xl font-bold tracking-tight text-on-surface">
                              ({selectedRobot.x}, {selectedRobot.y})
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Heading</p>
                            <p className="mt-2 font-headline text-xl font-bold tracking-tight text-on-surface">{Math.round(selectedRobot.heading)}deg</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Task</p>
                            <p className="mt-2 font-headline text-xl font-bold tracking-tight text-on-surface">{selectedRobot.active_task_id ?? 'Idle'}</p>
                          </div>
                        </div>
                        {selectedRobot.error_message ? <div className="text-sm text-error">{selectedRobot.error_message}</div> : null}
                      </div>

                      <div className="rounded-2xl bg-surface px-5 py-5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Selected Task</p>
                        {selectedTask ? (
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="font-headline text-2xl font-bold tracking-tight text-on-surface">{selectedTask.task_id}</p>
                              <StatusBadge label={selectedTask.status} />
                            </div>
                            <p className="text-sm text-on-surface-variant">
                              {selectedTask.source_label} to {selectedTask.destination_label}
                            </p>
                            <div className="grid gap-3 text-sm text-on-surface-variant sm:grid-cols-2">
                              <p>Priority: <span className="text-on-surface">{selectedTask.priority}</span></p>
                              <p>Mode: <span className="text-on-surface">{selectedTask.assignment_mode}</span></p>
                              <p>Distance: <span className="text-on-surface">{selectedTask.estimated_distance.toFixed(1)}</span></p>
                              <p>ETA: <span className="text-on-surface">{formatDuration(selectedTask.estimated_duration_seconds)}</span></p>
                              <p>Started: <span className="text-on-surface">{formatDateTime(selectedTask.started_at)}</span></p>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm text-on-surface-variant">No active task is assigned to this robot.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {tab === 'alerts' ? (
                  <div className="space-y-3">
                    {robotAlerts.length ? (
                      robotAlerts.map((alert) => (
                        <div key={alert.alert_id} className="rounded-xl bg-surface px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-headline text-lg font-bold tracking-tight text-on-surface">{alert.title}</p>
                              <p className="mt-1 text-sm text-on-surface-variant">{alert.message}</p>
                            </div>
                            <StatusBadge label={alert.severity} />
                          </div>
                          <p className="mt-3 text-[11px] text-on-surface-variant">{formatDateTime(alert.created_at)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl bg-surface px-4 py-4 text-sm text-on-surface-variant">No recent alerts for the selected context.</div>
                    )}
                  </div>
                ) : null}

                {tab === 'logs' ? (
                  <div className="space-y-3">
                    {robotLogs.length ? (
                      robotLogs.map((log) => (
                        <div key={log.id} className="rounded-xl bg-surface px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{log.event_type}</p>
                            <p className="text-[11px] text-on-surface-variant">{formatDateTime(log.created_at)}</p>
                          </div>
                          <p className="mt-2 text-sm text-on-surface">{log.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl bg-surface px-4 py-4 text-sm text-on-surface-variant">No recent logs for the selected robot.</div>
                    )}
                  </div>
                ) : null}
              </div>
            </Panel>
          ) : null}
        </section>

        <section className="space-y-4">
          <WarehouseMap
            snapshot={snapshot}
            selectedRobotId={selectedRobot?.robot_id ?? null}
            selectedWaypointId={selectedWaypoint?.waypoint_id ?? null}
            onSelectRobot={setSelectedRobotId}
            onSelectWaypoint={setSelectedWaypointId}
          />
          {selectedWaypoint ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-surface-container-low px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Waypoint</p>
                <p className="mt-2 font-headline text-lg font-bold text-on-surface">{selectedWaypoint.name}</p>
              </div>
              <div className="rounded-xl bg-surface-container-low px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Identifier</p>
                <p className="mt-2 font-headline text-lg font-bold text-on-surface">{selectedWaypoint.waypoint_id}</p>
              </div>
              <div className="rounded-xl bg-surface-container-low px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Type</p>
                <p className="mt-2 font-headline text-lg font-bold text-on-surface">{selectedWaypoint.type}</p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  )
}
