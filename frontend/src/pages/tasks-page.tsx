import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '../components/app-shell'
import { Button, Field, Panel, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/errors'
import { formatDateTime, formatDuration } from '../lib/helpers'
import { useToast } from '../lib/toast-context'

export function TasksPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: api.listTasks, refetchInterval: 2000 })
  const { data: robots = [] } = useQuery({ queryKey: ['robots'], queryFn: api.listRobots, refetchInterval: 2000 })
  const { data: waypoints = [] } = useQuery({ queryKey: ['waypoints'], queryFn: api.listWaypoints })
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)

  const [type, setType] = useState('TRANSPORT')
  const [priority, setPriority] = useState('HIGH')
  const [sourceWaypointId, setSourceWaypointId] = useState<number | ''>('')
  const [destinationWaypointId, setDestinationWaypointId] = useState<number | ''>('')
  const [assignedRobotId, setAssignedRobotId] = useState<number | ''>('')
  const [description, setDescription] = useState('Deliver replenishment stock to destination zone.')

  useEffect(() => {
    if (!selectedTaskId && tasks.length) {
      setSelectedTaskId(tasks[0].id)
    }
  }, [selectedTaskId, tasks])

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0]

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const source = waypoints.find((waypoint) => waypoint.id === sourceWaypointId)
      const destination = waypoints.find((waypoint) => waypoint.id === destinationWaypointId)
      if (!source || !destination) {
        throw new Error('Select source and destination waypoints.')
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
        description,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] })
      showToast({
        tone: 'success',
        title: 'Task created',
        description: 'The new task was added to the queue.',
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'Task creation failed',
        description: getApiErrorMessage(error, 'The task could not be created.'),
      })
    },
  })

  const cancelTaskMutation = useMutation({
    mutationFn: async (taskId: number) => api.cancelTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['robots'] })
      showToast({
        tone: 'success',
        title: 'Task cancelled',
        description: 'The task was removed from active execution.',
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'Task cancellation failed',
        description: getApiErrorMessage(error, 'The task could not be cancelled.'),
      })
    },
  })

  const queueStats = useMemo(
    () => ({
      pending: tasks.filter((task) => task.status === 'PENDING').length,
      active: tasks.filter((task) => task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS').length,
      done: tasks.filter((task) => task.status === 'COMPLETED').length,
    }),
    [tasks],
  )

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createTaskMutation.mutateAsync()
  }

  return (
    <AppShell title="Task Management" description="Create, assign, monitor, and cancel task queue entries using the documented assignment flow." searchPlaceholder="Search tasks, IDs, or robots...">
      <div className="flex h-[calc(100vh-10.75rem)] gap-6 p-6">
        <section className="w-80">
          <Panel title="Active Queue" subtitle={`${queueStats.active} active • ${queueStats.pending} pending`} className="h-full">
            <div className="space-y-2">
              {tasks.map((task) => (
                <button
                  key={task.id}
                  className={`w-full rounded-lg px-4 py-3 text-left transition-all ${
                    selectedTask?.id === task.id ? 'border-l-2 border-primary bg-surface-container-highest' : 'bg-surface hover:bg-surface-container'
                  }`}
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-headline text-sm font-bold text-on-surface">{task.task_id}</span>
                    <StatusBadge label={task.priority} />
                  </div>
                  <p className="text-xs text-on-surface">{task.source_label} to {task.destination_label}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-on-surface-variant">
                    <span>{task.assignment_mode}</span>
                    <StatusBadge label={task.status} />
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </section>
        <section className="flex-1">
          {selectedTask ? (
            <Panel title={selectedTask.task_id} subtitle={`${selectedTask.source_label} to ${selectedTask.destination_label}`} action={<StatusBadge label={selectedTask.status} />} className="h-full">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Priority</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{selectedTask.priority}</p>
                  </div>
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Robot</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{selectedTask.assigned_robot_id ?? 'Auto'}</p>
                  </div>
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Distance</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{selectedTask.estimated_distance.toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Duration</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{formatDuration(selectedTask.estimated_duration_seconds)}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-surface px-5 py-5">
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Task Timeline</p>
                  <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                    {['PENDING', 'ASSIGNED', 'IN_PROGRESS', selectedTask.status === 'FAILED' ? 'FAILED' : selectedTask.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED'].map((step) => (
                      <div key={step} className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${selectedTask.status === step || step === 'PENDING' ? 'bg-primary' : 'bg-surface-container-highest'}`} />
                        <span>{step.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
                    <p>Created: {formatDateTime(selectedTask.created_at)}</p>
                    <p>Started: {formatDateTime(selectedTask.started_at)}</p>
                    <p>Ended: {formatDateTime(selectedTask.ended_at)}</p>
                    {selectedTask.failure_reason ? <p className="text-error">Failure reason: {selectedTask.failure_reason}</p> : null}
                  </div>
                </div>
                <Button variant="danger" onClick={() => cancelTaskMutation.mutate(selectedTask.id)} disabled={selectedTask.status === 'COMPLETED' || selectedTask.status === 'CANCELLED' || cancelTaskMutation.isPending}>
                  {cancelTaskMutation.isPending ? 'Cancelling...' : 'Cancel Task'}
                </Button>
              </div>
            </Panel>
          ) : null}
        </section>
        <section className="flex w-[22rem] flex-col gap-6">
          <Panel title="Create Task" subtitle="Auto-assign or select an idle robot">
            <form className="space-y-4" onSubmit={submit}>
              <Field label="Task Type">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={type} onChange={(event) => setType(event.target.value)}>
                  <option value="TRANSPORT">Transport</option>
                  <option value="PICK_AND_PLACE">Pick and Place</option>
                  <option value="INVENTORY_SCAN">Inventory Scan</option>
                </select>
              </Field>
              <Field label="Priority">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </Field>
              <Field label="Source Waypoint">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={sourceWaypointId} onChange={(event) => setSourceWaypointId(Number(event.target.value))}>
                  <option value="">Select source</option>
                  {waypoints.map((waypoint) => (
                    <option key={waypoint.id} value={waypoint.id}>
                      {waypoint.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Destination Waypoint">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={destinationWaypointId} onChange={(event) => setDestinationWaypointId(Number(event.target.value))}>
                  <option value="">Select destination</option>
                  {waypoints.map((waypoint) => (
                    <option key={waypoint.id} value={waypoint.id}>
                      {waypoint.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Robot Selection">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={assignedRobotId} onChange={(event) => setAssignedRobotId(event.target.value ? Number(event.target.value) : '')}>
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
                <textarea className="min-h-24 rounded border border-outline-variant/10 bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:border-primary" value={description} onChange={(event) => setDescription(event.target.value)} />
              </Field>
              <Button type="submit" className="w-full" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? 'Creating...' : 'Submit Task'}
              </Button>
            </form>
          </Panel>
          <Panel title="Queue Snapshot" subtitle="Live queue split">
            <div className="space-y-3 text-sm text-on-surface-variant">
              <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
                <span>Pending</span>
                <span className="font-bold text-on-surface">{queueStats.pending}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
                <span>Active</span>
                <span className="font-bold text-on-surface">{queueStats.active}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
                <span>Completed</span>
                <span className="font-bold text-on-surface">{queueStats.done}</span>
              </div>
            </div>
          </Panel>
        </section>
      </div>
    </AppShell>
  )
}
