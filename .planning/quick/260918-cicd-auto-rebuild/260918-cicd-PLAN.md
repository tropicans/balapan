# Quick Task 260918-cicd: Implement CI/CD & Auto-Rebuild Pipeline

**Description:** Implement full CI/CD pipeline (GitHub Actions for cloud CI test & Docker image build/push) + Local Auto-Rebuild (Docker Compose Watch and Git post-commit hook) so containers automatically rebuild after changes.

## Root Need & User Request
User requested: "bisa implementasi ci/cd jadi setelah perubahan langsung auto rebuild".
Selected strategy:
1. Cloud CI/CD (GitHub Actions): Automated tests, frontend build check, and Docker container build & push to GHCR on `main` push.
2. Local Auto-Rebuild:
   - Docker Compose `develop.watch` configuration for native live watching and auto-rebuilding.
   - Local Git hook (`post-commit` / `post-merge`) setup script to auto-rebuild local Docker container after every commit or pull.
   - Convenient npm scripts (`docker:watch`, `docker:rebuild`, `setup:hooks`).

## Plan
1. [ ] Configure GitHub Actions workflow `.github/workflows/ci-cd.yml` with test suite execution, frontend build check, and Docker build-push with layer caching.
2. [ ] Update `docker-compose.yml` to support Docker Compose file watch (`develop.watch`) for auto-rebuilding when server/client/config files change.
3. [ ] Create git hook setup script `scripts/setup-git-hooks.js` and install `post-commit` / `post-merge` hook that runs `docker compose up -d --build`.
4. [ ] Update `package.json` scripts (`docker:watch`, `setup:hooks`).
5. [ ] Update documentation (`README.md`) with instructions on CI/CD and auto-rebuild workflows.
6. [ ] Verify workflow YAML syntax, test scripts, and local hooks.
