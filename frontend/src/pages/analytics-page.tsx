import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { AppShell } from '../components/app-shell'
import { MetricCard, Panel, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { formatDuration } from '../lib/helpers'

export function AnalyticsPage() {
  const { data: snapshot } = useQuery({ queryKey: ['dashboard-snapshot'], queryFn: api.dashboardSnapshot, refetchInterval: 4000 })
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: api.listTasks, refetchInterval: 4000 })
  const { data: alerts = [] } = useQuery({ queryKey: ['alerts'], queryFn: api.listAlerts, refetchInterval: 4000 })

  const taskBreakdown = useMemo(
    () => [
      { label: 'Pending', value: tasks.filter((task) => task.status === 'PENDING').length },
      { label: 'Active', value: tasks.filter((task) => task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS').length },
      { label: 'Completed', value: tasks.filter((task) => task.status === 'COMPLETED').length },
      { label: 'Failed', value: tasks.filter((task) => task.status === 'FAILED').length },
    ],
    [tasks],
  )

  const severityBreakdown = useMemo(
    () => ['INFO', 'WARNING', 'CRITICAL'].map((severity) => ({ severity, value: alerts.filter((alert) => alert.severity === severity).length })),
    [alerts],
  )

  return (
    <AppShell title="Analytics Overview" description="Operational KPIs and warehouse performance metrics based on live fleet behavior and task completion history." searchPlaceholder="Search analytics, robots, or logs...">
      <div className="space-y-8 p-8">
        {snapshot ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Fleet Uptime" value={`${(100 - (snapshot.kpis.error_robots / Math.max(1, snapshot.robots.length)) * 100).toFixed(1)}%`} hint="Error-free fleet ratio" tone="tertiary" />
            <MetricCard label="Completed" value={snapshot.kpis.tasks_completed_today} hint="Tasks closed today" tone="primary" />
            <MetricCard label="Avg Duration" value={formatDuration(snapshot.kpis.average_task_duration_seconds)} hint="Completed task average" tone="neutral" />
            <MetricCard label="Utilization" value={`${snapshot.kpis.fleet_utilization_rate}%`} hint="Robots currently active" tone="primary" />
          </div>
        ) : null}
        <div className="grid gap-8 xl:grid-cols-[1.4fr_0.6fr]">
          <Panel title="Task Status Distribution" subtitle="Current lifecycle split">
            <div className="space-y-4">
              {taskBreakdown.map((item) => {
                const total = Math.max(1, tasks.length)
                const width = `${(item.value / total) * 100}%`
                return (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between text-sm text-on-surface">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-surface-container-highest">
                      <div className="h-full bg-primary" style={{ width }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
          <Panel title="Alert Severity" subtitle="Current active signal mix">
            <div className="space-y-3">
              {severityBreakdown.map((item) => (
                <div key={item.severity} className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
                  <StatusBadge label={item.severity} />
                  <span className="font-headline text-lg font-bold text-on-surface">{item.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <Panel title="Robot Battery Comparison" subtitle="Highest charge to lowest charge">
          <div className="grid gap-4 lg:grid-cols-2">
            {snapshot?.robots
              .slice()
              .sort((left, right) => right.battery_level - left.battery_level)
              .map((robot) => (
                <div key={robot.robot_id} className="rounded-lg bg-surface px-4 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-headline text-sm font-bold text-on-surface">{robot.robot_id}</p>
                    <StatusBadge label={robot.status} />
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
                    <div className="h-full bg-tertiary" style={{ width: `${robot.battery_level}%` }} />
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  )
}

