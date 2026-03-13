from __future__ import annotations

from vibe_logger.ui.sprites import AgentSpriteTracker


def test_sprite_tracker_basic():
    """Sprite tracker processes messages and tracks agents."""
    tracker = AgentSpriteTracker()

    # Assistant calls Read tool -> root agent spawns and enters reading state
    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-1", "function": {"name": "Read", "arguments": "{}"}}],
    })
    assert "root" in tracker.agents
    assert tracker.agents["root"].state == "reading"

    # Tool result comes back
    tracker.process_message({"role": "tool", "content": "file content", "name": "Read", "tool_call_id": "tc-1"})

    # Assistant calls Write -> state changes to writing
    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-2", "function": {"name": "Write", "arguments": "{}"}}],
    })
    assert tracker.agents["root"].state == "writing"


def test_sprite_tracker_sub_agents():
    """Sprite tracker spawns sub-agent characters."""
    tracker = AgentSpriteTracker()

    # First tool call to establish root
    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-1", "function": {"name": "Read", "arguments": "{}"}}],
    })
    assert len(tracker.agents) == 1

    # Agent tool call -> spawns sub-agent
    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "agent-1", "function": {"name": "Agent", "arguments": "{}"}}],
    })
    assert len(tracker.agents) == 2
    assert "agent-1" in tracker.agents
    assert tracker.agents["agent-1"].state == "spawning"

    # Sub-agent does a Read
    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-2", "function": {"name": "Grep", "arguments": "{}"}}],
    })
    # Top of stack is agent-1
    assert tracker.agents["agent-1"].state == "searching"

    # Agent completes
    tracker.process_message({"role": "tool", "content": "done", "name": "Agent", "tool_call_id": "agent-1"})
    assert tracker.agents["agent-1"].state == "despawning"

    # After tick, despawned agents get cleaned up
    tracker.tick()
    tracker.tick()
    assert "agent-1" not in tracker.agents


def test_sprite_tracker_idle_on_assistant_content():
    """Assistant text message sets current agent to idle."""
    tracker = AgentSpriteTracker()

    tracker.process_message({
        "role": "assistant",
        "tool_calls": [{"id": "tc-1", "function": {"name": "Bash", "arguments": "{}"}}],
    })
    assert tracker.agents["root"].state == "executing"

    tracker.process_message({"role": "assistant", "content": "Done!"})
    assert tracker.agents["root"].state == "idle"


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
