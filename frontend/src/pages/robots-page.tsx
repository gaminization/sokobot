import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '../components/app-shell'
import { BatteryBar, Button, Panel, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/errors'
import { formatDateTime } from '../lib/helpers'
import { useToast } from '../lib/toast-context'

const manualDirections = ['FORWARD', 'BACKWARD', 'LEFT', 'RIGHT', 'ROTATE_LEFT', 'ROTATE_RIGHT'] as const

export function RobotsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { data: robots = [] } = useQuery({ queryKey: ['robots'], queryFn: api.listRobots, refetchInterval: 2000 })
  const { data: logs = [] } = useQuery({ queryKey: ['logs'], queryFn: api.listLogs, refetchInterval: 4000 })
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: api.listTasks, refetchInterval: 2000 })
  const [selectedRobotId, setSelectedRobotId] = useState<number | null>(null)

  useEffect(() => {
    if (!selectedRobotId && robots.length) {
      setSelectedRobotId(robots[0].id)
    }
  }, [robots, selectedRobotId])

  const selectedRobot = robots.find((robot) => robot.id === selectedRobotId) ?? robots[0]
  const activeTask = tasks.find((task) => task.assigned_robot_id === selectedRobot?.id && (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS'))
  const relevantLogs = useMemo(
    () => logs.filter((log) => log.robot_id === selectedRobot?.id).slice(0, 8),
    [logs, selectedRobot?.id],
  )

  const actionMutation = useMutation({
    mutationFn: async (payload: { type: 'reset' | 'charge' | 'manual' | 'clear'; direction?: string }) => {
      if (!selectedRobot) return null
      if (payload.type === 'reset') return api.resetRobot(selectedRobot.id)
      if (payload.type === 'clear') return api.clearRobotEmergency(selectedRobot.id)
      if (payload.type === 'charge') return api.sendRobotToCharge(selectedRobot.id)
      return api.manualControlRobot(selectedRobot.id, { direction: payload.direction ?? 'STOP', step_size: 1 })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['robots'] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      showToast({
        tone: 'success',
        title: 'Robot command applied',
        description: 'The selected robot state was updated.',
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'Robot command failed',
        description: getApiErrorMessage(error, 'The robot command could not be completed.'),
      })
    },
  })

  const canCharge = selectedRobot?.status === 'IDLE'
  const canManualControl = selectedRobot?.status === 'IDLE'
  const canClearEmergency = selectedRobot?.status === 'ERROR'

  return (
    <AppShell
      title="Robot Management"
      description="Simulated fleet telemetry, manual intervention controls, and error recovery tools for individual robots."
      searchPlaceholder="Search robots or zones..."
    >
      <div className="flex h-[calc(100vh-10.75rem)] gap-6 p-6">
        <section className="w-80">
          <Panel title="Fleet Overview" subtitle={`${robots.length} robots registered`} className="h-full">
            <div className="space-y-2">
              {robots.map((robot) => (
                <button
                  key={robot.id}
                  className={`w-full rounded-lg px-4 py-3 text-left transition-all ${
                    selectedRobot?.id === robot.id ? 'border-l-2 border-primary bg-surface-container-highest' : 'bg-surface hover:bg-surface-container'
                  }`}
                  onClick={() => setSelectedRobotId(robot.id)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-headline text-sm font-bold text-on-surface">{robot.robot_id}</span>
                    <StatusBadge label={robot.status} />
                  </div>
                  <p className="text-xs text-on-surface-variant">{robot.model}</p>
                </button>
              ))}
            </div>
          </Panel>
        </section>
        <section className="flex-1">
          {selectedRobot ? (
            <Panel title={selectedRobot.robot_id} subtitle={`Last heartbeat ${formatDateTime(selectedRobot.last_seen_at)}`} action={<StatusBadge label={selectedRobot.status} />} className="h-full">
              <div className="space-y-6">
                <BatteryBar value={selectedRobot.battery_level} />
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Coordinates</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">
                      ({selectedRobot.x}, {selectedRobot.y})
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Heading</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{Math.round(selectedRobot.heading)}deg</p>
                  </div>
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Speed</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{selectedRobot.max_speed.toFixed(1)} m/s</p>
                  </div>
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Task</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{activeTask?.task_id ?? 'None'}</p>
                  </div>
                </div>
                {selectedRobot.error_message ? (
                  <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">{selectedRobot.error_message}</div>
                ) : null}
                <div className="grid gap-4 lg:grid-cols-3">
                  {canClearEmergency ? (
                    <Button variant="ghost" onClick={() => actionMutation.mutate({ type: 'clear' })} disabled={actionMutation.isPending}>
                      {actionMutation.isPending ? 'Working...' : 'Clear Emergency'}
                    </Button>
                  ) : null}
                  <Button onClick={() => actionMutation.mutate({ type: 'reset' })} disabled={actionMutation.isPending}>
                    {actionMutation.isPending ? 'Working...' : 'Reset Robot'}
                  </Button>
                  <Button variant="ghost" onClick={() => actionMutation.mutate({ type: 'charge' })} disabled={actionMutation.isPending || !canCharge}>
                    Send To Charging
                  </Button>
                  <Button variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ['robots'] })}>
                    Refresh Telemetry
                  </Button>
                </div>
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Manual Control</p>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    {manualDirections.map((direction) => (
                      <Button key={direction} variant="ghost" onClick={() => actionMutation.mutate({ type: 'manual', direction })} disabled={actionMutation.isPending || !canManualControl}>
                        {direction.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          ) : null}
        </section>
        <section className="flex w-[22rem] flex-col gap-6">
          <Panel title="Recent Activity" subtitle="Last eight robot-related events">
            <div className="space-y-3">
              {relevantLogs.map((log) => (
                <div key={log.id} className="rounded-lg bg-surface px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{log.event_type}</p>
                    <span className="text-[11px] text-on-surface-variant">{formatDateTime(log.created_at)}</span>
                  </div>
                  <p className="text-sm text-on-surface">{log.message}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Assigned Task" subtitle="Current work packet">
            {activeTask ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-headline text-lg font-bold text-on-surface">{activeTask.task_id}</p>
                  <StatusBadge label={activeTask.status} />
                </div>
                <p className="text-sm text-on-surface-variant">
                  {activeTask.source_label} to {activeTask.destination_label}
                </p>
                <p className="text-xs text-on-surface-variant">Estimated distance {activeTask.estimated_distance.toFixed(1)} units</p>
              </div>
            ) : (
              <div className="text-sm text-on-surface-variant">No active assignment.</div>
            )}
          </Panel>
        </section>
      </div>
    </AppShell>
  )
}
