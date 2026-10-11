"use client";
import { useState } from 'react';
import type { Inquiry } from '@/lib/backend';

export default function AdminMessages({ messages, onRead }: { messages: Inquiry[]; onRead: (message: Inquiry) => Promise<void> }) {
  const [filter, setFilter] = useState<'inbox' | 'unread'>('inbox');
  const [opened, setOpened] = useState<string | null>(null);
  const unread = messages.filter(message => !message.readAt).length;
  const visible = messages.filter(message => filter === 'inbox' || !message.readAt || message.id === opened)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <div className="admin-inbox">
    <nav className="admin-inbox-tabs" aria-label="Message folders">
      <button type="button" aria-current={filter === 'inbox' ? 'page' : undefined} onClick={() => { setFilter('inbox'); setOpened(null); }}>Inbox <span>{messages.length}</span></button>
      <button type="button" aria-current={filter === 'unread' ? 'page' : undefined} onClick={() => { setFilter('unread'); setOpened(null); }}>Unread <span>{unread}</span></button>
    </nav>
    <div className="admin-inbox-list">
      {visible.length ? visible.map(message => <article className={`admin-inbox-item${!message.readAt ? ' unread' : ''}`} key={message.id}>
        <button className="admin-inbox-row" type="button" aria-expanded={opened === message.id} aria-controls={`message-${message.id}`}
          onClick={() => {
            if (opened === message.id) setOpened(null);
            else { setOpened(message.id); void onRead(message); }
          }}>
          <span className="admin-inbox-avatar" aria-hidden="true">{message.name.trim().charAt(0).toUpperCase()}</span>
          <span className="admin-inbox-sender">{message.name}{!message.readAt && <span className="admin-inbox-dot" aria-label="Unread" />}</span>
          <span className="admin-inbox-preview"><span>{message.message}</span><small>{message.kind === 'wholesale' ? 'Wholesale inquiry' : 'Contact inquiry'}</small></span>
          <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={opened === message.id ? 'expanded' : ''} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {opened === message.id && <div className="admin-inbox-body" id={`message-${message.id}`}>
          <a href={`mailto:${message.email}`}>{message.email}</a>
          {message.business && <p>{message.business} · {message.quantity || 'Quantity not specified'}</p>}
          <p className="pre-wrap">{message.message}</p>
          <small>{new Date(message.createdAt).toLocaleString()}</small>
        </div>}
      </article>) : <p className="admin-inbox-empty">{filter === 'unread' ? 'No unread messages.' : 'No messages yet.'}</p>}
    </div>
  </div>;
}
