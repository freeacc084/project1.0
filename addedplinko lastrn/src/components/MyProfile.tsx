import React, { useState } from "react";
import { Lock, Eye, CheckCircle, Shield, Award, Sparkles, TrendingUp, ShoppingBag, Palette, Tag, Trash2 } from "lucide-react";
import { UserData } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface MyProfileProps {
  currentUser: { username: string } & UserData;
  updateUserPassword: (newPass: string) => Promise<boolean>;
  redeemPromoCode: (code: string) => Promise<{ success: boolean; msg: string }>;
  claimDailyGems: () => Promise<{ success: boolean; msg: string; earned?: number; nextClaimInMs?: number }>;
  buyCosmeticItem: (type: 'tag' | 'color', value: string, price: number) => Promise<{ success: boolean; msg: string }>;
  clearCosmeticItem: (type: 'tag' | 'color') => Promise<boolean>;
  cosmeticPrices?: { [key: string]: number };
  requestWithdrawal?: (amount: number) => Promise<{ success: boolean; msg: string }>;
  setOverlordSignature?: (tag: string, color: string) => Promise<{ success: boolean; msg: string }>;
}

export default function MyProfile({ 
  currentUser, 
  updateUserPassword, 
  redeemPromoCode, 
  claimDailyGems, 
  buyCosmeticItem, 
  clearCosmeticItem,
  cosmeticPrices = {},
  requestWithdrawal
}: MyProfileProps) {
  const [newPassword, setNewPassword] = useState<string>("");
  const [feedback, setFeedback] = useState<{ isSuccess: boolean; msg: string | null }>({ isSuccess: true, msg: null });

  const [promoInput, setPromoInput] = useState<string>("");
  const [promoFeedback, setPromoFeedback] = useState<{ success: boolean; msg: string | null } | null>(null);

  // Daily Chest States
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLooting, setIsLooting] = useState<boolean>(false);
  const [lootResult, setLootResult] = useState<number | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  // Withdrawal Module Local State
  const [withdrawInput, setWithdrawInput] = useState<string>("");
  const [withdrawFeedback, setWithdrawFeedback] = useState<{ success: boolean; msg: string | null } | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [isHoldingBar, setIsHoldingBar] = useState<boolean>(false);

  // Magic Cosmetic Shop States and Controllers
  const [shopFeedback, setShopFeedback] = useState<{ success: boolean; msg: string | null } | null>(null);
  const [isBuying, setIsBuying] = useState<string | null>(null);

  const premiumTags = [
    { title: "👑 MONARCH", value: "👑 MONARCH", price: cosmeticPrices['tag_monarch'] ?? 10000000, color: "#eab308", border: "border-yellow-500/30", bg: "bg-yellow-500/5" },
    { title: "🔥 PHENIX", value: "🔥 PHENIX", price: cosmeticPrices['tag_phenix'] ?? 5000000, color: "#f97316", border: "border-orange-500/30", bg: "bg-orange-500/5" },
    { title: "👾 GLITCH", value: "👾 GLITCH", price: cosmeticPrices['tag_glitch'] ?? 2500000, color: "#a855f7", border: "border-purple-500/30", bg: "bg-purple-500/5" },
    { title: "🌠 COSMIC", value: "🌠 COSMIC", price: cosmeticPrices['tag_cosmic'] ?? 1000000, color: "#06b6d4", border: "border-cyan-500/30", bg: "bg-cyan-500/5" },
    { title: "⚡ OVERDRIVE", value: "⚡ OVERDRIVE", price: cosmeticPrices['tag_overdrive'] ?? 500000, color: "#10b981", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
    { title: "🎩 CHAMP", value: "🎩 CHAMP", price: cosmeticPrices['tag_champ'] ?? 250000, color: "#38bdf8", border: "border-sky-500/30", bg: "bg-sky-500/5" },
  ];

  const premiumColors = [
    { name: "Fuchsia Pulsar", value: "#d946ef", price: cosmeticPrices['color_fuchsia'] ?? 8000000, glowColor: "shadow-[0_0_15px_rgba(217,70,239,0.3)]" },
    { name: "Emerald Volt", value: "#10b981", price: cosmeticPrices['color_emerald'] ?? 4000000, glowColor: "shadow-[0_0_15px_rgba(16,185,129,0.3)]" },
    { name: "Aqua Freeze", value: "#06b6d4", price: cosmeticPrices['color_aqua'] ?? 2000000, glowColor: "shadow-[0_0_15px_rgba(6,182,212,0.3)]" },
    { name: "Crimson Heat", value: "#f43f5e", price: cosmeticPrices['color_crimson'] ?? 1000000, glowColor: "shadow-[0_0_15px_rgba(244,63,94,0.3)]" },
  ];

  const handlePurchaseCosmetic = async (type: 'tag' | 'color', value: string, price: number) => {
    if (isBuying) return;
    setIsBuying(value);
    setShopFeedback(null);
    try {
      const res = await buyCosmeticItem(type, value, price);
      setShopFeedback(res);
    } catch (e) {
      setShopFeedback({ success: false, msg: "❌ Interface communication link lost." });
    } finally {
      setIsBuying(null);
    }
  };

  const handleClearCosmetic = async (type: 'tag' | 'color') => {
    setShopFeedback(null);
    const success = await clearCosmeticItem(type);
    if (success) {
      setShopFeedback({ success: true, msg: "🧹 Removed item from active layout!" });
    } else {
      setShopFeedback({ success: false, msg: "❌ Demount operation timed out." });
    }
  };

  React.useEffect(() => {
    const updateTimer = () => {
      const lastClaim = currentUser.lastClaimedDaily || 0;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - lastClaim;
      const remaining = Math.max(0, twentyFourHours - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentUser.lastClaimedDaily]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  const handleClaimDailySecret = async () => {
    if (isLooting) return;
    setIsLooting(true);
    setClaimFeedback(null);
    try {
      const res = await claimDailyGems();
      if (res.success && res.earned) {
        setLootResult(res.earned);
        setClaimFeedback(res.msg);
      } else {
        setClaimFeedback(res.msg);
      }
    } catch (err) {
      console.error(err);
      setClaimFeedback("❌ Claim processing timed out.");
    } finally {
      setIsLooting(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!newPassword || newPassword.length < 4) {
      setFeedback({ isSuccess: false, msg: "Password must construct at least 4 characters." });
      return;
    }
    const success = await updateUserPassword(newPassword);
    if (success) {
      setFeedback({ isSuccess: true, msg: "✅ Password successfully regenerated!" });
      setNewPassword("");
    } else {
      setFeedback({ isSuccess: false, msg: "Error executing password write to Firebase." });
    }
  };

  const handleRedeemCode = async () => {
    setPromoFeedback(null);
    if (!promoInput.trim()) {
      setPromoFeedback({ success: false, msg: "❌ Please specify a voucher code name." });
      return;
    }
    const res = await redeemPromoCode(promoInput);
    setPromoFeedback(res);
    if (res.success) {
      setPromoInput("");
    }
  };

  const handleWithdrawGems = async () => {
    if (!requestWithdrawal) return;
    const amount = parseInt(withdrawInput.replace(/,/g, "")) || 0;
    if (amount <= 0 || isNaN(amount)) {
      setWithdrawFeedback({ success: false, msg: "❌ Please enter a valid quantity of gems to withdraw." });
      return;
    }
    setIsWithdrawing(true);
    setWithdrawFeedback(null);
    try {
      const res = await requestWithdrawal(amount);
      setWithdrawFeedback(res);
      if (res.success) {
        setWithdrawInput("");
      }
    } catch (e) {
      setWithdrawFeedback({ success: false, msg: "❌ Withdrawal interface communication timed out." });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getRankBadgeStyles = (rank: string) => {
    switch (rank) {
      case 'overlord':
        return { text: 'Overlord', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
      case 'admin':
        return { text: 'Admin', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
      default:
        return { text: 'Member', bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    }
  };

  const rankBadgeObj = getRankBadgeStyles(currentUser.rank);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side Group */}
        <div className="lg:col-span-5 space-y-6">
          {/* Settings Form */}
          <div className="bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl relative overflow-hidden">
            <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase border-l-4 border-primary pl-3 mb-6">
              Access Credentials Mod
            </h3>

            <div className="mb-6">
              <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                New Secret Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-lg px-4 py-3 text-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
                  placeholder="Min 4 letters/digits"
                />
                <Lock className="absolute right-4 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <button
              onClick={handlePasswordSubmit}
              className="w-full bg-cyan-600 hover:bg-cyan-500 border-none py-3.5 block text-white font-display font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]"
            >
              🔑 Re-generate Password
            </button>

            {feedback.msg && (
              <div className={`mt-5 p-3 rounded-lg text-xs font-medium border text-center ${
                feedback.isSuccess 
                  ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400' 
                  : 'bg-rose-500/5 border-rose-500/25 text-rose-400'
              }`}>
                {feedback.msg}
              </div>
            )}

            {/* Voucher Promo Redeem Block */}
            <div className="mt-8 pt-6 border-t border-border-color">
              <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase border-l-4 border-purple-500 pl-3 mb-3">
                Redeem Network Voucher
              </h3>
              <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wide font-sans leading-relaxed">
                Gain extra starter gems and coupon rewards instantly. Codes are shared in our server rooms.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRedeemCode(); }}
                  className="bg-bg-input border border-border-color rounded-lg px-3.5 py-2.5 text-white text-xs outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 uppercase font-display tracking-widest flex-1 cursor-text"
                  placeholder="e.g. WELCOME2026"
                />
                <button
                  onClick={handleRedeemCode}
                  className="bg-purple-600 hover:bg-purple-500 border border-purple-500/35 text-white rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-widest font-display transition-all cursor-pointer active:scale-95 shadow-[0_0_12px_rgba(147,51,234,0.15)] hover:shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                >
                  Claim
                </button>
              </div>

              {promoFeedback && (
                <div className={`mt-4 p-3 rounded-lg text-xs font-semibold text-center border font-display transition-all ${
                  promoFeedback.success
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 animate-pulse'
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                }`}>
                  {promoFeedback.msg}
                </div>
              )}
            </div>

            {/* Daily Ultimate Chest Block */}
            <div className="mt-8 pt-6 border-t border-border-color">
              <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase border-l-4 border-yellow-500 pl-3 mb-3">
                 Daily Ultimate Chest
              </h3>
              <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wide font-sans leading-relaxed">
                Acquire massive recurring free gems every 24 hours. Level up your vaults.
              </p>

              <div className="relative flex flex-col items-center justify-center py-6 px-4 bg-[#030305]/50 rounded-xl border border-border-color overflow-hidden group">
                {/* Pulsing Backlight Glow when ready */}
                {timeRemaining <= 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-indigo-500/5 blur-xl group-hover:scale-110 transition-all duration-700 pointer-events-none" />
                )}
                
                {/* The Chest Representation */}
                <motion.div
                  animate={timeRemaining <= 0 ? {
                    y: [0, -6, 0],
                    rotate: [0, -2, 2, -2, 0],
                  } : {}}
                  transition={{
                    y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                    rotate: { repeat: Infinity, duration: 4, ease: "easeInOut" }
                  }}
                  className="relative z-10 w-24 h-24 mb-4 flex items-center justify-center"
                >
                  {/* Real outer visual chest frame */}
                  <div 
                    onClick={timeRemaining <= 0 ? handleClaimDailySecret : undefined}
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    timeRemaining <= 0 
                      ? "bg-[#0b0c16] border-2 border-yellow-500/40 shadow-[0_0_25px_rgba(234,179,8,0.2)] group-hover:border-yellow-400 group-hover:shadow-[0_0_35px_rgba(234,179,8,0.35)] cursor-pointer" 
                      : "bg-[#05060b] border-2 border-slate-800 text-slate-600 opacity-75 cursor-not-allowed"
                  }`}>
                    {timeRemaining <= 0 ? (
                      <span className="text-4xl filter drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] select-none">🎁</span>
                    ) : (
                      <span className="text-4xl grayscale pr-0.5 select-none opacity-50">🔒</span>
                    )}
                  </div>
                  
                  {/* Floating Particles/Stars when Ready */}
                  {timeRemaining <= 0 && (
                    <>
                      <span className="absolute -top-1 -left-1 text-xs animate-ping duration-1005">✨</span>
                      <span className="absolute -bottom-1 -right-1 text-xs animate-pulse">✨</span>
                      <span className="absolute top-1/2 -right-3 text-xs animate-bounce">💎</span>
                    </>
                  )}
                </motion.div>
                
                {/* Countdown Timer or Status */}
                <div className="text-center z-10 w-full">
                  {timeRemaining <= 0 ? (
                    <div className="mb-3">
                      <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full inline-block font-display animate-pulse">
                        READY FOR EXTRACTION
                      </span>
                      <h4 className="font-display font-black text-white text-md tracking-wide mt-2">
                        Ultimate Daily Locker
                      </h4>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mt-1">
                        Open to claim 10,000 - 50,000 💎
                      </p>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <span className="bg-slate-800 text-slate-400 border border-slate-700/50 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full inline-block font-display">
                        LOCKED BY SECURITY SYS
                      </span>
                      <h4 className="font-display font-medium text-slate-400 text-md tracking-wide mt-2">
                        Ultimate Daily Locker
                      </h4>
                      <div className="mt-2 text-md font-mono text-cyan-400 font-extrabold tracking-wider bg-black/40 border border-white/5 rounded-lg py-1.5 px-4 w-fit mx-auto shadow-inner">
                        ⏱️ {formatTime(timeRemaining)}
                      </div>
                    </div>
                  )}
                  
                  {/* Claim button or feedback panel */}
                  {timeRemaining <= 0 ? (
                    <button
                      type="button"
                      disabled={isLooting}
                      onClick={handleClaimDailySecret}
                      className={`w-full py-3 text-xs font-display font-bold uppercase tracking-wider rounded-lg border cursor-pointer select-none transition-all active:scale-95 ${
                        isLooting 
                          ? "bg-yellow-600/30 text-yellow-400 border-yellow-500/25 cursor-wait" 
                          : "bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-400 font-black shadow-[0_0_15px_rgba(234,179,8,0.25)] hover:shadow-[0_0_20px_rgba(234,179,8,0.45)]"
                      }`}
                    >
                      {isLooting ? "Decrypting Matrix..." : "🎁 VENTURE UNLOCK"}
                    </button>
                  ) : (
                    <div className="w-full bg-[#05060b] border border-slate-800/60 rounded-lg py-3 text-[10px] font-black uppercase text-slate-500 tracking-wider select-none">
                      Recalibration in progress
                    </div>
                  )}
                </div>
                
                {/* Claim success visual effect over layers */}
                {lootResult !== null && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-[#020204]/95 backdrop-blur-sm z-30 flex flex-col justify-center items-center p-4 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center text-2xl animate-bounce mb-3">
                      💎
                    </div>
                    <h3 className="font-display font-black text-yellow-400 text-sm tracking-widest uppercase mb-1">
                      MATRIX DECRYPTED!
                    </h3>
                    <div className="text-2xl font-display font-extrabold text-white tracking-wide mt-2">
                      +{lootResult.toLocaleString()} 💎
                    </div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold leading-relaxed mt-1 max-w-[200px]">
                      Gems compiled and merged successfully to user balance
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLootResult(null);
                        setClaimFeedback(null);
                      }}
                      className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-black border border-yellow-400 rounded-lg px-6 py-2 text-[10px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-[0_0_10px_rgba(234,179,8,0.3)]"
                    >
                      Awesome!
                    </button>
                  </motion.div>
                )}
              </div>

              {claimFeedback && lootResult === null && (
                <div className="mt-4 p-3 rounded-lg text-xs font-semibold text-center border font-display bg-rose-500/10 border-rose-500/25 text-rose-400">
                  {claimFeedback}
                </div>
              )}
            </div>
          </div>

          {/* Gems Liquidation Console */}
          <div className="bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl relative overflow-hidden">
            <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase border-l-4 border-cyan-500 pl-3 mb-3 flex items-center gap-2">
              💎 Gems Liquidation Deck
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-sans leading-relaxed mb-5">
              Instantly withdraw liquid asset gems to your external account node.
            </p>

            {/* Locked vs withdrawable metrics */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#030305]/60 border border-slate-905 rounded-lg p-3">
                <span className="text-[8.5px] text-slate-500 uppercase font-black tracking-widest block mb-1">🔐 Locked Wagering</span>
                <span className="text-xs font-mono font-bold text-yellow-500">💎 {(Number(currentUser.unwageredReward) || 0).toLocaleString()}</span>
              </div>
              <div className="bg-[#030305]/60 border border-slate-905 rounded-lg p-3">
                <span className="text-[8.5px] text-slate-500 uppercase font-black tracking-widest block mb-1">💸 Withdrawable</span>
                <span className="text-xs font-mono font-bold text-cyan-400">💎 {Math.max(0, Number(currentUser.balance) - (Number(currentUser.unwageredReward) || 0)).toLocaleString()}</span>
              </div>
            </div>

            {/* Interactive amount input */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
                Withdrawal Gross Amount (Gems)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={withdrawInput}
                  onChange={(e) => {
                    const cleanVal = e.target.value.replace(/[^0-9]/g, "");
                    if (cleanVal === "") {
                      setWithdrawInput("");
                    } else {
                      setWithdrawInput(Number(cleanVal).toLocaleString());
                    }
                  }}
                  onFocus={() => setIsHoldingBar(true)}
                  onBlur={() => setIsHoldingBar(false)}
                  className="w-full bg-bg-input border border-border-color rounded-lg pl-3 pr-12 py-3.5 text-white font-mono font-semibold text-xs outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all cursor-text"
                  placeholder="e.g. 27,000,000"
                />
                <span className="absolute right-4 top-4 text-[9px] font-black text-[#03b6dc] select-none uppercase">GROSS</span>
              </div>
            </div>

            {/* Quick pre-fill shortcuts */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              <button
                type="button"
                onClick={() => {
                  const maxWithdrawable = Math.max(0, Number(currentUser.balance) - (Number(currentUser.unwageredReward) || 0));
                  setWithdrawInput(maxWithdrawable.toLocaleString());
                }}
                className="bg-[#0c0d18] hover:bg-slate-900 border border-border-color/60 hover:border-slate-800 rounded px-2 py-1 text-[9px] font-mono font-black uppercase text-slate-400 cursor-pointer active:scale-95 transition-all"
              >
                Max Playable
              </button>
              <button
                type="button"
                onClick={() => {
                  const maxWithdrawable = Math.max(0, Number(currentUser.balance) - (Number(currentUser.unwageredReward) || 0));
                  setWithdrawInput(Math.floor(maxWithdrawable * 0.5).toLocaleString());
                }}
                className="bg-[#0c0d18] hover:bg-slate-900 border border-border-color/60 hover:border-slate-800 rounded px-2 py-1 text-[9px] font-mono font-black uppercase text-slate-400 cursor-pointer active:scale-95 transition-all"
              >
                50% Cap
              </button>
              <button
                type="button"
                onClick={() => {
                  const maxWithdrawable = Math.max(0, Number(currentUser.balance) - (Number(currentUser.unwageredReward) || 0));
                  setWithdrawInput(Math.floor(maxWithdrawable * 0.25).toLocaleString());
                }}
                className="bg-[#0c0d18] hover:bg-slate-900 border border-border-color/60 hover:border-slate-800 rounded px-2 py-1 text-[9px] font-mono font-black uppercase text-slate-400 cursor-pointer active:scale-95 transition-all"
              >
                25% Cap
              </button>
              <button
                type="button"
                onClick={() => {
                  setWithdrawInput("");
                }}
                className="bg-[#0c0d18] hover:bg-rose-950/20 border border-border-color/60 hover:border-rose-900/40 rounded px-2 py-1 text-[9px] font-mono font-black uppercase text-rose-400 cursor-pointer active:scale-95 transition-all ml-auto"
              >
                Clear
              </button>
            </div>

            {/* Interactive Slider Tool */}
            <div className="mb-5 bg-[#030305]/40 border border-border-color rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                <span>Interactive Convert Slider</span>
                <span className="text-cyan-400 font-bold">
                  {Math.round(((parseInt(withdrawInput.replace(/,/g, "")) || 0) / Math.max(1, Number(currentUser.balance) - (Number(currentUser.unwageredReward) || 0))) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(0, Number(currentUser.balance) - (Number(currentUser.unwageredReward) || 0))}
                value={parseInt(withdrawInput.replace(/,/g, "")) || 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setWithdrawInput(val === 0 ? "" : val.toLocaleString());
                }}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono uppercase font-bold">
                <span className="cursor-pointer hover:text-white" onClick={() => setWithdrawInput("")}>0% Min</span>
                <span className="cursor-pointer hover:text-white" onClick={() => {
                  const maxWithdrawable = Math.max(0, Number(currentUser.balance) - (Number(currentUser.unwageredReward) || 0));
                  setWithdrawInput(Math.floor(maxWithdrawable * 0.5).toLocaleString());
                }}>50% Half</span>
                <span className="cursor-pointer hover:text-white" onClick={() => {
                  const maxWithdrawable = Math.max(0, Number(currentUser.balance) - (Number(currentUser.unwageredReward) || 0));
                  setWithdrawInput(maxWithdrawable.toLocaleString());
                }}>100% Max</span>
              </div>
            </div>

            {/* Always-visible Dynamic Holding Projection Bar */}
            <div className="mb-5">
              <div className="bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-500/20 rounded-xl p-4 text-xs space-y-2.5 shadow-[0_0_15px_rgba(6,182,212,0.08)]">
                <div className="flex justify-between items-center border-b border-cyan-500/10 pb-1.5">
                  <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                    🪐 Cashout Projection Card
                  </span>
                  <span className="bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase">
                    Rate: 2/3 (1.5x split)
                  </span>
                </div>

                <div className="space-y-1 text-slate-300 font-sans">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Total Balance:</span>
                    <span>💎 {Number(currentUser.balance).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-mono text-amber-400">
                    <span className="text-slate-400">Wager Locked:</span>
                    <span>- 💎 {(Number(currentUser.unwageredReward) || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-mono text-cyan-300 font-extrabold border-t border-cyan-500/10 pt-1">
                    <span>Max Withdrawable:</span>
                    <span>💎 {Math.max(0, Number(currentUser.balance) - (Number(currentUser.unwageredReward) || 0)).toLocaleString()}</span>
                  </div>
                </div>

                {/* Active Input liquidation projection */}
                {parseInt(withdrawInput.replace(/,/g, "")) > 0 && (
                  <div className="bg-black/40 border border-[#06b6d4]/15 rounded-lg p-2.5 space-y-1 scale-[0.98]">
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase font-bold">
                      <span>Liquidating Amount</span>
                      <span className="text-[#06b6d4]">Net Payout (2/3)</span>
                    </div>
                    <div className="flex justify-between items-center font-mono">
                      <span className="text-[#94a3b8] text-xs font-medium">💎 {parseInt(withdrawInput.replace(/,/g, "")).toLocaleString()}</span>
                      <span className="text-xl font-black text-[#06b6d4]">💎 {Math.floor(parseInt(withdrawInput.replace(/,/g, "")) / 1.5).toLocaleString()}</span>
                    </div>
                    <p className="text-[8.5px] text-[#94a3b8] uppercase leading-relaxed font-sans text-center pt-1 block border-t border-[white]/5">
                      You withdraw {parseInt(withdrawInput.replace(/,/g, "")).toLocaleString()} & receive {Math.floor(parseInt(withdrawInput.replace(/,/g, "")) / 1.5).toLocaleString()} Gems!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleWithdrawGems}
              disabled={isWithdrawing}
              className={`w-full py-4 text-xs font-display font-bold uppercase tracking-widest rounded-lg border cursor-pointer select-none transition-all active:scale-95 ${
                isWithdrawing
                  ? "bg-cyan-600/30 text-cyan-400 border-cyan-500/25 cursor-wait"
                  : "bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500/40 font-black shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:shadow-[0_0_20px_rgba(6,182,212,0.35)]"
              }`}
            >
              {isWithdrawing ? "Processing liquidation..." : "📤 LIQUIDATE & WITHDRAW GEMS"}
            </button>

            {withdrawFeedback && (
              <div className={`mt-4 p-3 rounded-lg text-xs font-semibold text-center border font-display transition-all ${
                withdrawFeedback.success
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
              }`}>
                {withdrawFeedback.msg}
              </div>
            )}
          </div>
        </div>

        {/* Profile Overview Column */}
        <div className="lg:col-span-7 bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl">
          <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase border-l-4 border-primary pl-3 mb-6">
            Premium Account Dashboard
          </h3>

          {/* User Card */}
          <div className="bg-bg-input border border-border-color rounded-xl p-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 text-2xl font-bold font-display shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                {currentUser.username[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-semibold text-white tracking-wide text-base">
                    {currentUser.username}
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 border rounded-full font-bold uppercase tracking-wide font-display ${rankBadgeObj.bg}`}>
                    {rankBadgeObj.text}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                  Authorized Session active 
                  {currentUser.customTag && (
                    <span 
                      className="text-[9px] px-1.5 py-0.5 rounded font-black border"
                      style={{ 
                        color: currentUser.customTagColor || '#ffffff', 
                        borderColor: (currentUser.customTagColor || '#ffffff') + '33',
                        backgroundColor: (currentUser.customTagColor || '#ffffff') + '0c'
                      }}
                    >
                      {currentUser.customTag}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 text-left sm:text-right uppercase font-bold tracking-wider mb-0.5">
                Liquid Asset Gems
              </div>
              <div className="text-xl font-display font-extrabold text-cyan-400">
                💎 {currentUser.balance.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Statistics Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-bg-card border border-border-color rounded-xl p-4.5">
              <h5 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">
                Total Deposits
              </h5>
              <div className="text-md font-display font-bold text-emerald-400 truncate font-mono">
                💎 {currentUser.totalDeposit.toLocaleString()}
              </div>
            </div>
            <div className="bg-bg-card border border-border-color rounded-xl p-4.5">
              <h5 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">
                Total Cash-Outs
              </h5>
              <div className="text-md font-display font-bold text-rose-400 truncate font-mono">
                💎 {currentUser.totalCashout.toLocaleString()}
              </div>
            </div>
            <div className="bg-bg-card border border-border-color rounded-xl p-4.5 bg-gradient-to-br from-indigo-950/20 to-transparent">
              <h5 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-indigo-400" /> Total Wagered
              </h5>
              <div className="text-md font-display font-bold text-indigo-400 truncate font-mono">
                💎 {currentUser.totalWager.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Asset deposit banner info */}
          <div className="mt-6 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-lg text-xs leading-relaxed text-indigo-200">
            <span className="font-body font-bold text-white block mb-1">💡 Realtime Database Sync Activation</span>
            Your stats (deposits, wagers, wins) are synchronised instantly over our robust Firebase instance. To adjust your gem quotas or add features, coordinate on Discord!
          </div>
        </div>
      </div>

      {/* Premium Cosmetic Locker Shop */}
      <div className="bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-color/60 pb-5 mb-5 relative z-10">
          <div>
            <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase flex items-center gap-2">
              <ShoppingBag className="h-4.5 w-4.5 text-yellow-500" /> Premium Cosmetic & Chat Decor Shop
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-sans mt-1">
              Purchase premium chat tags and nickname glow modifiers using your standard Gems core balance.
            </p>
          </div>
          <div className="bg-[#030305]/60 border border-border-color/60 p-3 rounded-lg flex flex-col items-start sm:items-end">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Liquid Gems Avaialable</span>
            <span className="text-md font-display font-black text-cyan-400 font-mono">💎 {currentUser.balance.toLocaleString()}</span>
          </div>
        </div>

        {shopFeedback && (
          <div className={`p-3 rounded-lg text-xs font-semibold text-center border font-display mb-5 transition-all ${
            shopFeedback.success
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 animate-pulse'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
          }`}>
            {shopFeedback.msg}
          </div>
        )}

        {/* Shop Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* Tag Title Customizer */}
          <div className="bg-[#030305]/40 border border-border-color/60 rounded-xl p-5">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-border-color/40">
              <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-purple-400" /> Unlock Custom Transmissions Tag
              </h4>
              {currentUser.customTag && (
                <button
                  onClick={() => handleClearCosmetic('tag')}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded px-2.5 py-1 text-[9px] font-display font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                >
                  <Trash2 className="h-3 w-3 inline mr-1" /> Clear Tag
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide leading-relaxed mb-4">
              Add a specialized tag next to your name inside live transmissions chat. Distribute your presence.
            </p>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
              {premiumTags.map((tag) => {
                const isEquipped = currentUser.customTag === tag.value;
                return (
                  <div 
                    key={tag.title} 
                    className={`p-3 rounded-lg border flex justify-between items-center transition-all ${
                      isEquipped 
                        ? 'bg-indigo-950/10 border-indigo-500/40' 
                        : 'bg-bg-input/50 border-border-color/20 hover:border-slate-800'
                    }`}
                  >
                    <span 
                      className="text-[9px] px-2 py-0.5 rounded font-black border tracking-widest"
                      style={{ 
                        color: tag.color,
                        borderColor: tag.color + '40',
                        backgroundColor: tag.color + '10'
                      }}
                    >
                      {tag.title}
                    </span>

                    {isEquipped ? (
                      <span className="text-[9px] text-[#818cf8] font-display font-black tracking-widest uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                        Equipped
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePurchaseCosmetic('tag', tag.value, tag.price)}
                        disabled={isBuying !== null}
                        className="bg-[#070913] hover:bg-indigo-950/30 text-white border border-[#232435] hover:border-indigo-500/30 font-mono text-[9.5px] font-bold px-3 py-1.5 rounded-lg cursor-pointer active:scale-95 transition-all"
                      >
                        💎 {tag.price.toLocaleString()}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Color Customizer */}
          <div className="bg-[#030305]/40 border border-border-color/60 rounded-xl p-5">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-border-color/40">
              <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="h-4 w-4 text-cyan-400" /> Unlock Name Glow Modifier
              </h4>
              {currentUser.customTagColor && (
                <button
                  onClick={() => handleClearCosmetic('color')}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded px-2.5 py-1 text-[9px] font-display font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                >
                  <Trash2 className="h-3 w-3 inline mr-1" /> Clear Color
                </button>
              )}
            </div>

            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide leading-relaxed mb-4">
              Inject custom electromagnetic glowing spectrum signatures into your name.
            </p>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1.5 custom-scrollbar">
              {premiumColors.map((col) => {
                const isEquipped = currentUser.customTagColor === col.value;
                return (
                  <div 
                    key={col.name} 
                    className={`p-3 rounded-lg border flex justify-between items-center transition-all ${
                      isEquipped 
                        ? 'bg-indigo-950/10 border-indigo-500/40' 
                        : 'bg-bg-input/50 border-border-color/20 hover:border-slate-800'
                    }`}
                  >
                    <span 
                      className="text-[11px] font-black tracking-wide font-display"
                      style={{ 
                        color: col.value,
                        textShadow: `0 0 8px ${col.value}77`
                      }}
                    >
                      {col.name}
                    </span>

                    {isEquipped ? (
                      <span className="text-[9px] text-[#818cf8] font-display font-black tracking-widest uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                        Equipped
                      </span>
                    ) : (
                      <button
                        onClick={() => handlePurchaseCosmetic('color', col.value, col.price)}
                        disabled={isBuying !== null}
                        className="bg-[#070913] hover:bg-indigo-950/30 text-white border border-[#232435] hover:border-indigo-500/30 font-mono text-[9.5px] font-bold px-3 py-1.5 rounded-lg cursor-pointer active:scale-95 transition-all"
                      >
                        💎 {col.price.toLocaleString()}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
