from datetime import datetime, timezone
from uuid import uuid4


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def generate_public_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:8].upper()}"


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def euclidean_distance(start: tuple[float, float], end: tuple[float, float]) -> float:
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    return (dx * dx + dy * dy) ** 0.5


def build_route_points(
    start: tuple[float, float],
    source: tuple[float, float],
    destination: tuple[float, float],
) -> list[dict[str, float | str]]:
    route: list[dict[str, float | str]] = []

    def append_segment(
        origin: tuple[float, float],
        target: tuple[float, float],
        checkpoint: str | None = None,
    ) -> tuple[float, float]:
        x, y = origin
        target_x, target_y = target

        while x != target_x:
            x = x + 1 if x < target_x else x - 1
            route.append({"x": float(x), "y": float(y)})

        while y != target_y:
            y = y + 1 if y < target_y else y - 1
            route.append({"x": float(x), "y": float(y)})

        if checkpoint:
            if route:
                route[-1]["checkpoint"] = checkpoint
            else:
                route.append({"x": float(x), "y": float(y), "checkpoint": checkpoint})
        return x, y

    current = append_segment(start, source, checkpoint="SOURCE")
    append_segment(current, destination, checkpoint="DESTINATION")
    return route


def route_distance(route_plan: list[dict[str, float | str]] | None, start: tuple[float, float]) -> float:
    if not route_plan:
        return 0.0
    distance = 0.0
    previous = start
    for point in route_plan:
        current = (float(point["x"]), float(point["y"]))
        distance += euclidean_distance(previous, current)
        previous = current
    return distance

