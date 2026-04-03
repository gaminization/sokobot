import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { AppShell } from '../components/app-shell'
import { Button, Field, Icon, MetricCard, Panel, StatusBadge } from '../components/ui'
import { useAuth } from '../lib/auth-context'
import { api } from '../lib/api'
import { getApiErrorMessage } from '../lib/errors'
import { formatDateTime } from '../lib/helpers'
import { useToast } from '../lib/toast-context'
import type { User } from '../types'

function UserModal({
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
      <div className="w-full max-w-2xl">
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

export function AdminPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: api.listUsers, enabled: user?.role === 'ADMIN' })
  const { data: waypoints = [] } = useQuery({ queryKey: ['waypoints'], queryFn: api.listWaypoints, enabled: user?.role === 'ADMIN' })
  const { data: snapshot } = useQuery({ queryKey: ['dashboard-snapshot'], queryFn: api.dashboardSnapshot, enabled: user?.role === 'ADMIN', refetchInterval: 5000 })

  const [firstName, setFirstName] = useState('Jordan')
  const [lastName, setLastName] = useState('Whitaker')
  const [email, setEmail] = useState('j.whitaker@sokobot.com')
  const [password, setPassword] = useState('Warehouse123!Secure')
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR')
  const [waypointCode, setWaypointCode] = useState('DOCK_03')
  const [waypointName, setWaypointName] = useState('Dock 03')
  const [waypointType, setWaypointType] = useState('LOADING')
  const [waypointX, setWaypointX] = useState(72)
  const [waypointY, setWaypointY] = useState(20)

  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<'ADMIN' | 'OPERATOR'>('OPERATOR')
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [editPassword, setEditPassword] = useState('')
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  const refreshUsers = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] })
  }

  const createUserMutation = useMutation({
    mutationFn: async () => api.createUser({ first_name: firstName, last_name: lastName, email, password, role, is_active: true }),
    onSuccess: () => {
      refreshUsers()
      setFirstName('Jordan')
      setLastName('Whitaker')
      setEmail('j.whitaker@sokobot.com')
      setPassword('Warehouse123!Secure')
      setRole('OPERATOR')
      showToast({
        tone: 'success',
        title: 'User created',
        description: 'The new account is available immediately.',
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'User creation failed',
        description: getApiErrorMessage(error, 'The user could not be created.'),
      })
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser) {
        throw new Error('No user selected for editing.')
      }

      return api.updateUser(editingUser.id, {
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail,
        role: editRole,
        is_active: editStatus === 'ACTIVE',
        password: editPassword || undefined,
      })
    },
    onSuccess: () => {
      refreshUsers()
      setEditingUser(null)
      setEditPassword('')
      showToast({
        tone: 'success',
        title: 'User updated',
        description: 'Account details were saved successfully.',
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'User update failed',
        description: getApiErrorMessage(error, 'The user could not be updated.'),
      })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!deletingUser) {
        throw new Error('No user selected for deletion.')
      }
      return api.deleteUser(deletingUser.id)
    },
    onSuccess: () => {
      refreshUsers()
      setDeletingUser(null)
      showToast({
        tone: 'success',
        title: 'User deleted',
        description: 'The account has been removed.',
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'User deletion failed',
        description: getApiErrorMessage(error, 'The user could not be deleted.'),
      })
    },
  })

  const createWaypointMutation = useMutation({
    mutationFn: async () => api.createWaypoint({ code: waypointCode, name: waypointName, type: waypointType, x: waypointX, y: waypointY }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waypoints'] })
      showToast({
        tone: 'success',
        title: 'Waypoint created',
        description: 'The warehouse routing node has been added.',
      })
    },
    onError: (error) => {
      showToast({
        tone: 'error',
        title: 'Waypoint creation failed',
        description: getApiErrorMessage(error, 'The waypoint could not be created.'),
      })
    },
  })

  const userStats = useMemo(
    () => ({
      admins: users.filter((entry) => entry.role === 'ADMIN').length,
      operators: users.filter((entry) => entry.role === 'OPERATOR').length,
      active: users.filter((entry) => entry.is_active).length,
    }),
    [users],
  )

  const openEditModal = (targetUser: User) => {
    setEditingUser(targetUser)
    setEditFirstName(targetUser.first_name)
    setEditLastName(targetUser.last_name)
    setEditEmail(targetUser.email)
    setEditRole(targetUser.role)
    setEditStatus(targetUser.is_active ? 'ACTIVE' : 'INACTIVE')
    setEditPassword('')
  }

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createUserMutation.mutateAsync()
  }

  const updateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await updateUserMutation.mutateAsync()
  }

  const createWaypoint = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await createWaypointMutation.mutateAsync()
  }

  const confirmDeleteUser = async () => {
    await deleteUserMutation.mutateAsync()
  }

  if (user?.role !== 'ADMIN') {
    return (
      <AppShell title="Admin Panel" description="Administrator-only configuration tools." searchPlaceholder="Search system logs or users...">
        <div className="p-8">
          <Panel title="Restricted Access" subtitle="Administrator role required">
            <div className="text-sm text-on-surface-variant">Your current session is an operator account. Sign in as an administrator to manage users and waypoints.</div>
          </Panel>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="Admin Panel" description="User access management, waypoint configuration, and system readiness context for the warehouse fleet." searchPlaceholder="Search system logs or users...">
      <div className="space-y-8 p-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <MetricCard label="Admins" value={userStats.admins} hint="System administrators" tone="primary" />
          <MetricCard label="Operators" value={userStats.operators} hint="Fleet operators" tone="tertiary" />
          <MetricCard label="Active Users" value={userStats.active} hint="Currently enabled accounts" tone="neutral" />
          <MetricCard label="Waypoints" value={waypoints.length} hint="Configured routing nodes" tone="primary" />
        </div>
        <div className="grid gap-8 xl:grid-cols-[1.35fr_0.65fr]">
          <Panel title="User Directory" subtitle="Create, edit, and remove Sokobot users">
            <div className="overflow-hidden rounded-xl border border-outline-variant/10">
              <table className="min-w-full divide-y divide-outline-variant/10 text-left">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Member</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Role</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Last Login</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 bg-surface-container-low">
                  {users.map((entry) => {
                    const isSelf = entry.id === user.id
                    return (
                      <tr key={entry.id}>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-on-surface">
                            {entry.first_name} {entry.last_name}
                          </p>
                          <p className="text-xs text-on-surface-variant">{entry.email}</p>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge label={entry.role} />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge label={entry.is_active ? 'ACTIVE' : 'INACTIVE'} />
                        </td>
                        <td className="px-4 py-4 text-sm text-on-surface-variant">{formatDateTime(entry.last_login_at)}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" onClick={() => openEditModal(entry)}>
                              Edit
                            </Button>
                            <Button variant="danger" onClick={() => setDeletingUser(entry)} disabled={isSelf}>
                              Delete
                            </Button>
                          </div>
                          {isSelf ? <p className="mt-2 text-[11px] text-on-surface-variant">Your account cannot be deleted.</p> : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <div className="space-y-6">
            <Panel title="Create User" subtitle="Add admin or operator accounts">
              <form className="space-y-4" onSubmit={createUser}>
                <Field label="First Name">
                  <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                </Field>
                <Field label="Last Name">
                  <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={lastName} onChange={(event) => setLastName(event.target.value)} required />
                </Field>
                <Field label="Email">
                  <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
                </Field>
                <Field label="Password">
                  <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={12} required />
                </Field>
                <Field label="Role">
                  <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={role} onChange={(event) => setRole(event.target.value as 'ADMIN' | 'OPERATOR')}>
                    <option value="OPERATOR">Operator</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </Field>
                <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                </Button>
              </form>
            </Panel>
            <Panel title="Create Waypoint" subtitle="Extend warehouse routing nodes">
              <form className="space-y-4" onSubmit={createWaypoint}>
                <Field label="Code">
                  <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={waypointCode} onChange={(event) => setWaypointCode(event.target.value)} required />
                </Field>
                <Field label="Name">
                  <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={waypointName} onChange={(event) => setWaypointName(event.target.value)} required />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Type">
                    <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={waypointType} onChange={(event) => setWaypointType(event.target.value)} required />
                  </Field>
                  <Field label="X">
                    <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={waypointX} onChange={(event) => setWaypointX(Number(event.target.value))} type="number" required />
                  </Field>
                  <Field label="Y">
                    <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={waypointY} onChange={(event) => setWaypointY(Number(event.target.value))} type="number" required />
                  </Field>
                </div>
                <Button type="submit" className="w-full" disabled={createWaypointMutation.isPending}>
                  {createWaypointMutation.isPending ? 'Creating...' : 'Add Waypoint'}
                </Button>
              </form>
            </Panel>
            <Panel title="System Readiness" subtitle="Current fleet confidence signal">
              <div className="space-y-3 text-sm text-on-surface-variant">
                <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
                  <span>Fleet errors</span>
                  <span className="font-semibold text-on-surface">{snapshot?.kpis.error_robots ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
                  <span>Tasks in progress</span>
                  <span className="font-semibold text-on-surface">{snapshot?.kpis.tasks_in_progress ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
                  <span>Average battery</span>
                  <span className="font-semibold text-on-surface">{snapshot?.kpis.average_battery_level ?? 0}%</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {editingUser ? (
        <UserModal title={`Edit ${editingUser.first_name} ${editingUser.last_name}`} subtitle="Update account profile, role, and status." onClose={() => setEditingUser(null)}>
          <form className="space-y-4" onSubmit={updateUser}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="First Name">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={editFirstName} onChange={(event) => setEditFirstName(event.target.value)} required />
              </Field>
              <Field label="Last Name">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={editLastName} onChange={(event) => setEditLastName(event.target.value)} required />
              </Field>
              <Field label="Email">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} type="email" required />
              </Field>
              <Field label="Role">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={editRole} onChange={(event) => setEditRole(event.target.value as 'ADMIN' | 'OPERATOR')}>
                  <option value="OPERATOR">Operator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </Field>
              <Field label="Status">
                <select className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={editStatus} onChange={(event) => setEditStatus(event.target.value as 'ACTIVE' | 'INACTIVE')}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </Field>
              <Field label="Password">
                <input className="h-11 rounded border border-outline-variant/10 bg-surface px-4 text-sm text-on-surface outline-none focus:border-primary" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} type="password" minLength={12} placeholder="Leave blank to keep existing password" />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </UserModal>
      ) : null}

      {deletingUser ? (
        <UserModal title={`Delete ${deletingUser.first_name} ${deletingUser.last_name}?`} subtitle="This action permanently removes the selected account." onClose={() => setDeletingUser(null)}>
          <div className="space-y-5">
            <div className="rounded-xl bg-surface px-4 py-4 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">{deletingUser.email}</p>
              <p className="mt-2">This user will lose access immediately. This action cannot be undone.</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeletingUser(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => void confirmDeleteUser()} disabled={deleteUserMutation.isPending || deletingUser.id === user.id}>
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </UserModal>
      ) : null}
    </AppShell>
  )
}
