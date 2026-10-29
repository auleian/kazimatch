import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useData } from './DataProvider';
import { matchCandidate, toCriteria } from '../lib/matching';
import { useToast } from '../components/ui';

export type NotificationKind = 'interest' | 'recommendation' | 'rejection' | 'shortlisted';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  at: number;
  link: string;
  unread: boolean;
}

const MAX_ITEMS = 30;
/** On first ever load, only the last few days count as unread so new users aren't flooded. */
const FIRST_LOAD_WINDOW = 3 * 24 * 60 * 60 * 1000;

const readSeen = (key: string): number | null => {
  try {
    const v = localStorage.getItem(key);
    return v ? Number(v) || null : null;
  } catch {
    return null;
  }
};
const writeSeen = (key: string, v: number) => {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* storage unavailable: read state lasts for this session only */
  }
};

export function useNotifications() {
  const { user } = useAuth();
  const { view, actingCandidate: me, candidates, opportunities, shortlists, interests, rejections } = useData();
  const toast = useToast();

  const key = user && view ? `kazimatch:notif-seen:${user.uid}:${view}${view === 'candidate' ? `:${me?.id ?? 'none'}` : ''}` : null;
  const [lastSeen, setLastSeen] = useState(0);

  useEffect(() => {
    if (!key) return;
    let seen = readSeen(key);
    if (seen == null) {
      seen = Date.now() - FIRST_LOAD_WINDOW;
      writeSeen(key, seen);
    }
    setLastSeen(seen);
  }, [key]);

  const raw = useMemo(() => {
    if (!user || !view) return [];
    const oppById = new Map(opportunities.map((o) => [o.id, o]));
    const out: Omit<NotificationItem, 'unread'>[] = [];

    if (view === 'employer') {
      const candName = new Map(candidates.map((c) => [c.id, c.name]));
      for (const i of interests) {
        const o = oppById.get(i.opportunityId);
        if (!o || o.employerId !== user.uid) continue;
        out.push({
          id: `interest:${i.id}`,
          kind: 'interest',
          title: `${candName.get(i.candidateId) ?? 'A candidate'} is interested in ${o.title}`,
          body: i.message || undefined,
          at: i.createdAt,
          link: `/employer/candidates/${i.candidateId}?opp=${o.id}`,
        });
      }
    } else if (me) {
      const rejected = new Set(rejections.filter((r) => r.candidateId === me.id).map((r) => r.opportunityId));
      for (const o of opportunities) {
        if (o.status !== 'open' || rejected.has(o.id)) continue;
        if (!matchCandidate(toCriteria(o), me).eligible) continue;
        out.push({
          id: `rec:${o.id}`,
          kind: 'recommendation',
          title: `New match: ${o.title}`,
          body: `${o.employerName} · ${o.location}`,
          at: o.createdAt,
          link: `/candidate/opportunities/${o.id}`,
        });
      }
      for (const r of rejections) {
        if (r.candidateId !== me.id) continue;
        const o = oppById.get(r.opportunityId);
        out.push({
          id: `rej:${r.id}`,
          kind: 'rejection',
          title: o ? `Not selected for ${o.title} at ${o.employerName}` : 'Not selected for an opportunity',
          body: r.reason ? `Reason: ${r.reason}` : undefined,
          at: r.createdAt,
          link: `/candidate/opportunities/${r.opportunityId}`,
        });
      }
      for (const s of shortlists) {
        if (s.candidateId !== me.id) continue;
        const o = oppById.get(s.opportunityId);
        if (!o) continue;
        out.push({
          id: `sl:${s.id}`,
          kind: 'shortlisted',
          title: `Shortlisted for ${o.title}`,
          body: o.employerName,
          at: s.createdAt,
          link: `/candidate/opportunities/${o.id}`,
        });
      }
    }
    return out.sort((a, b) => b.at - a.at).slice(0, MAX_ITEMS);
  }, [user, view, me, candidates, opportunities, shortlists, interests, rejections]);

  const items: NotificationItem[] = useMemo(() => raw.map((n) => ({ ...n, unread: n.at > lastSeen })), [raw, lastSeen]);
  const unread = items.filter((n) => n.unread).length;

  const markAllRead = useCallback(() => {
    if (!key) return;
    const now = Date.now();
    writeSeen(key, now);
    setLastSeen(now);
  }, [key]);

  // Toast for items that arrive while the app is open (created after mount).
  const mountedAt = useRef(Date.now());
  const toasted = useRef(new Set<string>());
  useEffect(() => {
    for (const n of items) {
      if (!n.unread || n.at <= mountedAt.current || toasted.current.has(n.id)) continue;
      toasted.current.add(n.id);
      toast(n.title);
    }
  }, [items, toast]);

  return { items, unread, markAllRead };
}
