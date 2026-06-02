import React, { useState } from "react";
import { UserData } from "../types";
import { 
  Trophy, 
  Target, 
  Sparkles, 
  Flame, 
  Gem, 
  Crown, 
  CheckCircle2, 
  Lock, 
  Clock, 
  ArrowUpRight, 
  ChevronRight, 
  Compass, 
  Dices,
  CircleDot
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MissionsHQProps {
  currentUser: { username: string } & UserData;
  dbUsers: { [username: string]: UserData };
  claimMissionReward: (missionId: string, rewardAmount: number) => Promise<{ success: boolean; msg: string }>;
  claimLevelMilestone: (level: number, rewardAmount: number) => Promise<{ success: boolean; msg: string }>;
  missionRewards?: { [key: string]: number };
  milestoneRewards?: { [key: string]: number };
}

export default function MissionsHQ({ 
  currentUser, 
  dbUsers, 
  claimMissionReward, 
  claimLevelMilestone,
  missionRewards,
  milestoneRewards
}: MissionsHQProps) {
  const [activeTab, setActiveTab] = useState<'missions' | 'milestones'>('missions');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ isSuccess: boolean; msg: string | null }>({ isSuccess: true, msg: null });

  const freshUser = dbUsers[currentUser.username] || currentUser;

  const totalWager = Number(freshUser.totalWager) || 0;
  

  const calculateLevelDetails = (wagerAmount: number) => {
    const baseVal = 5_000_000;
    const computedLevel = Math.floor(Math.sqrt(wagerAmount / baseVal)) + 1;
    
    const levelStartWager = Math.pow(computedLevel - 1, 2) * baseVal;
    const levelNextWager = Math.pow(computedLevel, 2) * baseVal;
    const progressCurrent = wagerAmount - levelStartWager;
    const progressCap = levelNextWager - levelStartWager;
    const percentage = Math.min(100, Math.max(0, (progressCurrent / progressCap) * 100));

    // Gamified badges based on level
    let titleBadge = "Bronze Gambler";
    let badgeColor = "text-amber-600 border-amber-600/30 bg-amber-950/20";
    
    if (computedLevel >= 15) {
      titleBadge = "👑 Cosmic Overlord Grandmaster";
      badgeColor = "text-purple-400 border-purple-500/40 bg-purple-950/30 shadow-[0_0_15px_rgba(168,85,247,0.25)]";
    } else if (computedLevel >= 10) {
      titleBadge = "⚡ Divine Apex Roller";
      badgeColor = "text-cyan-400 border-cyan-500/40 bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]";
    } else if (computedLevel >= 7) {
      titleBadge = "🔥 Ruby Premium Champion";
      badgeColor = "text-rose-400 border-rose-500/30 bg-rose-955/20";
    } else if (computedLevel >= 4) {
      titleBadge = "✨ Platinum Strategist";
      badgeColor = "text-slate-200 border-slate-350/30 bg-slate-800/30";
    } else if (computedLevel >= 2) {
      titleBadge = "💎 Amber Gladiator";
      badgeColor = "text-yellow-500 border-yellow-500/30 bg-yellow-500/5";
    }

    return {
      level: computedLevel,
      currentXp: progressCurrent,
      maxXp: progressCap,
      percent: percentage,
      title: titleBadge,
      badgeColor,
      nextLvlWager: levelNextWager
    };
  };

  const lvl = calculateLevelDetails(totalWager);

  const totalMinesRound = Number((freshUser as any).minesRoundCount) || 0;
  const totalSpinRound = Number((freshUser as any).spinRoundCount) || 0;
  const totalTowersRound = Number((freshUser as any).towersRoundCount) || 0;
  const completedMissions = (freshUser as any).completedMissions || {};
  const claimedMilestones = (freshUser as any).claimedMilestones || {};

  const missionsList = [
    {
      id: "m_mines_rookie",
      title: "💣 Mines Field Explorer",
      desc: "Deploy and scanner-sweep in Safe Mines 5 distinct rounds.",
      target: 5,
      current: totalMinesRound,
      reward: (missionRewards && missionRewards["m_mines_rookie"]) ?? 20_000_000,
      icon: "💣"
    },
    {
      id: "m_spin_master",
      title: "🎡 Infinite Carousel",
      desc: "Participate in 5 Spin Wheel rotations of high-stakes multipliers.",
      target: 5,
      current: totalSpinRound,
      reward: (missionRewards && missionRewards["m_spin_master"]) ?? 15_000_000,
      icon: "🎡"
    },
    {
      id: "m_towers_climber",
      title: "🏰 Towers Conqueror",
      desc: "Advance and complete 5 Towers Ascent climbs to outstep fate.",
      target: 5,
      current: totalTowersRound,
      reward: (missionRewards && missionRewards["m_towers_climber"]) ?? 25_000_005,
      icon: "🏰"
    },
    {
      id: "m_wager_pioneer",
      title: "💎 Gem-Slinging Gladiator",
      desc: "Wager a dynamic volume of at least 150M gems cumulative across games.",
      target: 150_000_000,
      current: totalWager,
      reward: (missionRewards && missionRewards["m_wager_pioneer"]) ?? 60_000_000,
      icon: "💎",
      isCurrencyFormat: true
    },
    {
      id: "m_unlocked_sweep",
      title: "🔥 Mines Sweep Sweepstakes",
      desc: "Complete 15 games of Safe Mines to claim the ultimate scanner bounty.",
      target: 15,
      current: totalMinesRound,
      reward: (missionRewards && missionRewards["m_unlocked_sweep"]) ?? 75_000_000,
      icon: "✨"
    },
  ];

  const milestoneList = [
    { id: 2, label: "Level 2 Unlock", req: 2, reward: (milestoneRewards && milestoneRewards["lvl_2"]) ?? 35_000_000, rewardDesc: "Level 2 Diamond Pack" },
    { id: 4, label: "Level 4 Unlock", req: 4, reward: (milestoneRewards && milestoneRewards["lvl_4"]) ?? 75_000_000, rewardDesc: "Level 4 Platinum Cache" },
    { id: 7, label: "Level 7 Unlock", req: 7, reward: (milestoneRewards && milestoneRewards["lvl_7"]) ?? 150_000_000, rewardDesc: "Level 7 Crimson Chest" },
    { id: 10, label: "Level 10 Unlock", req: 10, reward: (milestoneRewards && milestoneRewards["lvl_10"]) ?? 350_000_000, rewardDesc: "Level 10 Divine Treasury" },
    { id: 15, label: "Level 15 Unlock", req: 15, reward: (milestoneRewards && milestoneRewards["lvl_15"]) ?? 1000000000, rewardDesc: "Level 15 COSMIC OVERLORD VAULT" },
  ];

  const handleClaimReward = async (missionId: string, reward: number) => {
    setClaimingId(missionId);
    setFeedback({ isSuccess: true, msg: null });
    try {
      const res = await claimMissionReward(missionId, reward);
      setFeedback({ isSuccess: res.success, msg: res.msg });
    } catch (e) {
      setFeedback({ isSuccess: false, msg: "An unexpected error occurred." });
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimMilestone = async (milestoneLvl: number, reward: number) => {
    const key = `lvl_${milestoneLvl}`;
    setClaimingId(key);
    setFeedback({ isSuccess: true, msg: null });
    try {
      const res = await claimLevelMilestone(milestoneLvl, reward);
      setFeedback({ isSuccess: res.success, msg: res.msg });
    } catch (e) {
      setFeedback({ isSuccess: false, msg: "Failed validation request." });
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0b0c14] border border-border-color rounded-xl p-5 relative overflow-hidden group hover:border-[#10b981]/20 transition-all">
        <div className="absolute top-0 right-0 w-80 h-32 bg-[#10b981]/[0.02] blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-indigo-950 to-bg-panel border border-[#10b981]/20 flex flex-col justify-center items-center shadow-lg hover:rotate-6 transition-all">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">Level</span>
              <span className="text-2xl font-mono font-black text-cyan-400 leading-tight">{lvl.level}</span>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-display font-black text-sm text-white uppercase tracking-wide">
                  {currentUser.username}'s Achievements
                </h4>
                <span className={`text-[8px] font-bold px-2 py-0.5 border rounded-full uppercase tracking-widest ${lvl.badgeColor}`}>
                  {lvl.title}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                Wagered: <span className="font-mono text-cyan-400">💎{totalWager.toLocaleString()}</span> / <span className="font-mono text-slate-500">Next Level to 💎{lvl.nextLvlWager.toLocaleString()}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-[10px] uppercase font-bold text-slate-400">
            <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-lg flex items-center gap-1.5">
              <span>💣 Mines: <span className="text-white font-mono">{totalMinesRound}</span></span>
            </div>
            <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-lg flex items-center gap-1.5">
              <span>🎡 Spins: <span className="text-white font-mono">{totalSpinRound}</span></span>
            </div>
            <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-lg flex items-center gap-1.5">
              <span>🏰 Towers: <span className="text-white font-mono">{totalTowersRound}</span></span>
            </div>
          </div>
        </div>

        <div className="mt-5 relative z-10 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-extrabold uppercase">
            <span>Level Progression XP Gauge</span>
            <span className="text-cyan-400 font-mono">{lvl.percent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-950/90 h-3 rounded-full overflow-hidden border border-white/5 relative p-[2px]">
            <motion.div 
              className="bg-gradient-to-r from-[#10b981] to-cyan-400 h-full rounded-full relative" 
              initial={{ width: 0 }}
              animate={{ width: `${lvl.percent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Switcher Hub */}
      <div className="bg-bg-panel border border-border-color rounded-xl p-5 shadow-xl relative overflow-hidden">
        
        <AnimatePresence mode="wait">
          {feedback.msg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3.5 mb-5 rounded-lg border text-[11px] font-bold uppercase tracking-wide flex items-center justify-between ${
                feedback.isSuccess 
                  ? 'bg-[#0a2e1d] text-emerald-400 border-emerald-500/30' 
                  : 'bg-rose-950/20 text-rose-400 border-rose-500/30'
              }`}
            >
              <span>{feedback.msg}</span>
              <button 
                onClick={() => setFeedback({ isSuccess: true, msg: null })}
                className="text-[10px] opacity-75 hover:opacity-100 cursor-pointer font-extrabold"
              >
                DISMISS [X]
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Selection */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-5">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('missions')}
              className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'missions'
                  ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Target className="h-3.5 w-3.5" /> Core Missions
            </button>
            <button
              onClick={() => setActiveTab('milestones')}
              className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'milestones'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-medium'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" /> Level Vault Unlocks
            </button>
          </div>
          <span className="text-[9px] text-[#10b981] uppercase font-black tracking-widest bg-[#10b981]/5 px-2 py-0.5 border border-[#10b981]/15 rounded-lg flex items-center gap-1">
            <CircleDot className="h-2.5 w-2.5 animate-ping" /> Realtime Active Season 1
          </span>
        </div>

        {activeTab === 'missions' && (
          <div className="space-y-4">
            <div className="bg-black/35 rounded-lg p-3.5 border border-white/5 text-[10px] text-slate-400 tracking-wide leading-relaxed font-semibold uppercase">
              📋 Complete core companion game interactions to claim direct Gem payouts instantly. Missions are tracked in realtime through public database registries.
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {missionsList.map((m) => {
                const isClaimed = completedMissions[m.id] === true;
                const score = m.current;
                const ratio = Math.min(100, (score / m.target) * 100);
                const isCompleted = score >= m.target;
                
                return (
                  <div 
                    key={m.id} 
                    className={`p-4 rounded-xl border transition-all relative flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isClaimed 
                        ? 'bg-black/20 border-white/[0.03] opacity-60' 
                        : isCompleted
                        ? 'bg-[#10b981]/5 border-[#10b981]/30' 
                        : 'bg-black/45 hover:bg-black/55 border-border-color/60'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{m.icon}</span>
                        <h4 className="font-display font-black text-xs text-white uppercase tracking-wide">
                          {m.title}
                        </h4>
                        {isClaimed ? (
                          <span className="text-[8px] bg-slate-800 text-slate-500 border border-slate-700 font-mono font-black uppercase px-2 py-0.5 rounded">
                            CLAIMED
                          </span>
                        ) : isCompleted ? (
                          <span className="text-[8px] bg-[#0a2e1d] text-emerald-400 border border-emerald-500/30 font-mono font-bold uppercase px-2 py-0.5 rounded animate-pulse">
                            READY TO CLAIM
                          </span>
                        ) : (
                          <span className="text-[8px] bg-sky-950/30 text-sky-400 border border-sky-500/20 font-mono font-black uppercase px-2 py-0.5 rounded">
                            IN PROGRESS
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase leading-normal font-semibold">
                        {m.desc}
                      </p>

                      {/* Mini Track Progress bar */}
                      <div className="space-y-1 pt-1 max-w-md">
                        <div className="flex justify-between text-[8px] font-mono font-bold uppercase text-slate-500">
                          <span>Progress Progress</span>
                          <span>
                            {m.isCurrencyFormat ? score.toLocaleString() : score} / {m.isCurrencyFormat ? m.target.toLocaleString() : m.target}
                          </span>
                        </div>
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isClaimed ? 'bg-slate-700' : isCompleted ? 'bg-[#10b981]' : 'bg-indigo-500'}`} 
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-end gap-2 justify-between shrink-0">
                      <div className="text-right">
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest font-black block">REWARD</span>
                        <span className="text-xs font-mono font-bold text-cyan-400 block">💎 {m.reward.toLocaleString()} GEMS</span>
                      </div>

                      {isClaimed ? (
                        <button
                          disabled
                          className="bg-slate-900 border border-slate-800 text-slate-600 font-bold text-[9px] uppercase px-4 py-2 rounded-lg cursor-not-allowed"
                        >
                          Completed
                        </button>
                      ) : isCompleted ? (
                        <button
                          disabled={claimingId === m.id}
                          onClick={() => handleClaimReward(m.id, m.reward)}
                          className="bg-[#10b981] hover:bg-emerald-500 text-black font-extrabold text-[9px] uppercase tracking-wide px-4 py-2 rounded-lg transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:rotate-1 hover:scale-103 cursor-pointer"
                        >
                          {claimingId === m.id ? "Processing..." : "Claim Gems"}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="bg-slate-950 border border-white/5 text-slate-500 font-bold text-[9px] uppercase px-4 py-2 rounded-lg cursor-not-allowed"
                        >
                          Locked
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="space-y-4">
            <div className="bg-black/35 rounded-lg p-3.5 border border-white/5 text-[10px] text-slate-400 tracking-wide leading-relaxed font-semibold uppercase">
              👑 Unlock progressive premium vault rewards as your companion Level increases. Level multipliers are computed directly from absolute high-stakes gaming volume.
            </div>

            <div className="space-y-3">
              {milestoneList.map((milestone) => {
                const isClaimed = claimedMilestones[milestone.id] === true;
                const isUnlocked = lvl.level >= milestone.req;
                
                return (
                  <div 
                    key={milestone.id} 
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isClaimed 
                        ? 'bg-black/20 border-white/[0.03] opacity-60' 
                        : isUnlocked
                        ? 'bg-purple-500/5 border-purple-500/30' 
                        : 'bg-black/45 border-border-color'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-11 w-11 rounded-lg border flex items-end justify-center pb-1.5 shrink-0 ${
                        isClaimed 
                          ? 'border-slate-800 bg-slate-950 text-slate-500' 
                          : isUnlocked 
                          ? 'border-purple-500/30 bg-purple-950/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.15)]' 
                          : 'border-white/5 bg-slate-950 text-slate-600'
                      }`}>
                        {isClaimed ? (
                          <CheckCircle2 className="h-5 w-5 mb-0.5" />
                        ) : isUnlocked ? (
                          <Sparkles className="h-5 w-5 mb-0.5 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} />
                        ) : (
                          <Lock className="h-5 w-5 mb-0.5" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-black text-xs text-white uppercase tracking-wide">
                            {milestone.label}
                          </h4>
                          {!isUnlocked && (
                            <span className="text-[7.5px] bg-[#1e131d] text-purple-400 border border-purple-500/20 font-mono uppercase px-1.5 py-0.5 rounded">
                              REQ LEVEL {milestone.req}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 uppercase mt-0.5 font-semibold">
                          {milestone.rewardDesc} • Milestone unlocks instant vaults
                        </p>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-end gap-2 justify-between shrink-0">
                      <div className="text-right">
                        <span className="text-[8px] text-slate-400 uppercase tracking-widest font-black block">REWARD</span>
                        <span className="text-xs font-mono font-bold text-yellow-500 block">💎 {milestone.reward.toLocaleString()} GEMS</span>
                      </div>

                      {isClaimed ? (
                        <button
                          disabled
                          className="bg-slate-900 border border-slate-800 text-slate-600 font-bold text-[9px] uppercase px-4 py-2 rounded-lg cursor-not-allowed animate-none"
                        >
                          Claimed Vault
                        </button>
                      ) : isUnlocked ? (
                        <button
                          disabled={claimingId === `lvl_${milestone.id}`}
                          onClick={() => handleClaimMilestone(milestone.id, milestone.reward)}
                          className="bg-purple-650 hover:bg-purple-600 border border-purple-500/40 text-white font-extrabold text-[9px] uppercase tracking-wide px-4 py-2 rounded-lg transition-all active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer"
                        >
                          {claimingId === `lvl_${milestone.id}` ? "Processing..." : "Claim Milestone"}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="bg-slate-950 border border-white/5 text-slate-500 font-bold text-[9px] uppercase px-4 py-2 rounded-lg cursor-not-allowed"
                        >
                          Locked Milestone
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
