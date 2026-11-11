# ADR 0001: Releases publish on a version bump and are tagged by CI

## Status
Accepted

## Context
comfyui-colornodes is registered with the Comfy Registry under the publisher named in `[tool.comfy]` of `pyproject.toml`. Its releases had no git tags, so nothing linked a published version to a commit. This repo adopts the same release setup as `ComfyUI_image_manager` (see its `docs/adr/0023-release-tagging-and-registry-publish.md` for the full reasoning).

## Decision
- `pyproject.toml` holds the only version. Pushing a version change to `main` publishes through `.github/workflows/publish_action.yml`.
- The workflow skips publishing when tag `v<version>` already exists, and after a successful publish it tags `v<version>` on the published commit. An unrelated `pyproject.toml` edit therefore cannot republish a released version.
- Versions are semantic with a `v` prefix. Patch for bug-fix-only changes, minor for new features, major for breaking changes; while on `0.x` a breaking change bumps minor.
- `CHANGELOG.md` gets one section per release (Added, Fixed, Changed, Breaking).
- Versions published before this ADR were tagged afterwards: `v0.0.1` at 7250538 and `v0.0.2` at 92a8597. Those tags mark the commit whose `pyproject.toml` first set the version, which is the best available evidence of what was published, not a record of the exact commit the Registry received.

## Consequences
- Pushing a `pyproject.toml` version bump publishes. Test before pushing.
- Releases are not yet proposed automatically for this repo.
