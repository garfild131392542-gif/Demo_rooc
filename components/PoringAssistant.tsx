'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X } from 'lucide-react';

export default function PoringAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: 'หยดน้ำ! Poring ผู้ช่วยสะพายเป้พร้อมแล้วครับ มีอะไรให้ช่วยในกิลด์ไหม?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth"
      });
    }
  }, [messages, isLoading, isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const maxRetries = 3;
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        const response = await fetch('/api/poring-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            question: input
          })
        });

        if (response.ok) {
          const data = await response.json();

          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: data.answer
            }
          ]);

          success = true;
        } else if (response.status === 503) {
          attempt++;
          console.warn(`ติด 503 รอบที่ ${attempt}, กำลังลองใหม่...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw new Error('Server Error');
        }
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: 'หยดน้ำ! Poring พยายามแล้วแต่ระบบยังไม่ว่างเลยครับ คิ้วท์!'
            }
          ]);
        }
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <motion.div
        // 🌟 ปรับระยะห่างจากขอบจอ: มือถือให้ชิดขอบ (4) จอใหญ่ให้ห่างออก (10)
        className="absolute bottom-4 right-4 sm:bottom-10 sm:right-10 pointer-events-auto flex flex-col items-end"
        initial={{ y: 0 }}
        animate={{ y: [0, -10, 0] }} 
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              // 🌟 จุดสำคัญ: ปรับ w และ h ให้เป็นแบบ Responsive รองรับทั้งจอเล็ก/จอใหญ่
              className="bg-white/90 backdrop-blur-sm border-2 border-pink-300 rounded-xl shadow-xl p-3 sm:p-4 mb-2 sm:mb-4 w-[calc(90vw-2rem)] sm:w-96 h-[70vh] sm:h-[32rem] max-h-[85vh] flex flex-col overflow-hidden origin-bottom-right"
            >
              <div className="flex justify-between items-center border-b pb-2 mb-2">
                <h3 className="font-bold text-pink-600 flex items-center gap-2 text-sm sm:text-base">
                  Poring Guild Helper
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </h3>
                <button onClick={toggleChat} className="cursor-pointer text-gray-400 hover:text-red-500 transition p-1">
                  <X size={18} />
                </button>
              </div>
              
              {/* พื้นที่แสดงข้อความ */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 sm:pr-2 text-xs sm:text-sm scrollbar-thin scrollbar-thumb-pink-200">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-2.5 rounded-lg max-w-[85%] ${msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-pink-100 text-pink-900'} shadow-sm whitespace-pre-wrap`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="p-2.5 rounded-lg bg-pink-100 text-pink-900 shadow-sm italic flex items-center gap-1">
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse delay-100">●</span>
                      <span className="animate-pulse delay-200">●</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="ถามเรื่องกิลด์มาได้เลย..."
                  className="flex-1 border-2 border-pink-200 rounded-lg p-2 text-xs sm:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 transition"
                  rows={2}
                  disabled={isLoading}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className={`bg-pink-500 text-white p-2 sm:p-3 rounded-lg hover:bg-pink-600 transition flex items-center justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Send size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div 
          onClick={toggleChat}
          className="cursor-pointer hover:scale-110 transition-transform drop-shadow-2xl"
        >
          <img 
            src="/poring.png" 
            alt="Poring with Backpack Guild Helper" 
            // 🌟 บนมือถือตัว Poring จะเล็กลงนิดนึง (w-20) บนคอมขนาดเดิม (sm:w-24)
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain pointer-events-none drop-shadow-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<div class="w-20 h-20 sm:w-24 sm:h-24 bg-pink-400 rounded-full border-4 border-pink-500 shadow-lg flex items-center justify-center text-white text-sm sm:text-base font-bold font-mono">Poring!</div>';
            }}
          />
        </div>

      </motion.div>
    </div>
  );
}