import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '../components/app-shell'
import { Button, Field, Icon, Panel, StatusBadge } from '../components/ui'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast-context'
import type { Waypoint } from '../types'

function WaypointModal({
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

const waypointTypes = ['PICKUP', 'DROPOFF', 'STORAGE', 'CHARGING'] as const

export function WaypointsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data: waypoints = [] } = useQuery({ queryKey: ['waypoints'], queryFn: api.listWaypoints, refetchInterval: 3000 })
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null)
  const [deletingWaypoint, setDeletingWaypoint] = useState<Waypoint | null>(null)

  const [waypointCode, setWaypointCode] = useState('DROP_02')
  const [waypointName, setWaypointName] = useState('Drop Zone 02')
  const [waypointType, setWaypointType] = useState<(typeof waypointTypes)[number]>('DROPOFF')
  const [waypointX, setWaypointX] = useState(72)
  const [waypointY, setWaypointY] = useState(18)

  useEffect(() => {
    if (!selectedWaypointId && waypoints.length) {
      setSelectedWaypointId(waypoints[0].id)
    }
  }, [selectedWaypointId, waypoints])

  const selectedWaypoint = waypoints.find((waypoint) => waypoint.id === selectedWaypointId) ?? waypoints[0]

  const waypointCounts = useMemo(
    () => waypointTypes.map((type) => ({ type, count: waypoints.filter((waypoint) => waypoint.type === type).length })),
    [waypoints],
  )

  const refreshWaypoints = () => {
    queryClient.invalidateQueries({ queryKey: ['waypoints'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] })
  }

  const createWaypointMutation = useMutation({
    mutationFn: async () => api.createWaypoint({ code: waypointCode, name: waypointName, type: waypointType, x: waypointX, y: waypointY }),
    onSuccess: () => {
      refreshWaypoints()
      setIsCreateModalOpen(false)
      showToast({ tone: 'success', title: 'Waypoint created', description: 'The waypoint is now available for task routing.' })
    },
    onError: (error) => {
      showToast({ tone: 'error', title: 'Waypoint creation failed', description: getApiErrorMessage(error, 'The waypoint could not be created.') })
    },
  })

  const updateWaypointMutation = useMutation({
    mutationFn: async () => {
      if (!editingWaypoint) throw new Error('No waypoint selected.')
      return api.updateWaypoint(editingWaypoint.id, { name: waypointName, type: waypointType, x: waypointX, y: waypointY })
    },
    onSuccess: () => {
      refreshWaypoints()
      setEditingWaypoint(null)
      showToast({ tone: 'success', title: 'Waypoint updated', description: 'The waypoint details were saved.' })
    },
    onError: (error) => {
      showToast({ tone: 'error', title: 'Waypoint update failed', description: getApiErrorMessage(error, 'The waypoint could not be updated.') })
    },
  })

  const deleteWaypointMutation = useMutation({
    mutationFn: async () => {
      if (!deletingWaypoint) throw new Error('No waypoint selected.')
      return api.deleteWaypoint(deletingWaypoint.id)
    },
    onSuccess: () => {
      refreshWaypoints()
      setDeletingWaypoint(null)
      showToast({ tone: 'success', title: 'Waypoint deleted', description: 'The waypoint has been removed from the warehouse model.' })
    },
    onError: (error) => {
      showToast({ tone: 'error', title: 'Waypoint deletion failed', description: getApiErrorMessage(error, 'The waypoint could not be deleted.') })
    },
  })

  const openCreateModal = () => {
    setWaypointCode('DROP_02')
    setWaypointName('Drop Zone 02')
    setWaypointType('DROPOFF')
    setWaypointX(72)
    setWaypointY(18)
    setIsCreateModalOpen(true)
  }

  const openEditModal = (waypoint: Waypoint) => {
    setEditingWaypoint(waypoint)
    setWaypointCode(waypoint.code)
    setWaypointName(waypoint.name)
    setWaypointType((waypointTypes.includes(waypoint.type as (typeof waypointTypes)[number]) ? waypoint.type : 'STORAGE') as (typeof waypointTypes)[number])
    setWaypointX(waypoint.x)
    setWaypointY(waypoint.y)
  }

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createWaypointMutation.mutateAsync()
  }

  const submitUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await updateWaypointMutation.mutateAsync()
  }

  return (
    <AppShell title="Waypoints" description="Warehouse routing nodes for pickup, dropoff, storage, and charging flows." searchPlaceholder="Search waypoints or routing nodes...">
      <div className="space-y-8 p-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {waypointCounts.map((entry) => (
            <div key={entry.type} className="rounded-xl bg-surface-container-low px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{entry.type}</p>
              <p className="mt-2 font-headline text-3xl font-bold text-on-surface">{entry.count}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Waypoint Directory" subtitle="All available routing nodes" action={user?.role === 'ADMIN' ? <Button onClick={openCreateModal}>Add Waypoint</Button> : undefined}>
            <div className="space-y-2">
              {waypoints.map((waypoint) => (
                <button
                  key={waypoint.id}
                  className={`w-full rounded-xl px-4 py-4 text-left transition-colors ${
                    selectedWaypoint?.id === waypoint.id ? 'bg-surface text-on-surface' : 'bg-surface-container hover:bg-surface'
                  }`}
                  onClick={() => setSelectedWaypointId(waypoint.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-headline text-sm font-bold text-on-surface">{waypoint.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">{waypoint.code}</p>
                    </div>
                    <StatusBadge label={waypoint.type} />
                  </div>
                  <p className="mt-3 text-xs text-on-surface-variant">
                    ({waypoint.x}, {waypoint.y})
                  </p>
                </button>
              ))}
            </div>
          </Panel>

          {selectedWaypoint ? (
            <Panel title={selectedWaypoint.name} subtitle={`${selectedWaypoint.code} • waypoint detail`}>
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Type</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{selectedWaypoint.type}</p>
                  </div>
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">X</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{selectedWaypoint.x}</p>
                  </div>
                  <div className="rounded-lg bg-surface px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Y</p>
                    <p className="mt-2 text-lg font-bold text-on-surface">{selectedWaypoint.y}</p>
                  </div>
                </div>
                {user?.role === 'ADMIN' ? (
                  <div className="flex flex-wrap gap-3">
                    <Button variant="ghost" onClick={() => openEditModal(selectedWaypoint)}>
                      Edit Waypoint
                    </Button>
                    <Button variant="danger" onClick={() => setDeletingWaypoint(selectedWaypoint)}>
                      Delete Waypoint
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-surface px-5 py-4 text-sm text-on-surface-variant">
                    Operator sessions can view routing nodes here. Editing is restricted to administrators.
                  </div>
                )}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      {isCreateModalOpen ? (
        <WaypointModal title="Add Waypoint" subtitle="Create a new routing node for the warehouse floor." onClose={() => setIsCreateModalOpen(false)}>
          <form className="space-y-4" onSubmit={submitCreate}>
            <Field label="Waypoint ID">
              <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={waypointCode} onChange={(event) => setWaypointCode(event.target.value)} required />
            </Field>
            <Field label="Name">
              <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={waypointName} onChange={(event) => setWaypointName(event.target.value)} required />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Type">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={waypointType} onChange={(event) => setWaypointType(event.target.value as (typeof waypointTypes)[number])}>
                  {waypointTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="X">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" type="number" value={waypointX} onChange={(event) => setWaypointX(Number(event.target.value))} required />
              </Field>
              <Field label="Y">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" type="number" value={waypointY} onChange={(event) => setWaypointY(Number(event.target.value))} required />
              </Field>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWaypointMutation.isPending}>
                {createWaypointMutation.isPending ? 'Creating...' : 'Create Waypoint'}
              </Button>
            </div>
          </form>
        </WaypointModal>
      ) : null}

      {editingWaypoint ? (
        <WaypointModal title={`Edit ${editingWaypoint.name}`} subtitle="Update waypoint type, label, and coordinates." onClose={() => setEditingWaypoint(null)}>
          <form className="space-y-4" onSubmit={submitUpdate}>
            <Field label="Waypoint ID">
              <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none opacity-70" value={waypointCode} disabled />
            </Field>
            <Field label="Name">
              <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={waypointName} onChange={(event) => setWaypointName(event.target.value)} required />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Type">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={waypointType} onChange={(event) => setWaypointType(event.target.value as (typeof waypointTypes)[number])}>
                  {waypointTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="X">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" type="number" value={waypointX} onChange={(event) => setWaypointX(Number(event.target.value))} required />
              </Field>
              <Field label="Y">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" type="number" value={waypointY} onChange={(event) => setWaypointY(Number(event.target.value))} required />
              </Field>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditingWaypoint(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateWaypointMutation.isPending}>
                {updateWaypointMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </WaypointModal>
      ) : null}

      {deletingWaypoint ? (
        <WaypointModal title={`Delete ${deletingWaypoint.name}?`} subtitle="This removes the waypoint from available routing nodes." onClose={() => setDeletingWaypoint(null)}>
          <div className="space-y-5">
            <div className="rounded-xl bg-surface px-4 py-4 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">{deletingWaypoint.code}</p>
              <p className="mt-2">Tasks should be updated before removing warehouse routing nodes.</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeletingWaypoint(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void deleteWaypointMutation.mutateAsync()} disabled={deleteWaypointMutation.isPending}>
                {deleteWaypointMutation.isPending ? 'Deleting...' : 'Delete Waypoint'}
              </Button>
            </div>
          </div>
        </WaypointModal>
      ) : null}
    </AppShell>
  )
}
