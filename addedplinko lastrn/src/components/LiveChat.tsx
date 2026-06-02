import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, Flame } from "lucide-react";
import { ChatMessage, UserRank } from "../types";

interface LiveChatProps {
  currentUser: { username: string; rank: UserRank };
  chatMessages: ChatMessage[];
  broadcastMessage: (msg: string) => Promise<void>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function LiveChat({ currentUser, chatMessages, broadcastMessage, isOpen, setIsOpen }: LiveChatProps) {
  const [chatText, setChatText] = useState<string>("");
  const wallEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (wallEndRef.current) {
      wallEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isOpen]);

  const handleSend = async () => {
    const trimmed = chatText.trim();
    if (!trimmed) return;
    if (trimmed.length > 300) return;

    await broadcastMessage(trimmed);
    setChatText("");
  };

  const getRankColor = (rank: UserRank) => {
    switch (rank) {
      case 'overlord':
        return '#8b5cf6';
      case 'admin':
        return '#06b6d4';
      default:
        return '#cbd5e1';
    }
  };

  return (
    <div
      className={`fixed right-0 top-[75px] w-[310px] md:w-[330px] h-[calc(100vh-75px)] bg-bg-panel border-l border-border-color shadow-2xl z-40 flex flex-col transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="p-4 border-b border-border-color flex justify-between items-center bg-bg-darker/40">
        <h4 className="font-display font-medium text-xs tracking-wider uppercase text-white flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-cyan-400" /> Operational Net Chat
        </h4>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping box-shadow shadow-emerald-500/50"></span>
          Live Sync
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 custom-scrollbar bg-bg-panel/40">
        {chatMessages && chatMessages.length > 0 ? (
          chatMessages.map((msg, idx) => {
            const roleColor = getRankColor(msg.rank);
            const isOverlordColor = msg.rank === 'overlord';
            const isAdminColor = msg.rank === 'admin';

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                  isOverlordColor
                    ? 'bg-purple-950/5 border-purple-500/10'
                    : isAdminColor
                      ? 'bg-cyan-950/5 border-cyan-500/10'
                      : 'bg-bg-input/50 border-border-color/30'
                }`}
              >
                <div className="flex justify-between items-center font-display gap-2">
                  <span className="font-bold flex items-center gap-1.5 text-slate-100 flex-wrap" style={{ color: roleColor }}>
                    {msg.username}
                    <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-500 px-1 py-0.5 rounded uppercase select-none">
                      {msg.rank}
                    </span>
                    {msg.customTag && (
                      <span 
                        className="text-[8px] px-1.5 py-0.5 rounded uppercase select-none font-black tracking-wider border"
                        style={{ 
                          color: msg.customTagColor || '#ffffff', 
                          borderColor: (msg.customTagColor || '#ffffff') + '33',
                          backgroundColor: (msg.customTagColor || '#ffffff') + '0c'
                        }}
                      >
                        {msg.customTag}
                      </span>
                    )}
                  </span>
                  <span className="text-[9px] text-slate-500 font-sans tracking-tight shrink-0">
                    {msg.timestamp}
                  </span>
                </div>
                <p className="text-slate-300 font-body select-text word-break-any leading-relaxed">
                  {msg.text}
                </p>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-slate-600 italic text-xs py-10">
            No active radio transmissions found.
          </div>
        )}
        <div ref={wallEndRef} />
      </div>

      <div className="p-4 border-t border-border-color bg-bg-darker/60 flex items-center gap-2">
        <input
          type="text"
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          maxLength={300}
          className="flex-1 bg-bg-input border border-border-color hover:border-slate-700 focus:border-cyan-500 text-xs text-white rounded-lg px-3.5 py-2.5 outline-none transition-all"
          placeholder="Send coordinates or broadcast..."
        />
        <button
          onClick={handleSend}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg p-2.5 cursor-pointer flex items-center justify-center transition-all shadow shadow-indigo-600/25"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
