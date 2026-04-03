import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { DashboardRobot, DashboardSnapshot, DashboardTask, DashboardWaypoint, RobotStatus } from '../types'

import { Icon } from './ui'

const MAP_WIDTH = 160
const MAP_HEIGHT = 90

type Point = {
  x: number
  y: number
}

type PanState = {
  x: number
  y: number
}

type TooltipState =
  | {
      kind: 'robot'
      title: string
      subtitle: string
      detail: string
      x: number
      y: number
    }
  | {
      kind: 'waypoint'
      title: string
      subtitle: string
      detail: string
      x: number
      y: number
    }

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function clampPan(pan: PanState, zoom: number): PanState {
  const maxPanX = ((MAP_WIDTH * zoom) - MAP_WIDTH) / 2
  const maxPanY = ((MAP_HEIGHT * zoom) - MAP_HEIGHT) / 2
  return {
    x: clamp(pan.x, -maxPanX, maxPanX),
    y: clamp(pan.y, -maxPanY, maxPanY),
  }
}

function robotTone(status: RobotStatus) {
  if (status === 'ERROR') return '#ff7c86'
  if (status === 'CHARGING') return '#f3c969'
  return '#5dd39e'
}

function waypointTone(type: string) {
  if (type === 'PICKUP') return '#8bb8ff'
  if (type === 'DROPOFF') return '#76a7f8'
  if (type === 'CHARGING') return '#7f9fff'
  return '#9ac2ff'
}

function stationTone(status: string) {
  if (status === 'MAINTENANCE') return '#7c5d63'
  if (status === 'OCCUPIED') return '#ff7aa2'
  return '#f15b8a'
}

function formatRoutePoints(task: DashboardTask, normalizePoint: (x: number, y: number) => Point) {
  return task.route_plan
    .map((point) => normalizePoint(Number(point.x ?? 0), Number(point.y ?? 0)))
    .filter((point, index, points) => {
      const previous = points[index - 1]
      return !previous || previous.x !== point.x || previous.y !== point.y
    })
}

function pointsToPolyline(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

function MapLabel({
  x,
  y,
  text,
  tone,
}: {
  x: number
  y: number
  text: string
  tone: string
}) {
  const width = Math.max(16, text.length * 2.5 + 8)
  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none">
      <rect x="4" y="-8" width={width} height="11" rx="5.5" fill="rgba(14,14,16,0.92)" stroke={tone} strokeWidth="0.45" />
      <text x="9" y="-0.4" fill="#f5f3f2" fontSize="3.2" fontWeight="600">
        {text}
      </text>
    </g>
  )
}

