"""Release/publish configuration (ADR 0001): version source, changelog, publish workflow."""
import re
import tomllib
from pathlib import Path

import yaml

ROOT = Path(__file__).parent.parent
SEMVER = re.compile(r"^\d+\.\d+\.\d+$")
WORKFLOW = next(iter(sorted((ROOT / ".github" / "workflows").glob("publish*.yml"))), ROOT / ".github" / "workflows" / "publish_action.yml")


def _pyproject():
    return tomllib.loads((ROOT / "pyproject.toml").read_text())


def _workflow():
    return yaml.safe_load(WORKFLOW.read_text())


def _triggers(wf):
    # PyYAML (YAML 1.1) parses the bare key `on` as boolean True
    return wf.get("on", wf.get(True))


def _steps(wf):
    return wf["jobs"]["publish-node"]["steps"]


def _step_index(steps, needle):
    for i, s in enumerate(steps):
        if needle in (s.get("uses", "") + s.get("run", "") + s.get("name", "")):
            return i
    raise AssertionError(f"no step matching {needle!r}")


def test_pyproject_version_is_semver():
    assert SEMVER.match(_pyproject()["project"]["version"])


def test_changelog_has_a_version_section_with_standard_headings():
    text = (ROOT / "CHANGELOG.md").read_text()
    assert re.search(r"^## \[\d+\.\d+\.\d+\]", text, re.M)
    for heading in ("Added", "Fixed", "Changed", "Breaking"):
        assert re.search(rf"^### {heading}\b", text, re.M), heading


def test_exactly_one_publish_workflow():
    assert len(list((ROOT / ".github" / "workflows").glob("publish*.yml"))) == 1


def test_workflow_triggers():
    on = _triggers(_workflow())
    assert "workflow_dispatch" in on
    push = on["push"]
    assert set(push["branches"]) == {"main", "master"}
    assert push["paths"] == ["pyproject.toml"]


def test_workflow_skips_forks():
    job = _workflow()["jobs"]["publish-node"]
    assert job["if"].replace(" ", "") == "github.event.repository.fork==false"


def test_workflow_can_write_contents_for_tagging():
    wf = _workflow()
    perms = wf.get("permissions") or wf["jobs"]["publish-node"].get("permissions")
    assert perms["contents"] == "write"


def test_publish_step_uses_registry_secret():
    steps = _steps(_workflow())
    publish = steps[_step_index(steps, "Comfy-Org/publish-node-action")]
    assert publish["with"]["personal_access_token"] == "${{ secrets.REGISTRY_ACCESS_TOKEN }}"


def test_tag_guard_runs_before_publish_and_gates_it():
    steps = _steps(_workflow())
    guard = _step_index(steps, "git rev-parse")
    publish = _step_index(steps, "Comfy-Org/publish-node-action")
    assert guard < publish
    assert "steps." in steps[publish]["if"]  # publish is conditional on the guard's output


def test_tag_step_runs_after_publish():
    steps = _steps(_workflow())
    publish = _step_index(steps, "Comfy-Org/publish-node-action")
    tag = _step_index(steps, "git tag")
    assert tag > publish
    assert "git push origin" in steps[tag]["run"]
