import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, ScrollText } from 'lucide-react';
import Chat from './components/Chat';
import StatePanel from './components/StatePanel';
import DocumentPreview from './components/DocumentPreview';
import type { Message, PersonalWishesState } from './types/api';
import * as api from './services/api';
import { createEmptyState } from './lib/state';

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<PersonalWishesState>(createEmptyState());
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  // ─── Initialize session on mount ────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await api.createSession();
        if (cancelled) return;
        setSessionId(res.sessionId);
        setState(res.state);
        setDocument(res.document);
        // Show the greeting
        setMessages([{ role: 'assistant', content: res.assistantMessage }]);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof api.ApiError
          ? err.message
          : 'Failed to connect to the server. Make sure the backend is running on port 3000.';
        setError(msg);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ─── Send message ───────────────────────────────────────────
  const handleSend = useCallback(async (text: string) => {
    if (!sessionId || loading) return;

    // Show user message immediately
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    try {
      const res = await api.sendMessage(sessionId, text);

      // Update state from backend
      setState(res.state);
      setDocument(res.document);

      // Show assistant response
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.assistantMessage },
      ]);

      // Show LLM error if present but recoverable
      if (res.error) {
        setError(res.error);
      }
    } catch (err) {
      const msg = err instanceof api.ApiError
        ? err.message
        : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [sessionId, loading]);

  // ─── Reset session ──────────────────────────────────────────
  const handleReset = useCallback(async () => {
    if (!sessionId) return;

    const confirmed = window.confirm(
      'Are you sure you want to start over? All conversation and collected information will be cleared.'
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.resetSession(sessionId);
      setState(res.state);
      setDocument(res.document);
      setMessages([
        {
          role: 'assistant',
          content: 'Session reset. Let\'s start fresh — could you please tell me your full name?',
        },
      ]);
    } catch (err) {
      const msg = err instanceof api.ApiError
        ? err.message
        : 'Failed to reset session.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // ─── Initializing screen ────────────────────────────────────
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Connecting to assistant…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col">
      {/* ─── Header ──────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <ScrollText size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800">
              Document Intake Assistant
            </h1>
            <p className="text-xs text-slate-500">
              Create your fictional Personal Wishes Document through conversation
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          disabled={loading || !sessionId}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600
            border border-slate-200 rounded-lg px-3 py-1.5
            hover:border-red-200 hover:bg-red-50
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors"
        >
          <RotateCcw size={13} />
          Start Over
        </button>
      </header>

      {/* ─── Main content ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left: Conversation */}
        <main className="flex-1 lg:w-[60%] flex flex-col min-h-0 border-r border-slate-200">
          <Chat
            messages={messages}
            loading={loading}
            error={error}
            onSend={handleSend}
            onDismissError={() => setError(null)}
          />
        </main>

        {/* Right: State + Document */}
        <aside className="lg:w-[40%] overflow-y-auto p-4 space-y-4 scrollbar-thin bg-slate-50/80">
          <StatePanel state={state} />
          <DocumentPreview document={document} />
        </aside>
      </div>
    </div>
  );
}
