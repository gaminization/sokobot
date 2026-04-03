import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '../components/app-shell'
import { BatteryBar, Button, Field, Icon, Panel, StatusBadge } from '../components/ui'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/errors'
import { formatDateTime } from '../lib/helpers'
import { useToast } from '../lib/toast-context'
import type { ChargingStation } from '../types'

function StationModal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl">
        <Panel
          title={title}
          subtitle={subtitle}
          action={
            <button type="button" className="text-on-surface-variant transition-colors hover:text-on-surface" onClick={onClose}>
              <Icon name="close" className="text-lg" />
            </button>
          }
        >
          {children}
        </Panel>
      </div>
    </div>
  )
}

export function ChargingStationsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data: stations = [] } = useQuery({ queryKey: ['stations'], queryFn: api.listChargingStations, refetchInterval: 2000 })
  const { data: sessions = [] } = useQuery({ queryKey: ['charging-sessions'], queryFn: api.listChargingSessions, refetchInterval: 4000 })
  const { data: robots = [] } = useQuery({ queryKey: ['robots'], queryFn: api.listRobots, refetchInterval: 2000 })
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<ChargingStation | null>(null)
  const [deletingStation, setDeletingStation] = useState<ChargingStation | null>(null)

  const [stationId, setStationId] = useState('CHARGER-D01')
  const [stationName, setStationName] = useState('Charging D01')
  const [stationStatus, setStationStatus] = useState<'FREE' | 'MAINTENANCE'>('FREE')
  const [stationX, setStationX] = useState(46)
  const [stationY, setStationY] = useState(78)

  useEffect(() => {
    if (!selectedStationId && stations.length) {
      setSelectedStationId(stations[0].id)
    }
  }, [selectedStationId, stations])

  const selectedStation = stations.find((station) => station.id === selectedStationId) ?? stations[0]
  const assignedRobot = robots.find((robot) => robot.id === selectedStation?.current_robot_id)
  const recentSessions = useMemo(
    () => sessions.filter((session) => session.station_id === selectedStation?.id).slice(0, 6),
    [selectedStation?.id, sessions],
  )

  const refreshStations = () => {
    queryClient.invalidateQueries({ queryKey: ['stations'] })
    queryClient.invalidateQueries({ queryKey: ['charging-sessions'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] })
  }

  const createStationMutation = useMutation({
    mutationFn: async () => api.createChargingStation({ station_id: stationId, name: stationName, status: stationStatus, x: stationX, y: stationY }),
    onSuccess: () => {
      refreshStations()
      setIsCreateModalOpen(false)
      showToast({ tone: 'success', title: 'Station created', description: 'The new charging station is available on the warehouse floor.' })
    },
    onError: (error) => {
      showToast({ tone: 'error', title: 'Station creation failed', description: getApiErrorMessage(error, 'The charging station could not be created.') })
    },
  })

  const updateStationMutation = useMutation({
    mutationFn: async () => {
      if (!editingStation) throw new Error('No charging station selected.')
      return api.updateChargingStation(editingStation.id, { name: stationName, status: stationStatus, x: stationX, y: stationY })
    },
    onSuccess: () => {
      refreshStations()
      setEditingStation(null)
      showToast({ tone: 'success', title: 'Station updated', description: 'The charging station details were saved.' })
    },
    onError: (error) => {
      showToast({ tone: 'error', title: 'Station update failed', description: getApiErrorMessage(error, 'The charging station could not be updated.') })
    },
  })

  const deleteStationMutation = useMutation({
    mutationFn: async () => {
      if (!deletingStation) throw new Error('No charging station selected.')
      return api.deleteChargingStation(deletingStation.id)
    },
    onSuccess: () => {
      refreshStations()
      setDeletingStation(null)
      showToast({ tone: 'success', title: 'Station deleted', description: 'The charging station was removed.' })
    },
    onError: (error) => {
      showToast({ tone: 'error', title: 'Station deletion failed', description: getApiErrorMessage(error, 'The charging station could not be deleted.') })
    },
  })

  const openCreateModal = () => {
    setStationId('CHARGER-D01')
    setStationName('Charging D01')
    setStationStatus('FREE')
    setStationX(46)
    setStationY(78)
    setIsCreateModalOpen(true)
  }

  const openEditModal = (station: ChargingStation) => {
    setEditingStation(station)
    setStationId(station.station_id)
    setStationName(station.name)
    setStationStatus(station.status === 'OCCUPIED' ? 'FREE' : station.status)
    setStationX(station.x)
    setStationY(station.y)
  }

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createStationMutation.mutateAsync()
  }

  const submitUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await updateStationMutation.mutateAsync()
  }

  return (
    <AppShell
      title="Charging Station Management"
      description="Station occupancy, charging history, and full charging station configuration across shared dock infrastructure."
      searchPlaceholder="Search stations or assets..."
    >
      <div className="flex h-[calc(100vh-10.75rem)] gap-6 p-6">
        <section className="w-80">
          <Panel
            title="Stations"
            subtitle={`${stations.filter((station) => station.status === 'FREE').length} free • ${stations.length} total`}
            action={user?.role === 'ADMIN' ? <Button onClick={openCreateModal}>Add Station</Button> : undefined}
            className="h-full"
          >
            <div className="space-y-2">
              {stations.map((station) => (
                <button
                  key={station.id}
                  className={`w-full rounded-lg px-4 py-3 text-left transition-all ${
                    selectedStation?.id === station.id ? 'border-l-2 border-primary bg-surface-container-highest' : 'bg-surface hover:bg-surface-container'
                  }`}
                  onClick={() => setSelectedStationId(station.id)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-headline text-sm font-bold text-on-surface">{station.name}</span>
                    <StatusBadge label={station.status} />
                  </div>
                  <p className="text-xs text-on-surface-variant">{station.station_id}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    ({station.x}, {station.y})
                  </p>
                </button>
              ))}
            </div>
          </Panel>
        </section>
        <section className="flex-1">
          {selectedStation ? (
            <Panel
              title={selectedStation.name}
              subtitle={`${selectedStation.station_id} • coordinates (${selectedStation.x}, ${selectedStation.y})`}
              action={<StatusBadge label={selectedStation.status} />}
              className="h-full"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Occupancy</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{assignedRobot?.robot_id ?? 'None'}</p>
                  </div>
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Sessions</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{recentSessions.length}</p>
                  </div>
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Robot Battery</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{assignedRobot ? `${Math.round(assignedRobot.battery_level)}%` : 'N/A'}</p>
                  </div>
                </div>
                {user?.role === 'ADMIN' ? (
                  <div className="flex flex-wrap gap-3">
                    <Button variant="ghost" onClick={() => openEditModal(selectedStation)}>
                      Edit Station
                    </Button>
                    <Button variant="danger" onClick={() => setDeletingStation(selectedStation)} disabled={selectedStation.current_robot_id != null}>
                      Delete Station
                    </Button>
                  </div>
                ) : null}
                {assignedRobot ? (
                  <div className="rounded-xl bg-surface px-5 py-5">
                    <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Assigned Unit Telemetry</p>
                    <p className="mb-3 text-lg font-bold text-on-surface">{assignedRobot.robot_id}</p>
                    <BatteryBar value={assignedRobot.battery_level} />
                  </div>
                ) : (
                  <div className="rounded-xl bg-surface px-5 py-5 text-sm text-on-surface-variant">No robot is currently docked at this station.</div>
                )}
              </div>
            </Panel>
          ) : null}
        </section>
        <section className="flex w-[22rem] flex-col gap-6">
          <Panel title="Charging Sessions" subtitle="Recent usage history">
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="rounded-lg bg-surface px-4 py-3">
                  <p className="text-sm font-bold text-on-surface">Robot #{session.robot_id}</p>
                  <p className="text-xs text-on-surface-variant">
                    Start {Math.round(session.battery_start)}% • End {session.battery_end ? `${Math.round(session.battery_end)}%` : 'charging'}
                  </p>
                  <p className="mt-2 text-[11px] text-on-surface-variant">{formatDateTime(session.started_at)}</p>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Fleet Charging Load" subtitle="Current robot states">
            <div className="space-y-3">
              {robots
                .filter((robot) => robot.status === 'CHARGING')
                .map((robot) => (
                  <div key={robot.id} className="rounded-lg bg-surface px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-on-surface">{robot.robot_id}</p>
                      <StatusBadge label={robot.status} />
                    </div>
                    <BatteryBar value={robot.battery_level} />
                  </div>
                ))}
            </div>
          </Panel>
        </section>
      </div>

      {isCreateModalOpen ? (
        <StationModal title="Add Charging Station" subtitle="Create a new charging dock for the warehouse floor." onClose={() => setIsCreateModalOpen(false)}>
          <form className="space-y-4" onSubmit={submitCreate}>
            <Field label="Station ID">
              <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={stationId} onChange={(event) => setStationId(event.target.value)} required />
            </Field>
            <Field label="Name">
              <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={stationName} onChange={(event) => setStationName(event.target.value)} required />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Status">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={stationStatus} onChange={(event) => setStationStatus(event.target.value as 'FREE' | 'MAINTENANCE')}>
                  <option value="FREE">Free</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </Field>
              <Field label="X">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" type="number" value={stationX} onChange={(event) => setStationX(Number(event.target.value))} required />
              </Field>
              <Field label="Y">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" type="number" value={stationY} onChange={(event) => setStationY(Number(event.target.value))} required />
              </Field>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStationMutation.isPending}>
                {createStationMutation.isPending ? 'Creating...' : 'Create Station'}
              </Button>
            </div>
          </form>
        </StationModal>
      ) : null}

      {editingStation ? (
        <StationModal title={`Edit ${editingStation.name}`} subtitle="Update station position, name, and availability." onClose={() => setEditingStation(null)}>
          <form className="space-y-4" onSubmit={submitUpdate}>
            <Field label="Name">
              <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={stationName} onChange={(event) => setStationName(event.target.value)} required />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Status">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={stationStatus} onChange={(event) => setStationStatus(event.target.value as 'FREE' | 'MAINTENANCE')}>
                  <option value="FREE">Free</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </Field>
              <Field label="X">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" type="number" value={stationX} onChange={(event) => setStationX(Number(event.target.value))} required />
              </Field>
              <Field label="Y">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" type="number" value={stationY} onChange={(event) => setStationY(Number(event.target.value))} required />
              </Field>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditingStation(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateStationMutation.isPending}>
                {updateStationMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </StationModal>
      ) : null}

      {deletingStation ? (
        <StationModal title={`Delete ${deletingStation.name}?`} subtitle="This removes the station from the warehouse layout." onClose={() => setDeletingStation(null)}>
          <div className="space-y-5">
            <div className="rounded-xl bg-surface px-4 py-4 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">{deletingStation.station_id}</p>
              <p className="mt-2">Only free or maintenance stations can be deleted.</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeletingStation(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void deleteStationMutation.mutateAsync()} disabled={deleteStationMutation.isPending}>
                {deleteStationMutation.isPending ? 'Deleting...' : 'Delete Station'}
              </Button>
            </div>
          </div>
        </StationModal>
      ) : null}
    </AppShell>
  )
}
