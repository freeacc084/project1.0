import React, { useState } from "react";
import { Hammer, Coins, Eye, Skull, Gem, CheckCircle, Crosshair } from "lucide-react";
import { UserData, HistoryCard } from "../types";
import { parseGems } from "../utils";
import { motion, AnimatePresence } from "motion/react";

interface SafeMinesProps {
  currentUser: { username: string } & UserData;
  balance: number;
  updateUserBalance: (wager: number, payout: number) => Promise<void>;
  addHistory: (game: 'spin' | 'towers' | 'mines' | 'plinko', text: string, isWin: boolean) => void;
  houseEdgeBias?: string;
}

export default function SafeMines({ currentUser, balance, updateUserBalance, addHistory, houseEdgeBias = "normal" }: SafeMinesProps) {
  const [bombCount, setBombCount] = useState<number>(3);
  const [betValue, setBetValue] = useState<string>("1M");
  const [active, setActive] = useState<boolean>(false);
  
  // Game state
  const [gridIndices, setGridIndices] = useState<number[]>(Array(25).fill(0)); // 0: unrevealed, 1: gem revealed, 2: exploded
  const [gridBombs, setGridBombs] = useState<boolean[]>(Array(25).fill(false)); // true if contains bomb
  const [gemsFound, setGemsFound] = useState<number>(0);
  
  const [feedback, setFeedback] = useState<{ type: 'neutral' | 'win' | 'loss'; msg: string | null }>({
    type: 'neutral',
    msg: 'Set bombs and bet count, then deploy.'
  });
  const [minesHistory, setMinesHistory] = useState<HistoryCard[]>([]);
  const [particles, setParticles] = useState<{ id: number; offset: number }[]>([]);

  // Calculate live mines multiplier with clean progressive scaling
  const calcMinesMult = (revealedSafeCount: number, minesBombs: number) => {
    if (revealedSafeCount <= 0) return 1.0;
    
    const totalSafe = 25 - minesBombs;
    let finalMult = 1.0;

    for (let s = 1; s <= revealedSafeCount; s++) {
      let stepBoost = 0.04 + (minesBombs * 0.04);
      if (s <= 7) {
        // low payout increases for the first 1-7 tiles as requested
        stepBoost = 0.025 + (minesBombs * 0.02);
      } else {
        const leftSafe = totalSafe - s;
        // Jumps progressively higher as safe spaces are depleted!
        const multiplierBoost = 1.0 + (minesBombs * 0.3) / (leftSafe + 1);
        stepBoost = (0.05 + (minesBombs * 0.08)) * multiplierBoost;
      }
      finalMult += stepBoost;
    }

    // Safety payout margin for different bomb selections
    const minFirstWin = 1.0 + (minesBombs * 0.05);
    if (revealedSafeCount === 1 && finalMult < minFirstWin) {
      finalMult = minFirstWin;
    }
    
    return parseFloat(Math.max(1.0 + (revealedSafeCount * 0.02), finalMult).toFixed(2));
  };

  const handleShortcutBet = (percent: number) => {
    const calculated = Math.round(balance * percent);
    setBetValue(calculated.toLocaleString());
  };

  // Start Mines Deploy
  const deployGrid = async () => {
    if (active) return;
    const numericBet = parseGems(betValue);

    if (bombCount < 1 || bombCount > 24) {
      setFeedback({ type: 'loss', msg: 'Mines bomb count must be between 1 and 24.' });
      return;
    }
    if (numericBet < 1_000_000) {
      setFeedback({ type: 'loss', msg: 'Minimum bet is 1M gems.' });
      return;
    }
    if (numericBet > 5_000_000_000) {
      setFeedback({ type: 'loss', msg: 'Maximum bet is 5B gems.' });
      return;
    }
    if (balance < numericBet) {
      setFeedback({ type: 'loss', msg: 'Insufficient balance of gems.' });
      return;
    }

    // Spend bet balance instantly
    await updateUserBalance(numericBet, 0);

    // Form random grid of 25 cells
    const bombsLayout = Array(25).fill(false);
    let placed = 0;
    while (placed < bombCount) {
      const i = Math.floor(Math.random() * 25);
      if (!bombsLayout[i]) {
        bombsLayout[i] = true;
        placed++;
      }
    }

    setGridBombs(bombsLayout);
    setGridIndices(Array(25).fill(0)); // Reset all cells to unrevealed
    setGemsFound(0);
    setActive(true);
    setFeedback({ type: 'neutral', msg: 'Mines grid online! Tap cells to scan for safe gems.' });
  };

  const handleCellClick = async (idx: number) => {
    if (!active) return;
    if (gridIndices[idx] !== 0) return; // Already revealed

    const isBomb = gridBombs[idx];
    const newGrid = [...gridIndices];

    if (isBomb) {
      // Hit a bomb
      newGrid[idx] = 2; // set to exploded
      setGridIndices(newGrid);
      setActive(false);

      const numericBet = parseGems(betValue);
      setFeedback({
        type: 'loss',
        msg: `💥 Boom! Hit a bomb at cell ${idx + 1}! Lost -${numericBet.toLocaleString()} 💎`
      });

      const record: HistoryCard = { 
        text: `Mines (${bombCount} bombs): Exploded (-${numericBet.toLocaleString()})`, 
        isWin: false 
      };
      setMinesHistory(prev => [record, ...prev].slice(0, 15));
      addHistory('mines', `Mines (${bombCount} bombs): Lost on cell ${idx + 1}`, false);

    } else {
      // Found a safe gem!
      newGrid[idx] = 1; // set to gem revealed
      setGridIndices(newGrid);

      const updatedCount = gemsFound + 1;
      setGemsFound(updatedCount);

      const mult = calcMinesMult(updatedCount, bombCount);
      const profit = Math.round(parseGems(betValue) * mult);

      setFeedback({
        type: 'win',
        msg: `💎 Gem scanned successfully! Current Multiplier: ${mult}x. Potential payout: +${profit.toLocaleString()}`
      });

      // Quick win burst indicator logic
      setParticles(prev => [...prev, { id: Date.now(), offset: idx }]);
      setTimeout(() => {
        setParticles(prev => prev.filter(p => prev.indexOf(p) > 0)); // prune old
      }, 800);

      // Auto cash-out if all gems are revealed successfully
      const winCountLimit = 25 - bombCount;
      if (updatedCount === winCountLimit) {
        // Force complete win and payout
        setActive(false);
        const payout = Math.round(parseGems(betValue) * mult);
        await updateUserBalance(0, payout);
        
        setFeedback({
          type: 'win',
          msg: `🏆 PERFECT INFILTRATION! All clear - payout +${payout.toLocaleString()} 💎`
        });

        const record: HistoryCard = { 
          text: `Mines (${bombCount} b): Perfect win (+${payout.toLocaleString()})`, 
          isWin: true 
        };
        setMinesHistory(prev => [record, ...prev].slice(0, 15));
        addHistory('mines', `Mines (${bombCount} b): Perfect sweep (+${payout.toLocaleString()})`, true);
      }
    }
  };

  const cashOut = async () => {
    if (!active || gemsFound === 0) return;

    setActive(false);
    const activeMult = calcMinesMult(gemsFound, bombCount);
    const numericBet = parseGems(betValue);
    const payout = Math.round(numericBet * activeMult);

    await updateUserBalance(0, payout);

    setFeedback({
      type: 'win',
      msg: `💰 Secure cash out completed! Collected +${payout.toLocaleString()} 💎`
    });

    const record: HistoryCard = { 
      text: `Mines (${bombCount} bombs): Cashed out at ${gemsFound} gems (+${payout.toLocaleString()})`, 
      isWin: true 
    };
    setMinesHistory(prev => [record, ...prev].slice(0, 15));
    addHistory('mines', `Mines: Scanned ${gemsFound} gems (+${payout.toLocaleString()})`, true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Settings Grid */}
      <div className="lg:col-span-5 bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl relative overflow-hidden">
        <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase border-l-4 border-primary pl-3 mb-6">
          Mines Grid Matrix Settings
        </h3>

        {/* Bomb Count Numeric Slider input */}
        <div className="mb-5">
          <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
            Number of Bombs (1–24)
          </label>
          <div className="flex gap-4">
            <input
              type="range"
              min="1"
              max="24"
              value={bombCount}
              disabled={active}
              onChange={(e) => setBombCount(parseInt(e.target.value))}
              className="flex-1 accent-indigo-500 bg-bg-input disabled:opacity-50 cursor-pointer h-1.5 self-center rounded-lg"
            />
            <span className="bg-bg-input border border-border-color rounded px-3 py-1 font-display font-bold text-white text-xs whitespace-nowrap">
              💣 {bombCount} bombs
            </span>
          </div>
        </div>

        {/* Wager input */}
        <div className="mb-6">
          <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
            Wager Amount
          </label>
          <div className="relative">
            <input
              type="text"
              value={betValue}
              disabled={active}
              onChange={(e) => setBetValue(e.target.value)}
              className="w-full bg-bg-input border border-border-color rounded-lg px-4 py-3 text-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all disabled:opacity-50"
              placeholder="e.g. 5M, 20M, 500M"
            />
            <Coins className="absolute right-4 top-3.5 h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* Shortcuts row */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <button
            onClick={() => handleShortcutBet(0.1)}
            disabled={active}
            className="bg-bg-card hover:bg-primary/20 border border-border-color hover:border-primary/50 text-slate-200 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            10%
          </button>
          <button
            onClick={() => handleShortcutBet(0.25)}
            disabled={active}
            className="bg-bg-card hover:bg-primary/20 border border-border-color hover:border-primary/50 text-slate-200 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            25%
          </button>
          <button
            onClick={() => handleShortcutBet(0.5)}
            disabled={active}
            className="bg-bg-card hover:bg-primary/20 border border-border-color hover:border-primary/50 text-slate-200 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            50%
          </button>
          <button
            onClick={() => handleShortcutBet(1.0)}
            disabled={active}
            className="bg-bg-card hover:bg-primary/20 border border-border-color hover:border-primary/50 text-slate-200 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            MAX
          </button>
        </div>

        {/* Next Multiplying Jumps preview */}
        {active && (
          <div className="mb-5 bg-[#0a0f14]/60 border border-border-color p-3.5 rounded-lg select-none">
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
              Upcoming Multipliers
            </span>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {[1, 2, 3, 4, 5].map((offset) => {
                const stepIdx = gemsFound + offset;
                const limitMax = 25 - bombCount;
                if (stepIdx > limitMax) return null;
                const nextMult = calcMinesMult(stepIdx, bombCount);
                return (
                  <div key={offset} className={`p-1.5 rounded bg-bg-card border ${offset === 1 ? 'border-indigo-500 bg-indigo-950/20' : 'border-border-color'}`}>
                    <div className="text-[10px] font-bold text-white font-mono">
                      {nextMult}x
                    </div>
                    <div className="text-[8px] text-slate-500 font-medium">
                      Hit {stepIdx}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Controls action buttons */}
        {!active ? (
          <button
            onClick={deployGrid}
            className="w-full bg-primary hover:brightness-110 border-none py-3.5 block text-white font-display font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-all shadow-md shadow-indigo-600/30"
          >
            💣 Deploy Grid
          </button>
        ) : (
          <button
            onClick={cashOut}
            disabled={gemsFound === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 border-none py-3.5 block text-white font-display font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            💰 Cash Out (+{calcMinesMult(gemsFound, bombCount)}x)
          </button>
        )}

        {/* Feedback area */}
        <div className={`mt-5 p-3 rounded-lg text-xs font-medium border text-center ${
          feedback.type === 'win' 
            ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400' 
            : feedback.type === 'loss' 
              ? 'bg-rose-500/5 border-rose-500/25 text-rose-400' 
              : 'bg-bg-input border-border-color text-slate-400'
        }`}>
          {feedback.msg}
        </div>

        {/* Session history panel */}
        <div className="mt-6 border-t border-border-color pt-4">
          <h4 className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-2.5">
            Mines History
          </h4>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {minesHistory.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex justify-between items-center text-[11px] p-2 bg-bg-input border border-border-color rounded-md ${
                    h.isWin ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-rose-500'
                  }`}
                >
                  <span className="text-slate-300 truncate max-w-[85%]">{h.text}</span>
                  <span className={`font-bold ${h.isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {h.isWin ? 'WIN' : 'LOSS'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {minesHistory.length === 0 && (
              <div className="text-[11px] text-slate-600 py-3 text-center italic">
                Set active hazard bombs and claim big dividends.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid visual panel */}
      <div className="lg:col-span-7 bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl flex flex-col justify-between min-h-[500px]">
        {/* Metric feedback bar */}
        <div className="grid grid-cols-3 gap-2 border-b border-border-color pb-4 mb-5 text-slate-400 text-center text-xs font-bold uppercase tracking-wider">
          <div className="border-r border-border-color">
            Gems Found: <span className="text-white block mt-1 font-display font-medium text-base">{gemsFound}</span>
          </div>
          <div className="border-r border-border-color">
            Multiplier: <span className="text-cyan-400 block mt-1 font-display font-medium text-base">{calcMinesMult(gemsFound, bombCount)}x</span>
          </div>
          <div>
            Current profit: <span className="text-emerald-400 block mt-1 font-display font-medium text-base">
              💎 {gemsFound > 0 ? (Math.round(parseGems(betValue) * calcMinesMult(gemsFound, bombCount))).toLocaleString() : '0'}
            </span>
          </div>
        </div>

        {/* Interactive 5x5 Matrix Layout */}
        <div className="grid grid-cols-5 gap-3 max-w-[480px] mx-auto w-full mb-8">
          {Array.from({ length: 25 }).map((_, idx) => {
            const scanStatus = gridIndices[idx]; // 0: unrevealed, 1: safe visual gem, 2: exploded bomb
            const isBombAtSlot = gridBombs[idx];
            
            // Show end state layout
            const revealFinalEndState = !active && gemsFound > 0;
            
            let symbolContent = "?";
            let customTileColor = "bg-bg-card border-border-color text-slate-500 hover:border-slate-500 hover:bg-slate-900";

            if (scanStatus === 1) {
              symbolContent = "💎";
              customTileColor = "bg-emerald-900/30 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]";
            } else if (scanStatus === 2) {
              symbolContent = "💥";
              customTileColor = "bg-rose-950/40 border-rose-500 text-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.15)]";
            } else if (revealFinalEndState) {
              if (isBombAtSlot) {
                symbolContent = "💣";
                customTileColor = "bg-slate-950 border-rose-950/40 opacity-40 text-rose-500";
              } else {
                symbolContent = "💎";
                customTileColor = "bg-slate-950 border-emerald-950/40 opacity-40 text-emerald-500";
              }
            }

            const canHoverAction = active && scanStatus === 0;

            return (
              <motion.div
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`relative aspect-square border-2 rounded-xl flex flex-col justify-center items-center font-display font-bold text-xl select-none transition-all duration-200 ${customTileColor} ${
                  canHoverAction ? 'cursor-pointer' : 'cursor-default pointer-events-none'
                }`}
                whileHover={canHoverAction ? { scale: 1.05 } : {}}
              >
                {symbolContent}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
