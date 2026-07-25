# 📜 Changelog

All notable changes to the **Sokobot** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Early drafts of `ROADMAP.md` and standard repository documentation.
- Base integration for upcoming predictive maintenance features.

---

## [1.0.0] - 2026-07-20

### Added
- **Core Platform:** Initial production release of the Sokobot web platform.
- **Backend:** FastAPI application with JWT authentication and Role-Based Access Control (Admin & Operator).
- **Frontend:** Command-center UI built with React, Vite, and Tailwind CSS based on Stitch screen layouts.
- **Simulation:** Background engine for robot movement, task progression, charging cycles, and error recovery.
- **Database:** Full Alembic migration support and SQLite/PostgreSQL compatibility.
- **API Documentation:** Interactive Swagger UI setup.
- **Testing:** Comprehensive pytest suite covering auth, tasks, and simulation behaviors.

### Changed
- Updated the routing logic to prefer the nearest idle robot with sufficient battery reserve.
- Improved frontend polling mechanisms with WebSocket support for the dashboard snapshot.

### Fixed
- Addressed minor UI rendering bugs on the warehouse map.
- Fixed an issue where robots would get stuck in the `ERROR` state without a proper reset pathway.