export function WarehouseMap({
  snapshot,
  selectedRobotId,
  selectedWaypointId,
  onSelectRobot,
  onSelectWaypoint,
}: {
  snapshot: DashboardSnapshot
  selectedRobotId?: string | null
  selectedWaypointId?: string | null
  onSelectRobot?: (robotId: string) => void
  onSelectWaypoint?: (waypointId: string) => void
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originPan: PanState
  } | null>(null)
  const clickGuardRef = useRef(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hoveredRobotId, setHoveredRobotId] = useState<string | null>(null)
  const [hoveredWaypointId, setHoveredWaypointId] = useState<string | null>(null)

  const ranges = useMemo(() => {
    const xs = [
      ...snapshot.robots.map((robot) => robot.x),
      ...snapshot.stations.map((station) => station.x),
      ...snapshot.waypoints.map((waypoint) => waypoint.x),
      ...snapshot.tasks.flatMap((task) => task.route_plan.map((point) => Number(point.x ?? 0))),
      100,
    ]
    const ys = [
      ...snapshot.robots.map((robot) => robot.y),
      ...snapshot.stations.map((station) => station.y),
      ...snapshot.waypoints.map((waypoint) => waypoint.y),
      ...snapshot.tasks.flatMap((task) => task.route_plan.map((point) => Number(point.y ?? 0))),
      100,
    ]

    return {
      maxX: Math.max(...xs, 1),
      maxY: Math.max(...ys, 1),
    }
  }, [snapshot])

  const normalizePoint = (x: number, y: number) => ({
    x: (x / ranges.maxX) * MAP_WIDTH,
    y: MAP_HEIGHT - (y / ranges.maxY) * MAP_HEIGHT,
  })

  const selectedRobot = useMemo(
    () => snapshot.robots.find((robot) => robot.robot_id === selectedRobotId) ?? null,
    [selectedRobotId, snapshot.robots],
  )

  const selectedTask = useMemo(
    () => snapshot.tasks.find((task) => task.task_id === selectedRobot?.active_task_id) ?? null,
    [selectedRobot?.active_task_id, snapshot.tasks],
  )

  const selectedRoute = useMemo(
    () => (selectedTask ? formatRoutePoints(selectedTask, normalizePoint) : []),
    [selectedTask, snapshot.tasks],
  )

  const activeRoutes = useMemo(
    () =>
      snapshot.tasks
        .filter((task) => (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') && task.task_id !== selectedTask?.task_id)
        .map((task) => ({ task, points: formatRoutePoints(task, normalizePoint) }))
        .filter((entry) => entry.points.length > 1),
    [normalizePoint, selectedTask?.task_id, snapshot.tasks],
  )

  const selectedTrail = useMemo(() => {
    if (!selectedRobot || selectedRobot.trail.length < 2) {
      return []
    }
    return selectedRobot.trail.map((point) => normalizePoint(point.x, point.y))
  }, [normalizePoint, selectedRobot])

  const structuralGuides = useMemo(() => {
    const corridorXs = [12, 24, 38, 52, 66, 80, 92]
    const corridorYs = [12, 28, 44, 60, 76]
    return {
      vertical: corridorXs.map((value) => normalizePoint(value, 0).x),
      horizontal: corridorYs.map((value) => normalizePoint(0, value).y),
    }
  }, [normalizePoint])

  const showExpandedLabels = zoom >= 2.05

  function updateTooltipPosition(event: ReactMouseEvent<SVGElement, MouseEvent>) {
    if (!viewportRef.current) {
      return { x: 0, y: 0 }
    }
    const bounds = viewportRef.current.getBoundingClientRect()
    return {
      x: clamp(event.clientX - bounds.left, 14, bounds.width - 14),
      y: clamp(event.clientY - bounds.top, 14, bounds.height - 14),
    }
  }

  function showRobotTooltip(event: ReactMouseEvent<SVGElement, MouseEvent>, robot: DashboardRobot) {
    const position = updateTooltipPosition(event)
    setHoveredRobotId(robot.robot_id)
    setTooltip({
      kind: 'robot',
      title: robot.robot_id,
      subtitle: `${Math.round(robot.battery_level)}% battery`,
      detail: robot.active_task_id ? `Task ${robot.active_task_id}` : 'No active task',
      x: position.x,
      y: position.y,
    })
  }

  function showWaypointTooltip(event: ReactMouseEvent<SVGElement, MouseEvent>, waypoint: DashboardWaypoint) {
    const position = updateTooltipPosition(event)
    setHoveredWaypointId(waypoint.waypoint_id)
    setTooltip({
      kind: 'waypoint',
      title: waypoint.name,
      subtitle: waypoint.type,
      detail: `(${waypoint.x}, ${waypoint.y})`,
      x: position.x,
      y: position.y,
    })
  }

  function clearHover(kind: 'robot' | 'waypoint') {
    if (kind === 'robot') {
      setHoveredRobotId(null)
    } else {
      setHoveredWaypointId(null)
    }
    setTooltip((current) => (current?.kind === kind ? null : current))
  }

  function adjustZoom(direction: 1 | -1) {
    setZoom((current) => {
      const nextZoom = clamp(Number((current + direction * 0.2).toFixed(2)), 1, 2.4)
      setPan((currentPan) => clampPan(currentPan, nextZoom))
      return nextZoom
    })
  }

  function resetView() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()
    adjustZoom(event.deltaY > 0 ? -1 : 1)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return
    }
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originPan: pan,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStateRef.current || !viewportRef.current) {
      return
    }

    const bounds = viewportRef.current.getBoundingClientRect()
    const deltaX = event.clientX - dragStateRef.current.startX
    const deltaY = event.clientY - dragStateRef.current.startY
    const moved = Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3

    if (!moved) {
      return
    }

    clickGuardRef.current = true
    setIsPanning(true)
    setTooltip(null)

    const nextPan = {
      x: dragStateRef.current.originPan.x + (deltaX / bounds.width) * MAP_WIDTH,
      y: dragStateRef.current.originPan.y + (deltaY / bounds.height) * MAP_HEIGHT,
    }
    setPan(clampPan(nextPan, zoom))
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragStateRef.current = null
    setIsPanning(false)
    window.setTimeout(() => {
      clickGuardRef.current = false
    }, 0)
  }

  return (
    <div className="rounded-2xl bg-surface-container-low p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-headline text-xl font-bold tracking-tight text-on-surface">Warehouse Map</h3>
          <p className="mt-1 max-w-2xl text-xs text-on-surface-variant">
            Live fleet surface with robot state, waypoint network, charging stations, and active routes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md bg-surface text-on-surface transition-colors hover:bg-surface-container-highest"
            onClick={() => adjustZoom(-1)}
          >
            <Icon name="remove" className="text-lg" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-md bg-surface text-on-surface transition-colors hover:bg-surface-container-highest"
            onClick={() => adjustZoom(1)}
          >
            <Icon name="add" className="text-lg" />
          </button>
          <button
            type="button"
            className="rounded-md bg-surface px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface transition-colors hover:bg-surface-container-highest"
            onClick={resetView}
          >
            Reset View
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-surface p-4">
        <div
          ref={viewportRef}
          className="relative mx-auto aspect-video w-full max-w-[1240px] overflow-hidden rounded-2xl border border-outline-variant/15 bg-[#111214]"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => setIsPanning(false)}
          style={{ cursor: isPanning ? 'grabbing' : zoom > 1 ? 'grab' : 'default' }}
        >
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full bg-background/85 px-3 py-1.5 text-[11px] text-on-surface-variant backdrop-blur">
            <span>Drag to pan</span>
            <span className="text-outline">|</span>
            <span>Scroll to zoom</span>
          </div>

          <div className="absolute bottom-4 right-4 z-20 rounded-full bg-background/85 px-3 py-1.5 text-[11px] text-on-surface-variant backdrop-blur">
            {zoom.toFixed(1)}x
          </div>

          <svg className="h-full w-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <pattern id="minor-grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(255,255,255,0.028)" strokeWidth="0.32" />
              </pattern>
              <pattern id="major-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.45" />
              </pattern>
              <filter id="marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0.6" stdDeviation="0.8" floodColor="rgba(0,0,0,0.42)" />
              </filter>
              <filter id="selected-route-glow" x="-25%" y="-25%" width="150%" height="150%">
                <feDropShadow dx="0" dy="0" stdDeviation="1.2" floodColor="rgba(255,122,162,0.22)" />
              </filter>
            </defs>

            <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="#111214" />
            <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#minor-grid)" />
            <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#major-grid)" />

            <g opacity="0.2">
              {structuralGuides.vertical.map((x, index) => (
                <line
                  key={`v-${index}`}
                  x1={x}
                  y1={10}
                  x2={x}
                  y2={MAP_HEIGHT - 10}
                  stroke="rgba(151,160,170,0.16)"
                  strokeWidth="0.7"
                  strokeDasharray={index % 2 === 0 ? '1.2 4.5' : '2 5.5'}
                />
              ))}
              {structuralGuides.horizontal.map((y, index) => (
                <line
                  key={`h-${index}`}
                  x1={8}
                  y1={y}
                  x2={MAP_WIDTH - 8}
                  y2={y}
                  stroke="rgba(151,160,170,0.12)"
                  strokeWidth="0.65"
                  strokeDasharray={index === structuralGuides.horizontal.length - 1 ? '6 4' : '3 5'}
                />
              ))}
            </g>

            <g transform={`translate(${pan.x}, ${pan.y})`}>
              <g transform={`translate(${MAP_WIDTH / 2} ${MAP_HEIGHT / 2}) scale(${zoom}) translate(${-MAP_WIDTH / 2} ${-MAP_HEIGHT / 2})`}>
                {activeRoutes.map(({ task, points }) => (
                  <polyline
                    key={task.task_id}
                    points={pointsToPolyline(points)}
                    fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="0.95"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {selectedTrail.length > 1 ? (
                  <polyline
                    points={pointsToPolyline(selectedTrail)}
                    fill="none"
                    stroke="rgba(93,211,158,0.22)"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="1.5 2.5"
                  />
                ) : null}

                {selectedRoute.length > 1 ? (
                  <polyline
                    points={pointsToPolyline(selectedRoute)}
                    fill="none"
                    stroke="#ff7aa2"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#selected-route-glow)"
                  />
                ) : null}

                {snapshot.stations.map((station) => {
                  const point = normalizePoint(station.x, station.y)
                  const selected = selectedRobot?.status === 'CHARGING' && selectedRobot.active_task_id == null && station.current_robot_id != null
                  const tone = stationTone(station.status)

                  return (
                    <g key={station.station_id} transform={`translate(${point.x}, ${point.y})`} filter="url(#marker-shadow)">
                      <rect
                        x={-2.6}
                        y={-2.6}
                        width="5.2"
                        height="5.2"
                        rx="1"
                        fill={tone}
                        stroke={selected ? '#fff4f8' : '#0f1012'}
                        strokeWidth={selected ? '0.95' : '0.8'}
                      />
                      {showExpandedLabels ? <MapLabel x={2.8} y={-3.5} text={station.name} tone={tone} /> : null}
                    </g>
                  )
                })}

                {snapshot.waypoints.map((waypoint) => {
                  const point = normalizePoint(waypoint.x, waypoint.y)
                  const isSelected = waypoint.waypoint_id === selectedWaypointId
                  const isHovered = waypoint.waypoint_id === hoveredWaypointId
                  const tone = waypointTone(waypoint.type)

                  return (
                    <g
                      key={waypoint.waypoint_id}
                      transform={`translate(${point.x}, ${point.y})`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (!clickGuardRef.current) {
                          onSelectWaypoint?.(waypoint.waypoint_id)
                        }
                      }}
                      onMouseEnter={(event) => showWaypointTooltip(event, waypoint)}
                      onMouseMove={(event) => showWaypointTooltip(event, waypoint)}
                      onMouseLeave={() => clearHover('waypoint')}
                    >
                      <g filter="url(#marker-shadow)">
                        <circle cx={0} cy={0} r={isSelected ? 2 : 1.5} fill={tone} stroke="#0f1012" strokeWidth="0.7" />
                        {(isSelected || isHovered) && (
                          <circle cx={0} cy={0} r={3.3} fill="none" stroke={`${tone}55`} strokeWidth="0.8" />
                        )}
                      </g>
                      {(isSelected || isHovered || showExpandedLabels) ? <MapLabel x={2.8} y={-3.8} text={waypoint.name} tone={tone} /> : null}
                    </g>
                  )
                })}

                {snapshot.robots.map((robot) => {
                  const point = normalizePoint(robot.x, robot.y)
                  const isSelected = robot.robot_id === selectedRobotId
                  const isHovered = robot.robot_id === hoveredRobotId
                  const tone = robotTone(robot.status)

                  return (
                    <g
                      key={robot.robot_id}
                      transform={`translate(${point.x}, ${point.y})`}
                      style={{ cursor: 'pointer', transition: 'transform 600ms linear' }}
                      onClick={() => {
                        if (!clickGuardRef.current) {
                          onSelectRobot?.(robot.robot_id)
                        }
                      }}
                      onMouseEnter={(event) => showRobotTooltip(event, robot)}
                      onMouseMove={(event) => showRobotTooltip(event, robot)}
                      onMouseLeave={() => clearHover('robot')}
                    >
                      <g filter="url(#marker-shadow)">
                        {(isSelected || isHovered) ? (
                          <circle cx={0} cy={0} r={4.2} fill="none" stroke={`${tone}66`} strokeWidth="1.1" />
                        ) : null}
                        <circle cx={0} cy={0} r={2.25} fill={tone} stroke="#0f1012" strokeWidth="0.9" />
                      </g>
                      {(isSelected || isHovered) ? <MapLabel x={3.4} y={-4.6} text={robot.robot_id} tone={tone} /> : null}
                    </g>
                  )
                })}
              </g>
            </g>
          </svg>

          {tooltip ? (
            <div
              className="pointer-events-none absolute z-30 rounded-xl border border-outline-variant/20 bg-background/96 px-3 py-2 text-xs text-on-surface shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur"
              style={{
                left: tooltip.x,
                top: tooltip.y,
                transform: 'translate(12px, -12px)',
              }}
            >
              <div className="font-headline text-sm font-bold tracking-tight">{tooltip.title}</div>
              <div className="text-on-surface-variant">{tooltip.subtitle}</div>
              <div className="mt-1 text-[11px] text-on-surface-variant">{tooltip.detail}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#5dd39e]" />
            Active robot
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f3c969]" />
            Charging robot
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff7c86]" />
            Error robot
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#f15b8a]" />
            Charging station
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#8bb8ff]" />
            Waypoint
          </div>
          <div className="flex items-center gap-2">
            <span className="h-px w-5 bg-[#ff7aa2]" />
            Selected route
          </div>
        </div>
      </div>
    </div>
  )
}
