from __future__ import annotations

import json
from pathlib import Path

from vibe_logger.ui.sprites import AgentSpriteTracker


def test_sprite_tracker_root_agent():
    """Sprite tracker creates root agent from parent session messages."""
    tracker = AgentSpriteTracker()

    # Assistant calls Read tool -> root agent spawns and enters reading state
    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-1", "function": {"name": "Read", "arguments": "{}"}}],
    })
    assert "root" in tracker.agents
    assert tracker.agents["root"].state == "reading"

    # Assistant calls Write -> state changes to writing
    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-2", "function": {"name": "Write", "arguments": "{}"}}],
    })
    assert tracker.agents["root"].state == "writing"


def test_sprite_tracker_idle_on_assistant_content():
    """Assistant text message sets root agent to idle."""
    tracker = AgentSpriteTracker()

    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-1", "function": {"name": "Bash", "arguments": "{}"}}],
    })
    assert tracker.agents["root"].state == "executing"

    tracker.process_message({"role": "assistant", "content": "Done!"})
    assert tracker.agents["root"].state == "idle"


def test_sprite_tracker_scan_agents(tmp_path: Path):
    """Sprite tracker discovers agents from agents/ directory."""
    session_dir = tmp_path / "session_20260313_082431_test"
    session_dir.mkdir()
    (session_dir / "messages.jsonl").write_text("")
    (session_dir / "meta.json").write_text(json.dumps({
        "session_id": "test", "start_time": "2026-03-13T08:24:31+00:00", "stats": {},
    }))

    # Create 3 agent sub-sessions
    agents_dir = session_dir / "agents"
    agents_dir.mkdir()
    for i, name in enumerate([
        "explore_20260313_080355_aaa",
        "explore_20260313_080414_bbb",
        "explore_20260313_081454_ccc",
    ]):
        agent_dir = agents_dir / name
        agent_dir.mkdir()
        (agent_dir / "meta.json").write_text(json.dumps({
            "session_id": f"agent-{i}",
            "start_time": f"2026-03-13T08:0{i}:00+00:00",
            "title": f"Explore task {i}",
            "stats": {},
        }))
        (agent_dir / "messages.jsonl").write_text(
            json.dumps({"role": "user", "content": "search"}) + "\n"
        )

    tracker = AgentSpriteTracker(session_dir)
    tracker.scan_agents()

    # Should have root + 3 agents
    assert len(tracker.agents) == 4
    assert "root" in tracker.agents
    for name in ["explore_20260313_080355_aaa", "explore_20260313_080414_bbb", "explore_20260313_081454_ccc"]:
        assert name in tracker.agents


def test_sprite_tracker_agent_messages(tmp_path: Path):
    """Agent sprites update state based on their own messages.jsonl."""
    session_dir = tmp_path / "session_test"
    session_dir.mkdir()
    (session_dir / "messages.jsonl").write_text("")
    (session_dir / "meta.json").write_text(json.dumps({
        "session_id": "test", "start_time": "2026-03-13T00:00:00+00:00", "stats": {},
    }))

    agent_dir = session_dir / "agents" / "explore_20260313_000000_xyz"
    agent_dir.mkdir(parents=True)
    (agent_dir / "meta.json").write_text(json.dumps({
        "session_id": "agent-xyz",
        "start_time": "2026-03-13T00:00:00+00:00",
        "title": "Explorer",
        "stats": {},
    }))
    (agent_dir / "messages.jsonl").write_text(
        json.dumps({"role": "assistant", "tool_calls": [
            {"id": "tc-1", "function": {"name": "grep", "arguments": "{}"}}
        ]}) + "\n"
        + json.dumps({"role": "assistant", "tool_calls": [
            {"id": "tc-2", "function": {"name": "read_file", "arguments": "{}"}}
        ]}) + "\n"
    )

    tracker = AgentSpriteTracker(session_dir)
    tracker.scan_agents()
    tracker.read_agent_messages()

    agent_name = "explore_20260313_000000_xyz"
    assert agent_name in tracker.agents
    # Last tool was read_file -> reading state
    assert tracker.agents[agent_name].state == "reading"
    assert tracker.agents[agent_name].completed_tools == 2


def test_sprite_tracker_agent_meta_label(tmp_path: Path):
    """Agent sprites get their label from meta.json title."""
    session_dir = tmp_path / "session_test"
    session_dir.mkdir()
    (session_dir / "messages.jsonl").write_text("")
    (session_dir / "meta.json").write_text(json.dumps({
        "session_id": "test", "start_time": "2026-03-13T00:00:00+00:00", "stats": {},
    }))

    agent_dir = session_dir / "agents" / "explore_abc"
    agent_dir.mkdir(parents=True)
    (agent_dir / "meta.json").write_text(json.dumps({
        "session_id": "agent-abc",
        "start_time": "2026-03-13T00:00:00+00:00",
        "title": "Search codebase",
        "stats": {},
    }))
    (agent_dir / "messages.jsonl").write_text("")

    tracker = AgentSpriteTracker(session_dir)
    tracker.scan_agents()

    assert tracker.agents["explore_abc"].label == "Search codebase"


def test_sprite_tracker_completed_agent(tmp_path: Path):
    """Completed agents start as spawning, then transition to despawning after a tick."""
    session_dir = tmp_path / "session_test"
    session_dir.mkdir()
    (session_dir / "messages.jsonl").write_text("")
    (session_dir / "meta.json").write_text(json.dumps({
        "session_id": "test", "start_time": "2026-03-13T00:00:00+00:00", "stats": {},
    }))

    agent_dir = session_dir / "agents" / "explore_done"
    agent_dir.mkdir(parents=True)
    (agent_dir / "meta.json").write_text(json.dumps({
        "session_id": "agent-done",
        "start_time": "2026-03-13T00:00:00+00:00",
        "end_time": "2026-03-13T00:01:00+00:00",
        "title": "Completed agent",
        "stats": {},
    }))
    (agent_dir / "messages.jsonl").write_text("")

    tracker = AgentSpriteTracker(session_dir)
    tracker.scan_agents()
    tracker.read_agent_messages()  # This checks meta.json for end_time

    # Agent starts as spawning even if already completed, so it's visible briefly
    assert tracker.agents["explore_done"].state == "spawning"

    # After a tick, the spawning state transitions and allows despawning
    tracker.tick()
    # Simulate transition: set state past spawning so read_agent_messages can despawn
    tracker.agents["explore_done"].state = "idle"
    tracker.read_agent_messages()
    assert tracker.agents["explore_done"].state == "despawning"


def test_sprite_render():
    """Sprite tracker renders without errors."""
    tracker = AgentSpriteTracker()

    # Empty render
    panel = tracker.render()
    assert panel is not None

    # With agents
    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-1", "function": {"name": "Read", "arguments": "{}"}}],
    })
    panel = tracker.render()
    assert panel is not None


def test_sprite_tracker_lowercase_tools():
    """Sprite tracker handles lowercase tool names (Mistral Vibe uses lowercase)."""
    tracker = AgentSpriteTracker()

    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-1", "function": {"name": "grep", "arguments": "{}"}}],
    })
    assert tracker.agents["root"].state == "searching"

    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-2", "function": {"name": "read_file", "arguments": "{}"}}],
    })
    assert tracker.agents["root"].state == "reading"

    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-3", "function": {"name": "write_file", "arguments": "{}"}}],
    })
    assert tracker.agents["root"].state == "writing"
