from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, date


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: str


@dataclass
class Message:
    role: str  # "user" | "assistant" | "tool"
    content: str | None = None
    message_id: str | None = None
    tool_calls: list[ToolCall] = field(default_factory=list)
    name: str | None = None  # tool name for role="tool"
    tool_call_id: str | None = None


@dataclass
class Session:
    session_id: str
    directory_name: str
    start_time: datetime
    end_time: datetime | None
    title: str
    username: str
    working_directory: str
    git_branch: str | None
    git_commit: str | None
    stats: dict
    messages: list[Message] = field(default_factory=list)
    tools_available: list[str] = field(default_factory=list)
    agents: list[Session] = field(default_factory=list)

    @property
    def duration_seconds(self) -> float:
        if self.end_time and self.start_time:
            return (self.end_time - self.start_time).total_seconds()
        return 0.0

    @property
    def cost(self) -> float:
        return self.stats.get("session_cost", 0.0)

    @property
    def total_tokens(self) -> int:
        return self.stats.get("session_total_llm_tokens", 0)

    @property
    def prompt_tokens(self) -> int:
        return self.stats.get("session_prompt_tokens", 0)

    @property
    def completion_tokens(self) -> int:
        return self.stats.get("session_completion_tokens", 0)

    @property
    def steps(self) -> int:
        return self.stats.get("steps", 0)

    @property
    def tool_calls_succeeded(self) -> int:
        return self.stats.get("tool_calls_succeeded", 0)

    @property
    def tool_calls_failed(self) -> int:
        return self.stats.get("tool_calls_failed", 0)

    @property
    def tool_calls_rejected(self) -> int:
        return self.stats.get("tool_calls_rejected", 0)

    @property
    def tokens_per_second(self) -> float:
        return self.stats.get("tokens_per_second", 0.0)

    @property
    def date(self) -> date:
        return self.start_time.date()

    @property
    def project_name(self) -> str:
        return self.working_directory.rstrip("/").split("/")[-1] if self.working_directory else "unknown"

    @property
    def agent_count(self) -> int:
        return len(self.agents)

    @property
    def total_cost_with_agents(self) -> float:
        return self.cost + sum(a.cost for a in self.agents)

    @property
    def total_tokens_with_agents(self) -> int:
        return self.total_tokens + sum(a.total_tokens for a in self.agents)
