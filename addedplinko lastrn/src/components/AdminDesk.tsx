import React, { useState } from "react";
import { ShieldCheck, Search, PlusCircle, MinusCircle, UserX, Trash2, Award, Zap, AlertTriangle, RotateCcw, Ticket, Check, Lock, Sparkles, Palette } from "lucide-react";
import { UserData, UserRank } from "../types";
import { parseGems } from "../utils";

interface AdminDeskProps {
  currentUser: { username: string } & UserData;
  dbUsers: { [username: string]: UserData & { password?: string } };
  updateUserBalance: (targetUsername: string, delta: number, isDeposit: boolean) => Promise<void>;
  updateUserRank: (targetUsername: string, newRank: UserRank) => Promise<void>;
  deleteUser: (targetUsername: string) => Promise<void>;
  resetUserStats: (targetUsername: string) => Promise<void>;
  resetAllUsersStats: () => Promise<void>;
  promoCodes: { [code: string]: number };
  createPromoCode: (code: string, value: number) => Promise<void>;
  deletePromoCode: (code: string) => Promise<void>;
  updateUserCashout: (targetUsername: string, amount: number) => Promise<void>;
  announcement: string;
  updateAnnouncement: (text: string) => Promise<void>;
  cosmeticPrices?: { [key: string]: number };
  updateCosmeticPrice?: (key: string, newPrice: number) => Promise<boolean>;
  missionRewards?: { [key: string]: number };
  updateMissionReward?: (key: string, amt: number) => Promise<boolean>;
  milestoneRewards?: { [key: string]: number };
  updateMilestoneReward?: (key: string, amt: number) => Promise<boolean>;
  discordWebhook?: string;
  updateDiscordWebhook?: (url: string) => Promise<boolean>;
  houseEdgeBias?: string;
  updateHouseEdgeBias?: (bias: string) => Promise<boolean>;
}

