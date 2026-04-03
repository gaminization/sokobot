import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '../components/app-shell'
import { Button, MetricCard, Panel, StatusBadge } from '../components/ui'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/errors'
import { formatDateTime } from '../lib/helpers'
import { useToast } from '../lib/toast-context'

export function AlertsPage() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { data: alerts = [] } = useQuery({ queryKey: ['alerts'], queryFn: api.listAlerts, refetchInterval: 3000 })
  const { data: logs = [] } = useQuery({ queryKey: ['logs'], queryFn: api.listLogs, refetchInterval: 4000 })

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: number) => api.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['logs'] })
      showToast({
        tone: 'success',
        title: 'Alert acknowledged',
        description: 'The alert has been marked as read.',
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'Alert update failed',
        description: getApiErrorMessage(error, 'The alert could not be acknowledged.'),
      })
    },
  })

  return (
    <AppShell title="System Alerts" description="Critical fleet incidents, warning conditions, and the latest live system log stream." searchPlaceholder="Search logs, robot IDs, or alert types...">
      <div className="space-y-8 p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetricCard label="Critical" value={alerts.filter((alert) => alert.severity === 'CRITICAL').length} hint="Requires immediate action" tone="error" />
          <MetricCard label="Warnings" value={alerts.filter((alert) => alert.severity === 'WARNING').length} hint="Needs operator attention" tone="primary" />
          <MetricCard label="Unread" value={alerts.filter((alert) => !alert.is_read).length} hint="Pending acknowledgments" tone="tertiary" />
        </div>
        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Alert Feed" subtitle="Newest incidents first">
          <div className="space-y-3">
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className="grid gap-4 rounded-xl border border-outline-variant/10 bg-surface px-5 py-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
                  <StatusBadge label={alert.severity} />
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-bold text-on-surface">{alert.title}</p>
                      <span className="text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">{alert.category}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-on-surface-variant">{alert.message}</p>
                    <p className="mt-3 text-[11px] text-on-surface-variant">{formatDateTime(alert.created_at)}</p>
                  </div>
                  <Button variant="ghost" onClick={() => acknowledgeMutation.mutate(alert.id)} disabled={alert.is_read || acknowledgeMutation.isPending}>
                    {alert.is_read ? 'Acknowledged' : 'Acknowledge'}
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-surface px-5 py-5 text-sm text-on-surface-variant">
                No active alerts right now. Live logs are still available on the right for operator review.
              </div>
            )}
          </div>
        </Panel>
        <Panel title="Live System Log" subtitle="Timestamped events from the logs API">
          <div className="space-y-3">
            {logs.length ? (
              logs.slice(0, 12).map((log) => (
                <div key={log.id} className="rounded-xl border border-outline-variant/10 bg-surface px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StatusBadge label={log.severity} />
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{log.event_type}</p>
                    </div>
                    <span className="text-[11px] text-on-surface-variant">{formatDateTime(log.created_at)}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-on-surface">{log.message}</p>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-surface px-5 py-5 text-sm text-on-surface-variant">
                No log entries are available yet.
              </div>
            )}
          </div>
        </Panel>
        </div>
      </div>
    </AppShell>
  )
}
