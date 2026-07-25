# 🤝 Contributing to Sokobot

First off, thank you for considering contributing to **Sokobot**! It's people like you that make this warehouse management system a great tool for the community.

## 🛠️ Development Workflow

1. **Fork the Repository:** Start by forking the project to your own GitHub account.
2. **Clone the Repo:** Clone it locally and set up the `backend` and `frontend` environments as detailed in the [INSTALL.md](./INSTALL.md).
3. **Branch Out:** Create a new branch from `main` (`git checkout -b feature/your-feature-name`).
4. **Make Changes:** Write your code, ensuring you follow our style guides and write necessary tests.
5. **Test Your Changes:** 
   - Backend: Run `pytest -q`
   - Frontend: Run `npm run build`
6. **Commit:** Write clear and concise commit messages.
7. **Push & Pull Request:** Push to your fork and submit a Pull Request to our `main` branch.

## 📝 Code Standards

### Backend (Python/FastAPI)
- We follow PEP 8 standards.
- Ensure any new database models have corresponding Alembic migrations.
- Write tests for any new API endpoints.

### Frontend (React/Vite/Tailwind)
- Use functional components and hooks.
- Keep Tailwind classes organized and consistent with the Stitch visual language.

## 🐞 Reporting Bugs

If you find a bug, please create an issue detailing:
- The expected behavior vs actual behavior.
- Steps to reproduce the bug.
- Environment details (OS, Node version, Python version).

## ✨ Suggesting Enhancements

Have an idea to make Sokobot better? We'd love to hear it! Open an issue categorized as an enhancement and describe your idea thoroughly.

We look forward to your contributions!
