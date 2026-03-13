export interface Session {
  session_id: string;
  directory_name: string;
  start_time: string;
  end_time: string | null;
  title: string;
  username: string;
  working_directory: string;
  project_name: string;
  git_branch: string | null;
  git_commit: string | null;
  stats: Record<string, number>;
  duration_seconds: number;
  cost: number;
  total_tokens: number;
  tools_available: string[];
  is_active: boolean;
  messages?: Message[];
  agent_count: number;
  total_cost_with_agents: number;
  total_tokens_with_agents: number;
  agents?: Session[];
}

export interface Message {
  role: string;
  content: string | null;
  message_id: string | null;
  name: string | null;
  tool_call_id: string | null;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface AggregateStats {
  total_sessions: number;
  total_cost: number;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_duration_seconds: number;
  total_steps: number;
  total_tool_calls_succeeded: number;
  total_tool_calls_failed: number;
  total_tool_calls_rejected: number;
  avg_tokens_per_second: number;
  avg_cost_per_session: number;
  avg_duration_per_session: number;
  avg_tokens_per_session: number;
}

export interface TimelineEntry extends AggregateStats {
  date: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface PlayerStats {
  username: string;
  productivity_score: number;
  current_streak: number;
  longest_streak: number;
  total_sessions: number;
  total_cost: number;
  badges: Badge[];
}

export interface GamificationData {
  total_badges: number;
  all_badges: Badge[];
  players: PlayerStats[];
}
