import React, { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../services/db';

interface ChatMessage {
    id: number;
    role: 'user' | 'bot';
    text: string;
    isError?: boolean;
}

const WELCOME: ChatMessage = {
    id: 0,
    role: 'bot',
    text: 'Hi! I\'m the Srikara assistant. How can I help You?.'
};

/**
 * Floating AI icon (bottom-right). Click it to open the chat window.
 * Each message is sent to POST /api/chat, which the server forwards to the AI agent.
 */
export const ChatBot: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const nextId = useRef(1);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const threadIdRef = useRef<string | null>(null);

    // Keep the newest message in view and focus the box when the window opens
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending, open]);
    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const push = (role: ChatMessage['role'], text: string, isError = false) =>
        setMessages(prev => [...prev, { id: nextId.current++, role, text, isError }]);


    const send = async () => {
        const text = input.trim();
        if (!text || sending) return;

        setInput('');
        push('user', text);
        setSending(true);

        try {
           const res = await api<{ reply: string; thread_id?: string }>('POST', '/api/chat', {
  message: text,
  thread_id: threadIdRef.current
});

// Don't throw away a good answer just because the thread id is missing
if (res.thread_id) threadIdRef.current = res.thread_id;

push('bot', res.reply);
        
        } catch (err: any) {
            push(
                'bot',
                err.message || 'Something went wrong. Please try again.',
                true
            );
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };


    return (
        <>
            {open && (
                <div className="fixed z-50 bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[32rem] max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-red-700 flex items-center justify-center">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-sm font-bold leading-tight">Srikara Assistant</div>

                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => {
                                    if (sending) return;

                                    threadIdRef.current = null;
                                    nextId.current = 1;
                                    setMessages([WELCOME]);
                                    setInput('');
                                }}
                                disabled={sending}
                                title="Clear chat"
                                aria-label="Clear chat"
                                className="p-1.5 text-slate-400 hover:text-white rounded disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                title="Close"
                                aria-label="Close chat"
                                className="p-1.5 text-slate-400 hover:text-white rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50">
                        {messages.map(m => (
                            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap break-words ${m.role === 'user'
                                        ? 'bg-red-700 text-white rounded-br-sm'
                                        : m.isError
                                            ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                                        }`}
                                >
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {sending && (
                            <div className="flex justify-start">
                                <div className="px-3 py-2 rounded-2xl rounded-bl-sm bg-white border border-slate-200 text-slate-500 text-xs flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-slate-200 bg-white shrink-0">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                                maxLength={2000}
                                placeholder="Type your question..."
                                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600"
                            />
                            <button
                                onClick={send}
                                disabled={!input.trim() || sending}
                                aria-label="Send message"
                                className="p-2.5 bg-red-700 hover:bg-red-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* The AI icon */}
            <button
                onClick={() => setOpen(o => !o)}
                aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
                title="Ask the AI assistant"
                className="fixed z-50 bottom-4 right-4 sm:right-6 w-14 h-14 rounded-full bg-red-700 hover:bg-red-800 text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105"
            >
                {open ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}

            </button>
        </>
    );
};

