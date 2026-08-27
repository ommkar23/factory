# Ruff and ty Python quality checks

1. **To-Do:** Add pinned Ruff and ty development dependencies plus Python 3.12 project configuration in `services/api/pyproject.toml`, then resolve existing lint, formatting, and type-checking findings without changing behavior.
   **To-Verify:** Run Ruff check, Ruff format check, ty check, and the complete API pytest suite successfully against `services/api`.

2. **To-Do:** Add Ruff and ty to API-related CI validation and document the matching local commands in the API development workflow.
   **To-Verify:** Exercise the CI command locally in the pinned Python container, run `pnpm check`, and run `git diff --check`.
