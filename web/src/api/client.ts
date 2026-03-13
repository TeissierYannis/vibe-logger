import { useState, useEffect, useRef } from 'react';
import type { Session, AggregateStats, TimelineEntry, GamificationData } from './types';

const BASE = '';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE}${url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useSessions() {
  const [data, setData] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchJson<Session[]>('/api/sessions').then(setData).finally(() => setLoading(false));
  }, []);
  return { data, loading, refetch: () => fetchJson<Session[]>('/api/sessions').then(setData) };
}

export function useSession(dirName: string | null) {
  const [data, setData] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!dirName) return;
    setLoading(true);
    fetchJson<Session>(`/api/sessions/${dirName}`).then(setData).finally(() => setLoading(false));
  }, [dirName]);
  return { data, loading };
}

export function useStats() {
  const [data, setData] = useState<AggregateStats | null>(null);
  useEffect(() => { fetchJson<AggregateStats>('/api/stats').then(setData); }, []);
  return data;
}

export function useTimeline(days = 30) {
  const [data, setData] = useState<TimelineEntry[]>([]);
  useEffect(() => { fetchJson<TimelineEntry[]>(`/api/stats/timeline?days=${days}`).then(setData); }, [days]);
  return data;
}

export function useProjects() {
  const [data, setData] = useState<Record<string, any>>({});
  useEffect(() => { fetchJson<Record<string, any>>('/api/stats/projects').then(setData); }, []);
  return data;
}

export function useBranches() {
  const [data, setData] = useState<Record<string, any>>({});
  useEffect(() => { fetchJson<Record<string, any>>('/api/stats/branches').then(setData); }, []);
  return data;
}

export function useGamification() {
  const [data, setData] = useState<GamificationData | null>(null);
  useEffect(() => { fetchJson<GamificationData>('/api/gamification').then(setData); }, []);
  return data;
}

export function useWebSocket() {
  const [messages, setMessages] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws/live`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setMessages(prev => [...prev.slice(-100), msg]);
      } catch {}
    };

    return () => ws.close();
  }, []);

  return { messages, connected };
}
