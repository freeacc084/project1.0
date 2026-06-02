import React, { useState } from "react";
import { Menu, X, Gem, User, Shield, HelpCircle, LogOut, MessageSquareCode } from "lucide-react";
import { UserData, UserRank } from "../types";

interface MyNavbarProps {
  currentUser: { username: string } & UserData;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  logout: () => void;
}

export default function MyNavbar({ currentUser, activeTab, setActiveTab, isChatOpen, setIsChatOpen, logout }: MyNavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState<boolean>(false);

  const isPrivileged = currentUser.rank === 'admin' || currentUser.rank === 'overlord';

  const menuItems = [
    { id: 'spin', label: '🎡 Spin Wheel' },
    { id: 'towers', label: '🏰 Towers Ascent' },
    { id: 'mines', label: '💣 Safe Mines' },
    { id: 'plinko', label: '🟢 Plinko' },
    { id: 'leaderboard', label: '🏆 Leaderboard' },
    { id: 'missions', label: '🎯 Season Missions' },
    { id: 'profile', label: '👤 Account Profile' },
    ...(isPrivileged ? [{ id: 'admin', label: '⚙️ Admin Desk' }] : [])
  ];

  const getRankBadgeColor = (rank: UserRank) => {
    switch (rank) {
      case 'overlord':
        return 'text-purple-400 border-purple-500/30 bg-purple-950/20';
      case 'admin':
        return 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-800/10';
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-bg-panel min-h-[75px] border-b border-border-color shadow-lg sticky top-0 z-50 px-4 md:px-8 py-2 md:py-0 flex items-center">
      <div className="w-full flex justify-between items-center">
            <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-default select-none">
            <span className="font-display font-black text-white text-base md:text-lg tracking-widest uppercase flex items-center gap-1.5">
              💎 PS99 <span className="text-cyan-400">Core</span>
            </span>
          </div>
          <div className="hidden md:flex bg-bg-input border border-border-color rounded-xl p-1 gap-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`taskbar-btn px-4 py-2 text-xs font-semibold tracking-wide font-display rounded-lg transition-all cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-primary text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          
          <div className="relative group">
            <div 
              onClick={() => setIsTooltipOpen(!isTooltipOpen)}
              onMouseEnter={() => setIsTooltipOpen(true)}
              onMouseLeave={() => setIsTooltipOpen(false)}
              className="bg-bg-card border border-border-color rounded-xl px-3 py-2 text-xs font-bold font-display text-cyan-400 shadow cursor-help flex items-center gap-1.5 active:scale-95 transition-all select-none"
            >
              <Gem className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[11px] md:text-xs">
                {currentUser?.balance?.toLocaleString() ?? 0}
              </span>
            </div>

            {isTooltipOpen && (
              <div className="absolute top-full mt-3 right-0 w-[220px] bg-bg-panel border border-cyan-500/35 rounded-lg p-3.5 shadow-2xl z-50 text-xs animate-in fade-in slide-in-from-top-1">
                <div className="absolute top-[-6px] right-8 w-3 h-3 bg-bg-panel border-l border-t border-cyan-500/35 rotate-45" />
                <h5 className="font-display text-[10px] uppercase font-bold text-cyan-400 tracking-wider mb-2 border-b border-white/5 pb-1">
                  Active Coordinates
                </h5>
                <div className="space-y-1.5 text-slate-300 font-sans text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">ID:</span>
                    <span className="text-white font-semibold">{currentUser.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">ROLE:</span>
                    <span className="text-white font-semibold uppercase">{currentUser.rank}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1.5">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">LIQUID GEMS:</span>
                    <span className="text-emerald-400 font-extrabold">{currentUser.balance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between" title="Calculated based on the 2/3 real-time withdraw rate.">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">Est. Cashout (2/3):</span>
                    <span className="text-pink-400 font-extrabold">
                      {Math.floor((currentUser.balance * 2) / 3).toLocaleString()} 💎
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`px-3 py-2 border rounded-xl text-xs font-semibold hover:border-cyan-400 hover:bg-cyan-500/5 transition-all cursor-pointer flex items-center gap-1.5 ${
              isChatOpen 
                ? 'bg-cyan-500 border-cyan-500 text-black shadow-lg shadow-cyan-500/25' 
                : 'bg-bg-card border-border-color text-white'
            }`}
          >
            <MessageSquareCode className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Radio Chat</span>
          </button>

          <button
            onClick={logout}
            className="hidden md:flex border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/10 text-rose-500 px-3 py-2 rounded-xl text-xs font-bold font-display uppercase tracking-widest cursor-pointer items-center gap-1 transition-all"
            title="Disconnect current session"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="block md:hidden text-white hover:text-cyan-400 focus:outline-none p-1.5 border border-border-color bg-bg-card/40 rounded-lg cursor-pointer transition-all"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5 animate-in spin-in-90 duration-200" />
            ) : (
              <Menu className="h-5 w-5 animate-in spin-in-[-90] duration-200" />
            )}
          </button>

        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="absolute top-[75px] left-0 right-0 bg-bg-panel border-b border-border-color shadow-2xl z-50 p-4 block md:hidden animate-in slide-in-from-top-3 duration-300">
          <div className="flex flex-col gap-2">
            
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full py-3 text-xs font-bold tracking-wider font-display rounded-lg transition-all text-left px-4 cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-primary text-white shadow shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white bg-bg-card border border-border-color/40'
                }`}
              >
                {item.label}
              </button>
            ))}

            <div className="mt-2.5 p-3 bg-bg-input border border-border-color/80 rounded-lg flex justify-between items-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-black block mb-0.5">Logged In As</span>
                <span className="text-white font-semibold font-display text-xs">{currentUser.username}</span>
              </div>
              <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider ${getRankBadgeColor(currentUser.rank)}`}>
                {currentUser.rank}
              </span>
            </div>

            <button
              onClick={logout}
              className="mt-1 w-full border border-rose-500/20 hover:border-rose-500 hover:bg-rose-500/10 text-rose-500 py-3 rounded-lg text-xs font-bold font-display uppercase tracking-widest text-center cursor-pointer flex justify-center items-center gap-2 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" /> Disconnect Session
            </button>

          </div>
        </div>
      )}
    </nav>
  );
}
