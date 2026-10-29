import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BookmarkCheck, CheckCheck, Heart, Sparkles, XCircle } from 'lucide-react';
import { useData } from '../data/DataProvider';
import { useNotifications, type NotificationKind } from '../data/notifications';
import '../styles/notifications.css';

const ICONS: Record<NotificationKind, typeof Bell> = {
  interest: Heart,
  recommendation: Sparkles,
  rejection: XCircle,
  shortlisted: BookmarkCheck,
};

function timeAgo(at: number) {
  const s = Math.max(0, (Date.now() - at) / 1000);
  if (s < 60) return 'just now';
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)}d ago`;
  return new Date(at).toLocaleDateString();
}

export function NotificationBell() {
  const { view } = useData();
  const { items, unread, markAllRead } = useNotifications();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  // Ids that were unread when the panel opened, so they stay highlighted while it's open.
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const toggle = () => {
    if (!open) {
      setFresh(new Set(items.filter((n) => n.unread).map((n) => n.id)));
      markAllRead();
    }
    setOpen((o) => !o);
  };

  if (!view) return null;

  return (
    <div className="notif" ref={ref}>
      <button className="notif-btn" onClick={toggle} aria-expanded={open} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
        <Bell size={16} />
        {unread > 0 && <span className="notif-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-pop glass" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <b>Notifications</b>
            <button
              className="notif-mark"
              onClick={() => {
                markAllRead();
                setFresh(new Set());
              }}
              disabled={fresh.size === 0 && unread === 0}
            >
              <CheckCheck size={13} /> Mark all as read
            </button>
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">
              <Bell size={20} />
              <span>Nothing here yet.</span>
              <span className="muted small">We&rsquo;ll let you know when something happens.</span>
            </div>
          ) : (
            <ul className="notif-list">
              {items.map((n) => {
                const Icon = ICONS[n.kind];
                const isNew = n.unread || fresh.has(n.id);
                return (
                  <li key={n.id}>
                    <button
                      className={`notif-item${isNew ? ' notif-new' : ''}`}
                      onClick={() => {
                        setOpen(false);
                        nav(n.link);
                      }}
                    >
                      <span className={`notif-icon notif-${n.kind}`}><Icon size={14} /></span>
                      <span className="notif-text">
                        <span className="notif-title">{n.title}</span>
                        {n.body && <span className="notif-body">{n.body}</span>}
                        <span className="notif-time">{timeAgo(n.at)}</span>
                      </span>
                      {isNew && <span className="notif-dot" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
