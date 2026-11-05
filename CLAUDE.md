# CLAUDE.md

## Required Git workflow

Every change must use a dedicated branch and a pull request targeting `dev`, the development branch. This applies to features, fixes, refactors, configuration, tests, migrations, and documentation.

1. Fetch the latest remote state and create the work branch from `origin/dev` (for example, `feature/<name>` or `fix/<name>`).
2. Commit all changes required for the work, including relevant tests, migrations, and documentation. Do not include credentials or generated temporary files.
3. Push the work branch and open a pull request with **base `dev`**, containing all changes for that task.
4. Keep integration in `dev`. Do not push changes directly to `dev` or `main`, and do not target feature or fix PRs at `main`.
5. Changes reach `main` through a separately authorized promotion from `dev`.

Only an explicit user instruction can authorize an exception, such as applying a specific documentation update directly to `main`. Never infer an exception.

## Shared project instructions

Read [AGENTS.md](AGENTS.md) for the template build instructions, available components, and quality requirements.