export default function AdminDesk({ 
  currentUser, 
  dbUsers, 
  updateUserBalance, 
  updateUserRank, 
  deleteUser,
  resetUserStats,
  resetAllUsersStats,
  promoCodes,
  createPromoCode,
  deletePromoCode,
  updateUserCashout,
  announcement,
  updateAnnouncement,
  cosmeticPrices = {},
  updateCosmeticPrice = async () => false,
  missionRewards = {},
  updateMissionReward = async () => false,
  milestoneRewards = {},
  updateMilestoneReward = async () => false
}: AdminDeskProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [amounts, setAmounts] = useState<{ [username: string]: string }>({});
  
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const [confirmResetUser, setConfirmResetUser] = useState<string | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState<boolean>(false);

  const [newCodeName, setNewCodeName] = useState<string>("");
  const [newCodeValue, setNewCodeValue] = useState<string>("");

  const [editedCosmeticPrices, setEditedCosmeticPrices] = useState<{ [key: string]: string }>({});

  const [editedMissionRewards, setEditedMissionRewards] = useState<{ [key: string]: string }>({});
  const [editedMilestoneRewards, setEditedMilestoneRewards] = useState<{ [key: string]: string }>({});

  const [announcementInput, setAnnouncementInput] = useState<string>(announcement || "");

  React.useEffect(() => {
    setAnnouncementInput(announcement || "");
  }, [announcement]);

  const totalUsersCount = Object.keys(dbUsers).length;
  const totalGemsInCirculation = Object.values(dbUsers).reduce((sum, u) => sum + (u.balance || 0), 0);

  const filteredUsernames = Object.keys(dbUsers).filter(username => {
    return username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAmountChange = (username: string, value: string) => {
    setAmounts(prev => ({ ...prev, [username]: value }));
  };

  const handleGive = async (targetUser: string) => {
    const rawVal = amounts[targetUser];
    if (!rawVal) return;
    const parsedVal = parseGems(rawVal);
    if (parsedVal <= 0) return;

    await updateUserBalance(targetUser, parsedVal, true);
    setAmounts(prev => ({ ...prev, [targetUser]: "" }));
  };

  const handleTake = async (targetUser: string) => {
    const rawVal = amounts[targetUser];
    if (!rawVal) return;
    const parsedVal = parseGems(rawVal);
    if (parsedVal <= 0) return;

    // Subtract balance
    await updateUserBalance(targetUser, parsedVal, false);
    setAmounts(prev => ({ ...prev, [targetUser]: "" }));
  };

  const handleCashout = async (targetUser: string) => {
    const rawVal = amounts[targetUser];
    if (!rawVal) return;
    const parsedVal = parseGems(rawVal);
    if (parsedVal <= 0) return;

    await updateUserCashout(targetUser, parsedVal);
    setAmounts(prev => ({ ...prev, [targetUser]: "" }));
  };

  const handleConfirmDelete = async (targetUser: string) => {
    await deleteUser(targetUser);
    setConfirmDeleteUser(null);
  };

  const getRankBadge = (rank: UserRank) => {
    switch (rank) {
      case 'overlord':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/25 text-[10px] px-2 py-0.5 rounded-full font-bold font-display uppercase tracking-widest';
      case 'admin':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 text-[10px] px-2 py-0.5 rounded-full font-bold font-display uppercase tracking-widest';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] px-2 py-0.5 rounded-full font-semibold font-display uppercase tracking-widest';
    }
  };

  const isOverlord = currentUser.rank === 'overlord';

  return (
    <div className="bg-gradient-to-br from-purple-950/20 via-slate-900/10 to-transparent border border-purple-500/20 rounded-xl p-6 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-border-color">
        <div>
          <h2 className="font-display font-extrabold text-white text-lg flex items-center gap-2">
            <Zap className="text-purple-400" /> Admin Control Desk
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure system states, process ledger transactions, or promote rankings.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-display bg-emerald-950/20 border border-emerald-500/25 px-3 py-1.5 rounded-lg font-semibold tracking-wide shadow-md">
          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
          Live Synchronised Database
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-panel border border-border-color rounded-xl p-4">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
            Registered Network Accounts
          </span>
          <span className="text-2xl font-display font-black text-white">{totalUsersCount}</span>
        </div>
        <div className="bg-bg-panel border border-border-color rounded-xl p-4 lg:col-span-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
            Aggregate Circulation Index
          </span>
          <span className="text-2xl font-display font-black text-cyan-400">💎 {totalGemsInCirculation.toLocaleString()}</span>
        </div>
      </div>

      {isOverlord && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-4 bg-bg-panel/65 border border-purple-500/25 rounded-xl p-5 shadow-inner flex flex-col justify-between">
            <div>
              <h4 className="font-display font-black text-xs text-purple-300 uppercase tracking-widest mb-3 flex items-center gap-1.5 pb-2 border-b border-white/5">
                <Ticket className="h-4 w-4 text-purple-400" /> Voucher Codes (Overlord Only)
              </h4>
              <div className="flex flex-col gap-2 mb-3">
                <input
                  type="text"
                  placeholder="PROMO_CODE_NAME"
                  className="bg-bg-input border border-border-color rounded px-3.5 py-2.5 text-white text-[11px] font-display uppercase font-bold outline-none focus:border-purple-500 placeholder-slate-750 cursor-text"
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value.toUpperCase())}
                />
                <input
                  type="number"
                  placeholder="GEMS VALUE"
                  className="bg-bg-input border border-border-color rounded px-3.5 py-2.5 text-white text-[11px] font-display uppercase font-bold outline-none focus:border-purple-500 placeholder-slate-750 cursor-text"
                  value={newCodeValue}
                  onChange={(e) => setNewCodeValue(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <div className="max-h-[100px] overflow-y-auto space-y-1.5 pr-1 border border-white/5 bg-black/25 rounded p-2 mb-3">
                {Object.keys(promoCodes).length > 0 ? (
                  Object.entries(promoCodes).map(([code, value]) => (
                    <div key={code} className="flex justify-between items-center text-[10px] bg-bg-input/60 border border-border-color rounded px-2 py-1">
                      <span className="font-display font-extrabold text-white tracking-widest">{code}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-display font-bold">💎 {value.toLocaleString()}</span>
                        <button
                          onClick={() => deletePromoCode(code)}
                          className="text-rose-400 hover:text-rose-300 font-bold uppercase text-[9px] hover:underline cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-[10px] text-slate-500 italic py-2">
                    No active codes registered in Database.
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  const val = Number(newCodeValue);
                  if (newCodeName.trim() && val > 0) {
                    await createPromoCode(newCodeName, val);
                    setNewCodeName("");
                    setNewCodeValue("");
                  }
                }}
                className="w-full bg-purple-600 hover:bg-purple-500 border border-purple-500/30 text-white py-2 rounded text-[11px] font-bold font-display uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-[0_0_10px_rgba(147,51,234,0.15)]"
              >
                Register Code
              </button>
            </div>
          </div>

          <div className="lg:col-span-4 bg-bg-panel/65 border border-cyan-500/25 rounded-xl p-5 shadow-inner flex flex-col justify-between">
            <div>
              <h4 className="font-display font-black text-xs text-cyan-300 uppercase tracking-widest mb-3 flex items-center gap-1.5 pb-2 border-b border-white/5">
                <Sparkles className="h-4 w-4 text-cyan-400" /> Broadcast System (Overlord Only)
              </h4>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold leading-relaxed mb-3">
                Publish site-wide rolling announcements to communicate updates, drop coupon rewards, or promote news.
              </p>
              <textarea
                rows={3}
                placeholder="Type dynamic system announcement (e.g. Free code WELCOME2026 is active!)..."
                className="w-full bg-bg-input border border-border-color rounded p-2.5 text-white text-[11px] font-sans outline-none focus:border-cyan-500 placeholder-slate-700 resize-none font-medium mb-3 cursor-text"
                value={announcementInput}
                onChange={(e) => setAnnouncementInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await updateAnnouncement(announcementInput);
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-black px-4 py-2.5 rounded text-[11px] font-black font-display uppercase tracking-wider cursor-pointer transition-all active:scale-95 flex-1 text-center shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              >
                Broadcast
              </button>
              {announcement && (
                <button
                  onClick={async () => {
                    await updateAnnouncement("");
                    setAnnouncementInput("");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded text-[11px] font-bold font-display uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                  title="Clear rolling announcement"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 bg-bg-panel/65 border border-red-500/20 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <h4 className="font-display font-black text-xs text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 pb-2 border-b border-white/5">
                <AlertTriangle className="h-4 w-4 text-rose-400" /> Database Statistic Wipe (Overlord Only)
              </h4>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold leading-relaxed">
                Reset overall user statistics (total deposits, wagers, and cash-outs) to <span className="text-rose-400">0</span>. Users balances are untouched. This action is irreversible.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5">
              {confirmResetAll ? (
                <div className="bg-red-950/40 border border-red-500/30 p-2.5 rounded-lg flex flex-col gap-2.5 animate-pulse">
                  <span className="text-[10px] text-red-100 font-bold uppercase text-center">Confirm reset for all {totalUsersCount} accounts?</span>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={async () => {
                        await resetAllUsersStats();
                        setConfirmResetAll(false);
                      }}
                      className="bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer animate-none"
                    >
                      Yes, Reset All
                    </button>
                    <button
                      onClick={() => setConfirmResetAll(false)}
                      className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmResetAll(true)}
                  className="w-full bg-red-650/10 hover:bg-red-600/25 border border-red-500/35 hover:border-red-500 text-red-400 hover:text-white rounded py-2.5 text-[10px] font-bold font-display uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Wipe Database Stats
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-12 bg-bg-panel/65 border border-purple-500/20 rounded-xl p-5 shadow-inner mt-2">
            <h4 className="font-display font-black text-xs text-purple-300 uppercase tracking-widest mb-3 flex items-center gap-1.5 pb-2 border-b border-white/5">
              <Palette className="h-4 w-4 text-purple-400" /> Dynamic Cosmetic Shop Pricing Desk (Overlord Only)
            </h4>
            <p className="text-[10px] text-slate-500 uppercase font-semibold leading-relaxed mb-4">
              Realtime dynamic shop overwrite controls. Specify custom pricing structures in Gems. Price adjustments apply immediately for all authenticated buyers.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h5 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2 flex items-center gap-1">
                  🏷️ Premium Badges & Chat Tags
                </h5>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {[
                    { key: "tag_monarch", label: "👑 MONARCH Tag", default: 10000000 },
                    { key: "tag_phenix", label: "🔥 PHENIX Tag", default: 5000000 },
                    { key: "tag_glitch", label: "👾 GLITCH Tag", default: 2500000 },
                    { key: "tag_cosmic", label: "🌠 COSMIC Tag", default: 1000000 },
                    { key: "tag_overdrive", label: "⚡ OVERDRIVE Tag", default: 500000 },
                    { key: "tag_champ", label: "🎩 CHAMP Tag", default: 250000 },
                  ].map((tag) => {
                    const currentPrice = cosmeticPrices[tag.key] ?? tag.default;
                    const draftPrice = editedCosmeticPrices[tag.key] ?? currentPrice.toString();
                    return (
                      <div key={tag.key} className="flex gap-2 items-center justify-between p-2 bg-black/35 rounded-lg border border-white/5">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">{tag.label}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-[9px] text-slate-500 pointer-events-none">💎</span>
                            <input
                              type="number"
                              value={draftPrice}
                              onChange={(e) => setEditedCosmeticPrices(prev => ({ ...prev, [tag.key]: e.target.value }))}
                              className="w-[110px] bg-bg-input border border-border-color text-right rounded pl-6 pr-2 py-1 text-[11px] text-cyan-400 font-mono font-bold outline-none focus:border-purple-500 cursor-text"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              const v = parseInt(draftPrice);
                              if (!isNaN(v) && v >= 0) {
                                await updateCosmeticPrice(tag.key, v);
                              }
                            }}
                            className="bg-purple-650/45 hover:bg-purple-600 border border-purple-500/30 text-white font-bold text-[9px] uppercase px-2.5 py-1.5 rounded transition-all active:scale-95 cursor-pointer shadow-[0_0_8px_rgba(147,51,234,0.1)]"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2 flex items-center gap-1">
                  💡 Premium Glow Palette Colors
                </h5>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {[
                    { key: "color_fuchsia", label: "💖 Fuchsia Pulsar glow", default: 8000000 },
                    { key: "color_emerald", label: "💚 Emerald Volt glow", default: 4000000 },
                    { key: "color_aqua", label: "💙 Aqua Freeze glow", default: 2000000 },
                    { key: "color_crimson", label: "❤️ Crimson Heat glow", default: 1000000 },
                  ].map((color) => {
                    const currentPrice = cosmeticPrices[color.key] ?? color.default;
                    const draftPrice = editedCosmeticPrices[color.key] ?? currentPrice.toString();
                    return (
                      <div key={color.key} className="flex gap-2 items-center justify-between p-2 bg-black/35 rounded-lg border border-white/5">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">{color.label}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-[9px] text-slate-500 pointer-events-none">💎</span>
                            <input
                              type="number"
                              value={draftPrice}
                              onChange={(e) => setEditedCosmeticPrices(prev => ({ ...prev, [color.key]: e.target.value }))}
                              className="w-[110px] bg-bg-input border border-border-color text-right rounded pl-6 pr-2 py-1 text-[11px] text-cyan-400 font-mono font-bold outline-none focus:border-purple-500 cursor-text"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              const v = parseInt(draftPrice);
                              if (!isNaN(v) && v >= 0) {
                                await updateCosmeticPrice(color.key, v);
                              }
                            }}
                            className="bg-purple-650/45 hover:bg-purple-600 border border-purple-500/30 text-white font-bold text-[9px] uppercase px-2.5 py-1.5 rounded transition-all active:scale-95 cursor-pointer shadow-[0_0_8px_rgba(147,51,234,0.1)]"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Mission & Milestone Rewards Overwrite Desk (Overlord Only) */}
          <div className="lg:col-span-12 bg-bg-panel/65 border border-cyan-500/20 rounded-xl p-5 shadow-inner mt-4">
            <h4 className="font-display font-black text-xs text-cyan-300 uppercase tracking-widest mb-3 flex items-center gap-1.5 pb-2 border-b border-white/5">
              <Award className="h-4 w-4 text-cyan-400" /> Dynamic Mission & Milestone Rewards (Overlord Only)
            </h4>
            <p className="text-[10px] text-slate-500 uppercase font-semibold leading-relaxed mb-4">
              Overlord dynamic rewards configurations. Adjust the Gems payout allocated to missions and levels. Reallocations are effective immediately for all eligible claimants.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h5 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2 flex items-center gap-1">
                  🏆 Season Mission Reward Overwrites
                </h5>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {[
                    { id: "m_mines_rookie", label: "💣 Mines Field Explorer", default: 20000000 },
                    { id: "m_spin_master", label: "🎡 Infinite Carousel", default: 15000000 },
                    { id: "m_towers_climber", label: "🏰 Towers Conqueror", default: 25000005 },
                    { id: "m_wager_pioneer", label: "💎 Gem-Slinging Gladiator", default: 60000000 },
                    { id: "m_unlocked_sweep", label: "🔥 Mines Sweep", default: 75000000 },
                  ].map((m) => {
                    const currentReward = missionRewards[m.id] ?? m.default;
                    const draftReward = editedMissionRewards[m.id] ?? currentReward.toString();
                    return (
                      <div key={m.id} className="flex gap-2 items-center justify-between p-2 bg-black/35 rounded-lg border border-white/5">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide truncate pr-2 max-w-[200px]" title={m.label}>{m.label}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-[9px] text-slate-500 pointer-events-none">💎</span>
                            <input
                              type="number"
                              value={draftReward}
                              onChange={(e) => setEditedMissionRewards(prev => ({ ...prev, [m.id]: e.target.value }))}
                              className="w-[120px] bg-bg-input border border-border-color text-right rounded pl-6 pr-2 py-1 text-[11px] text-cyan-400 font-mono font-bold outline-none focus:border-cyan-500 cursor-text"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              const v = parseInt(draftReward);
                              if (!isNaN(v) && v >= 0) {
                                await updateMissionReward(m.id, v);
                              }
                            }}
                            className="bg-cyan-650/45 hover:bg-cyan-500 border border-cyan-500/30 text-white font-bold text-[9px] uppercase px-2.5 py-1.5 rounded transition-all active:scale-95 cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.1)]"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-2 flex items-center gap-1">
                  ✨ Milestone Vault Reward Overwrites
                </h5>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {[
                    { id: 2, key: "lvl_2", label: "💎 Level 2 Unlock Vault", default: 35000000 },
                    { id: 4, key: "lvl_4", label: "👑 Level 4 Unlock Vault", default: 75000000 },
                    { id: 7, key: "lvl_7", label: "🔮 Level 7 Unlock Vault", default: 150000000 },
                    { id: 10, key: "lvl_10", label: "🔱 Level 10 Unlock Vault", default: 350000000 },
                    { id: 15, key: "lvl_15", label: "🌌 Level 15 Unlock Vault", default: 1000000000 },
                  ].map((lvl) => {
                    const currentReward = milestoneRewards[lvl.key] ?? lvl.default;
                    const draftReward = editedMilestoneRewards[lvl.key] ?? currentReward.toString();
                    return (
                      <div key={lvl.key} className="flex gap-2 items-center justify-between p-2 bg-black/35 rounded-lg border border-white/5">
                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">{lvl.label}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 text-[9px] text-slate-500 pointer-events-none">💎</span>
                            <input
                              type="number"
                              value={draftReward}
                              onChange={(e) => setEditedMilestoneRewards(prev => ({ ...prev, [lvl.key]: e.target.value }))}
                              className="w-[125px] bg-bg-input border border-border-color text-right rounded pl-6 pr-2 py-1 text-[11px] text-cyan-400 font-mono font-bold outline-none focus:border-cyan-500 cursor-text"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              const v = parseInt(draftReward);
                              if (!isNaN(v) && v >= 0) {
                                await updateMilestoneReward(lvl.key, v);
                              }
                            }}
                            className="bg-cyan-650/45 hover:bg-cyan-500 border border-cyan-500/30 text-white font-bold text-[9px] uppercase px-2.5 py-1.5 rounded transition-all active:scale-95 cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.1)]"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-bg-input border border-border-color rounded-lg pl-10 pr-4 py-2.5 text-white text-xs outline-none focus:border-purple-500 placeholder-slate-500 cursor-text uppercase"
            placeholder="🔍 Search user database by username..."
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border-color">
        <table className="w-full text-left border-collapse bg-bg-panel/40">
          <thead>
            <tr className="bg-bg-panel text-[10px] text-slate-400 font-extrabold uppercase tracking-widest border-b border-border-color">
              <th className="px-5 py-3.5">User Details</th>
              <th className="px-5 py-3.5">Auth Code</th>
              <th className="px-5 py-3.5">Balance</th>
              <th className="px-5 py-3.5">Wagers & Metrics</th>
              <th className="px-5 py-3.5">Rank Level</th>
              <th className="px-5 py-3.5">Ledger Alter & Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-color/40 text-xs">
            {filteredUsernames.length > 0 ? (
              filteredUsernames.map((user) => {
                const uData = dbUsers[user];
                if (!uData) return null;

                const rankVal = uData.rank || 'member';
                const bal = uData.balance || 0;
                const depositCount = uData.totalDeposit || 0;
                const cashoutCount = uData.totalCashout || 0;
                const wCount = uData.totalWager || 0;
                
                const isSelf = user === currentUser.username;

                return (
                  <tr key={user} className="hover:bg-purple-950/5 transition-all">
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-white font-display font-extrabold text-sm uppercase">
                          {user}
                        </span>
                        <div className="flex">
                          <span className={getRankBadge(rankVal)}>
                            {rankVal}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <code className="bg-bg-input px-2 py-1 text-[10px] text-slate-400 rounded border border-border-color font-mono select-all">
                        {isOverlord && rankVal !== 'overlord' && user !== "data32" ? (uData.password || "********") : "••••••••"}
                      </code>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-cyan-400 font-display font-extrabold block">
                        💎 {bal.toLocaleString()}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-[10px] text-slate-400 leading-relaxed font-display">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-emerald-500">📥 Dep: {depositCount.toLocaleString()}</span>
                        <span className="text-rose-400">📤 Cash: {cashoutCount.toLocaleString()}</span>
                        <span className="text-indigo-400">⚡ Wgr: {wCount.toLocaleString()}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {isOverlord && user !== "data32" ? (
                        <select
                          value={rankVal}
                          onChange={(e) => updateUserRank(user, e.target.value as UserRank)}
                          className="bg-bg-input text-white border border-border-color rounded text-[11px] px-2 py-1 outline-none font-semibold focus:border-purple-500 cursor-pointer"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="overlord">Overlord</option>
                        </select>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-300 font-bold text-[11px] uppercase font-display">
                            {rankVal === 'overlord' ? '👑 Overlord' : rankVal === 'admin' ? '🛡️ Admin' : '👤 Member'}
                          </span>
                          {user === "data32" && (
                            <span className="text-[9px] text-purple-400 font-extrabold uppercase tracking-wider font-display animate-pulse">
                              Permanent Overlord
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center bg-bg-input border border-border-color rounded-lg overflow-hidden max-w-[120px]">
                          <input
                            type="text"
                            value={amounts[user] || ""}
                            onChange={(e) => handleAmountChange(user, e.target.value)}
                            className="bg-transparent border-none w-full text-center outline-none px-2 py-1 text-white text-[11px]"
                            placeholder="Amt: 10M"
                          />
                        </div>

                        <button
                          onClick={() => handleGive(user)}
                          className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded px-2.5 py-1 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <PlusCircle className="h-3 w-3" /> Give
                        </button>
                        {isOverlord ? (
                          <button
                            onClick={() => handleTake(user)}
                            className="bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded px-2.5 py-1 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <MinusCircle className="h-3 w-3" /> Take
                          </button>
                        ) : (
                          <button
                            disabled
                            className="bg-slate-800 text-slate-500 border border-slate-700/50 rounded px-2.5 py-1 font-bold text-[10px] flex items-center gap-1 cursor-not-allowed opacity-60"
                            title="Only Overlords can process manual cashouts"
                          >
                            <Lock className="h-3 w-3" /> Take
                          </button>
                        )}

                        {isOverlord && (
                          <button
                            onClick={() => handleCashout(user)}
                            className="bg-fuchsia-500/15 hover:bg-fuchsia-600 text-fuchsia-400 hover:text-white border border-fuchsia-500/30 rounded px-2.5 py-1 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                            title="Overlord only: Process cashout, deduct balance and add to cashout statistic"
                          >
                            <Award className="h-3 w-3 text-fuchsia-400" /> Cashout
                          </button>
                        )}

                        {isOverlord && (
                          <div className="relative">
                            {confirmResetUser === user ? (
                              <div className="flex items-center gap-1 bg-purple-950/80 border border-purple-500 rounded p-1 z-30 animate-pulse">
                                <span className="text-[9px] text-purple-200 font-bold px-1 whitespace-nowrap">Reset stats?</span>
                                <button
                                  onClick={async (e) => { 
                                    e.stopPropagation(); 
                                    e.preventDefault(); 
                                    await resetUserStats(user); 
                                    setConfirmResetUser(null); 
                                  }}
                                  className="bg-purple-600 text-white rounded px-1.5 py-0.5 text-[9px] font-extrabold cursor-pointer animate-none"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    e.preventDefault(); 
                                    setConfirmResetUser(null); 
                                  }}
                                  className="bg-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-[9px] font-extrabold cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setConfirmResetUser(user); }}
                                className="bg-purple-500/15 hover:bg-purple-600 hover:text-white text-purple-400 border border-purple-500/30 hover:border-purple-500 rounded px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                title="Overlord exclusive action: reset user metrics to 0"
                              >
                                <RotateCcw className="h-3 w-3" /> Reset Stats
                              </button>
                            )}
                          </div>
                        )}

                        {isOverlord && !isSelf && (
                          <div className="relative">
                            {confirmDeleteUser === user ? (
                              <div className="flex items-center gap-1 bg-red-950/80 border border-red-500 rounded p-1 z-30 animate-pulse">
                                <span className="text-[9px] text-red-200 font-bold px-1 whitespace-nowrap">Sure?</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleConfirmDelete(user); }}
                                  className="bg-red-500 text-white rounded px-1.5 py-0.5 text-[9px] font-extrabold cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setConfirmDeleteUser(null); }}
                                  className="bg-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-[9px] font-extrabold cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); e.preventDefault(); setConfirmDeleteUser(user); }}
                                className="bg-red-500/15 hover:bg-red-600 hover:text-white text-red-400 border border-red-500/30 hover:border-red-500 rounded p-1 px-2 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                title="Overlord exclusive action: permanently delete user"
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-500 italic">
                  No accounts in the database match your query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
