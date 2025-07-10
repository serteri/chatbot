'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function EmbedPage() {
  const searchParams = useSearchParams();
  const chatbotId = searchParams.get('chatbotId');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !chatbotId) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: input.trim() }
    ];
    setMessages(newMessages);
    setIsLoading(true);
    setInput('');

    try {
      const res = await fetch('/api/public-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, chatbotId })
      });

      const data = await res.json();

      if (res.ok) {
        setMessages([...newMessages, { role: 'assistant', content: data.text }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: '❗Bir hata oluştu: ' + data.error }]);
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: '❗Sunucu hatası.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!chatbotId) {
    return <div className="p-4 text-red-500">❗Chatbot kimliği eksik. URL şu şekilde olmalı: <code>?chatbotId=abc123</code></div>;
  }

  return (
    <div className="h-screen bg-base-200 flex flex-col p-4 text-sm font-sans">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}>
            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </div>

      <div className="flex gap-2">
        <textarea
          className="textarea textarea-bordered flex-1"
          rows={1}
          placeholder="Bir şey yazın..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button className="btn btn-primary" onClick={sendMessage} disabled={isLoading}>
          {isLoading ? '...' : 'Gönder'}
        </button>
      </div>
    </div>
  );
}