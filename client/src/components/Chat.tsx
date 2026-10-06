import { useRef, useEffect } from 'react';
import type { Message } from '../types/api';
import MessageBubble from './MessageBubble';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';
import MessageInput from './MessageInput';

interface Props {
  messages: Message[];
  loading: boolean;
  error: string | null;
  onSend: (message: string) => void;
  onDismissError: () => void;
}

export default function Chat({ messages, loading, error, onSend, onDismissError }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && <LoadingIndicator />}
      </div>

      {/* Error banner */}
      {error && <ErrorMessage message={error} onDismiss={onDismissError} />}

      {/* Input */}
      <MessageInput onSend={onSend} disabled={loading} />
    </div>
  );
}
