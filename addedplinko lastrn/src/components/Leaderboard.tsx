import React, { useState } from "react";
import { UserData, UserRank } from "../types";
import { Gem, Trophy, Coins, Flame, ArrowUpRight, Award, Shield } from "lucide-react";

interface LeaderboardProps {
  dbUsers: { [username: string]: UserData & { password?: string } };
  currentUser: any;
}

export default function Leaderboard({ dbUsers, currentUser }: LeaderboardProps) {
  const [filterType, setFilterType] = useState<'balance' | 'totalWager' | 'totalCashout' | 'totalDeposit'>('balance');

  const usersArray = Object.entries(dbUsers).map(([username, data]) => ({
    username,
    balance: data.balance || 0,
    totalWager: data.totalWager || 0,
    totalCashout: data.totalCashout || 0,
    totalDeposit: data.totalDeposit || 0,
    rank: data.rank || 'member',
    customTag: data.customTag || '',
    customTagColor: data.customTagColor || ''
  }));

  const sortedUsers = [...usersArray].sort((a, b) => b[filterType] - a[filterType]).slice(0, 50);

  const totalBalanceInPlay = usersArray.reduce((sum, u) => sum + u.balance, 0);
  const totalWageredAllTime = usersArray.reduce((sum, u) => sum + u.totalWager, 0);
  const totalCashoutAllTime = usersArray.reduce((sum, u) => sum + u.totalCashout, 0);

  const getRankStyle = (rank: UserRank) => {
    switch (rank) {
      case 'overlord':
        return { text: 'Overlord', color: 'text-purple-400 bg-purple-950/20 border-purple-500/30' };
      case 'admin':
        return { text: 'Admin', color: 'text-cyan-400 bg-cyan-950/20 border-cyan-500/30' };
      default:
        return { text: 'Member', color: 'text-slate-400 bg-slate-800/20 border-slate-700/50' };
    }
  };

  const getLeaderboardIcon = (index: number) => {
    switch (index) {
      case 0:
        return <span className="text-xl filter drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">🥇</span>;
      case 1:
        return <span className="text-xl filter drop-shadow-[0_0_8px_rgba(148,163,184,0.5)]">🥈</span>;
      case 2:
        return <span className="text-xl filter drop-shadow-[0_0_8px_rgba(180,83,9,0.5)]">🥉</span>;
      default:
        return <span className="text-xs font-mono font-bold text-slate-500 w-6 text-center">#{index + 1}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0b0c14] border border-border-color rounded-xl p-5 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/5 blur-xl rounded-full" />
          <h5 className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5">
            <Gem className="h-3 w-3 text-cyan-400" /> Circulating Wealth
          </h5>
          <div className="text-lg font-display font-black text-cyan-400 font-mono">
            💎 {totalBalanceInPlay.toLocaleString()}
          </div>
          <p className="text-[9px] text-slate-400 uppercase mt-1">Total Gem liquid liquidity index</p>
        </div>

        <div className="bg-[#0b0c14] border border-border-color rounded-xl p-5 relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-500/5 blur-xl rounded-full" />
          <h5 className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5">
            <Flame className="h-3 w-3 text-purple-400" /> Wager Action Total
          </h5>
          <div className="text-lg font-display font-black text-purple-400 font-mono">
            💎 {totalWageredAllTime.toLocaleString()}
          </div>
          <p className="text-[9px] text-slate-400 uppercase mt-1">Accumulated high stakes wagers index</p>
        </div>

        <div className="bg-[#0b0c14] border border-border-color rounded-xl p-5 relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/5 blur-xl rounded-full" />
          <h5 className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1.5 flex items-center gap-1.5">
            <Coins className="h-3 w-3 text-rose-400" /> Total Cashed Out
          </h5>
          <div className="text-lg font-display font-black text-rose-400 font-mono">
            💎 {totalCashoutAllTime.toLocaleString()}
          </div>
          <p className="text-[9px] text-slate-400 uppercase mt-1">Gems successfully compiled to vaults</p>
        </div>
      </div>

      <div className="bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-color/60 pb-5 mb-5 relative z-10">
          <div>
            <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-yellow-500 animate-bounce" /> HIGH-ROLLER HALL OF FAME
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-sans mt-1">
              Active scoreboard synchronized in realtime over Firestore networks.
            </p>
          </div>

          <div className="flex bg-bg-input border border-border-color/60 p-1 rounded-xl gap-1 w-full md:w-auto">
            {[
              { id: 'balance', label: 'Wealth', icon: <Gem className="h-3 w-3" /> },
              { id: 'totalWager', label: 'Wagered', icon: <Flame className="h-3 w-3" /> },
              { id: 'totalCashout', label: 'Cashed Out', icon: <Coins className="h-3 w-3" /> },
              { id: 'totalDeposit', label: 'Deposits', icon: <ArrowUpRight className="h-3 w-3" /> },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilterType(btn.id as any)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 text-[10px] font-bold tracking-wide uppercase rounded-lg transition-all cursor-pointer flex-1 md:flex-none ${
                  filterType === btn.id
                    ? 'bg-primary text-white shadow shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-color/40 text-slate-500 text-[10px] uppercase font-black tracking-widest">
                <th className="pb-3.5 pl-3 w-[60px]">Place</th>
                <th className="pb-3.5">High Roller Name</th>
                <th className="pb-3.5">Platform Rank</th>
                <th className="pb-3.5 text-right pr-3">
                  {filterType === 'balance' && 'Liquid gems Balance'}
                  {filterType === 'totalWager' && 'Total Gems Wagered'}
                  {filterType === 'totalCashout' && 'Total Gems Cashed Out'}
                  {filterType === 'totalDeposit' && 'Total Gems Deposited'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sortedUsers.map((user, idx) => {
                const isMe = currentUser && currentUser.username === user.username;
                const rDetails = getRankStyle(user.rank);
                let scoreVal = user[filterType];

                return (
                  <tr 
                    key={user.username} 
                    className={`transition-all ${
                      isMe 
                        ? 'bg-indigo-500/5 font-semibold text-white' 
                        : 'hover:bg-white/[0.01] text-slate-300'
                    }`}
                  >
                    <td className="py-3.5 pl-3 font-display">
                      {getLeaderboardIcon(idx)}
                    </td>
                    <td className="py-3.5 font-display">
                      <div className="flex items-center gap-2">
                        <span className={isMe ? "text-white font-bold" : "text-slate-200 font-medium"}>
                          {user.username}
                        </span>
                        
                        {user.customTag && (
                          <span 
                            className="text-[8px] px-1.5 py-0.5 rounded font-black border uppercase tracking-wider select-none shrink-0"
                            style={{ 
                              color: user.customTagColor || '#ffffff', 
                              borderColor: (user.customTagColor || '#ffffff') + '33',
                              backgroundColor: (user.customTagColor || '#ffffff') + '0c'
                            }}
                          >
                            {user.customTag}
                          </span>
                        )}

                        {isMe && (
                          <span className="text-[7.5px] bg-[#0c2440] text-cyan-400 border border-cyan-500/30 font-display font-black uppercase px-1 rounded tracking-wider">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5">
                      <span className={`text-[8.5px] font-display font-black tracking-widest uppercase px-2 py-0.5 border rounded-full inline-flex items-center gap-1 ${rDetails.color}`}>
                        <Shield className="h-2.5 w-2.5 inline-block" />
                        {rDetails.text}
                      </span>
                    </td>

                    <td className="py-3.5 text-right font-mono font-bold pr-3 text-cyan-400">
                      💎 {scoreVal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}

              {sortedUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500 font-display text-xs uppercase tracking-widest">
                    No users logged inside database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
