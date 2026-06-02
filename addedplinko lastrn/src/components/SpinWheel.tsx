import React, { useState, useEffect, useRef } from "react";
import { Coins, CircleArrowRight, HelpCircle } from "lucide-react";
import { UserData, HistoryCard, SpinSegment } from "../types";
import { parseGems } from "../utils";
import { motion, AnimatePresence } from "motion/react";

interface SpinWheelProps {
  currentUser: { username: string } & UserData;
  balance: number;
  updateUserBalance: (wager: number, payout: number) => Promise<void>;
  addHistory: (game: 'spin' | 'towers' | 'mines' | 'plinko', text: string, isWin: boolean) => void;
  houseEdgeBias?: string;
}

const SEGMENTS: SpinSegment[] = [
  { label: '0.0x Loss', mult: 0.0, color: '#111822' }, // Dark slate graphite
  { label: '0.6x Return', mult: 0.6, color: '#1e3a8a' }, // Solid Dark Blue
  { label: '0.6x Return', mult: 0.6, color: '#1e3a8a' },
  { label: '2.0x Double', mult: 2.0, color: '#10b981' }, // High-voltage emerald green
  { label: '0.0x Loss', mult: 0.0, color: '#111822' },
  { label: '0.6x Return', mult: 0.6, color: '#1e3a8a' },
  { label: '3.0x Triple', mult: 3.0, color: '#ff007f' }, // Deep hot casino magenta
  { label: '0.2x Return', mult: 0.2, color: '#27272a' }  // Sleek zinc gray
];

const HARD_MODE_SEGMENTS: SpinSegment[] = [
  { label: '0.0x Loss', mult: 0.0, color: '#090d16' }, // Space-black onyx
  { label: '0.0x Loss', mult: 0.0, color: '#181e2b' }, // Midnight steel
  { label: '50.0x JACKPOT', mult: 50.0, color: '#eab308' }, // Golden jackpot token yellow
  { label: '0.0x Loss', mult: 0.0, color: '#090d16' },
  { label: '0.0x Loss', mult: 0.0, color: '#181e2b' },
  { label: '0.0x Loss', mult: 0.0, color: '#090d16' },
  { label: '0.0x Loss', mult: 0.0, color: '#181e2b' },
  { label: '0.0x Loss', mult: 0.0, color: '#090d16' }
];

export default function SpinWheel({ currentUser, balance, updateUserBalance, addHistory, houseEdgeBias = "normal" }: SpinWheelProps) {
  const [betValue, setBetValue] = useState<string>("1M");
  const [spinning, setSpinning] = useState<boolean>(false);
  const [hardMode, setHardMode] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'neutral' | 'win' | 'loss'; msg: string | null }>({ type: 'neutral', msg: 'Ready to spin.' });
  const [spinHistory, setSpinHistory] = useState<HistoryCard[]>([]);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startAngleRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const activeSegments = hardMode ? HARD_MODE_SEGMENTS : SEGMENTS;

  useEffect(() => {
    drawWheel(startAngleRef.current);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [hardMode]);

  const drawWheel = (startAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = 140, cy = 140, r = 130;
    const arc = Math.PI / (activeSegments.length / 2);
    
    ctx.clearRect(0, 0, 280, 280);

    // Draw inner wheel wedge segments
    activeSegments.forEach((seg, i) => {
      const angle = startAngle + i * arc;
      ctx.fillStyle = seg.color;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + arc, false);
      ctx.lineTo(cx, cy);
      ctx.fill();

      // Add segment outlines
      ctx.strokeStyle = '#12131a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw label text inside segment
      ctx.save();
      ctx.fillStyle = seg.mult === 50.0 ? '#020617' : '#ffffff'; // contrasting slate dark text for jackpot, bright clean text for others
      ctx.font = '700 11px Inter, sans-serif';
      ctx.translate(cx + Math.cos(angle + arc / 2) * (r - 40), cy + Math.sin(angle + arc / 2) * (r - 40));
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      ctx.fillText(seg.label, -ctx.measureText(seg.label).width / 2, 0);
      ctx.restore();
    });

    // Outer framing ring
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Central core button background
    ctx.fillStyle = '#020204';
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2, false);
    ctx.fill();

    // Core button stroke
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.stroke();

    // Core text
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px "Chakra Petch", sans-serif';
    ctx.fillText('SPIN', cx - ctx.measureText('SPIN').width / 2, cy + 4);
  };

  const handleShortcutBet = (percent: number) => {
    const calculated = Math.round(balance * percent);
    setBetValue(calculated.toLocaleString());
  };

  const throwParticles = () => {
    const newParticles = Array.from({ length: 14 }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 160,
      y: (Math.random() - 0.5) * 160 - 40,
      emoji: '💎'
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);
  };

  const triggerSpin = async () => {
    if (spinning) return;
    const numericBet = parseGems(betValue);

    if (numericBet < 1_000_000) {
      setFeedback({ type: 'loss', msg: 'Minimum bet is 1M gems.' });
      return;
    }
    if (numericBet > 5_000_000_000) {
      setFeedback({ type: 'loss', msg: 'Maximum bet is 5B gems.' });
      return;
    }

    const actualWager = numericBet;

    if (balance < actualWager) {
      setFeedback({ 
        type: 'loss', 
        msg: 'Insufficient balance of gems.'
      });
      return;
    }

    setSpinning(true);
    setFeedback({ type: 'neutral', msg: 'The wheel index is spinning...' });

    // Instantly subtract the bet amount
    await updateUserBalance(actualWager, 0);

    // 1. Select target landing segment index using chances
    let targetIndex = Math.floor(Math.random() * activeSegments.length);
    const isOverlord = currentUser.rank === 'overlord';

    if (hardMode) {
      // Hard Mode selection logic - 50x Jackpot is extremely rare!
      let jackpotChance = 0.0015; // 0.15% base chance (exceptionally rare)
      
      if (isOverlord) {
        jackpotChance = 0.03; // 3% chance for overlords
      } else if (houseEdgeBias === 'ripped') {
        jackpotChance = 0.0003; // 0.03% chance (virtually impossible)
      } else if (houseEdgeBias === 'easy' || houseEdgeBias === 'god') {
        jackpotChance = 0.006; // 0.6% chance
      }

      if (Math.random() < jackpotChance) {
        targetIndex = 2; // Index of 50.0x jackpot
      } else {
        // Fallback to one of the 0x loss slots
        const lossIndices = [0, 1, 3, 4, 5, 6, 7];
        targetIndex = lossIndices[Math.floor(Math.random() * lossIndices.length)];
      }
    } else {
      // Normal Mode
      // We have dynamic weights to achieve lower win rates for high multipliers
      let weightLoss = 70;     // 70% loss (0x) - very hard!
      let weightPointTwo = 18; // 18% back (0.2x)
      let weightPointSix = 10; // 10% back (0.6x)
      let weightDouble = 1.83; // 1.83% double (2.0x)
      let weightTriple = 0.17; // 0.17% triple (3.0x) - extremely rare (1 in ~600 rolls!)

      if (isOverlord) {
        // Overlords get slightly better odds but not ridiculously broken
        weightLoss = 45;
        weightPointTwo = 20;
        weightPointSix = 20;
        weightDouble = 13;
        weightTriple = 2;
      } else if (houseEdgeBias === 'ripped') {
        weightLoss = 85;
        weightPointTwo = 10;
        weightPointSix = 4.7;
        weightDouble = 0.25;
        weightTriple = 0.05;
      } else if (houseEdgeBias === 'easy' || houseEdgeBias === 'god') {
        weightLoss = 40;
        weightPointTwo = 22;
        weightPointSix = 22;
        weightDouble = 13;
        weightTriple = 3;
      }

      const totalWeight = weightLoss + weightPointTwo + weightPointSix + weightDouble + weightTriple;
      const rand = Math.random() * totalWeight;

      if (rand < weightLoss) {
        // Land on 0x (indices 0 or 4)
        targetIndex = Math.random() < 0.5 ? 0 : 4;
      } else if (rand < weightLoss + weightPointTwo) {
        // Land on 0.2x (index 7)
        targetIndex = 7;
      } else if (rand < weightLoss + weightPointTwo + weightPointSix) {
        // Land on 0.6x (indices 1, 2, or 5)
        const pointSixIndices = [1, 2, 5];
        targetIndex = pointSixIndices[Math.floor(Math.random() * pointSixIndices.length)];
      } else if (rand < weightLoss + weightPointTwo + weightPointSix + weightDouble) {
        // Land on 2x (index 3)
        targetIndex = 3;
      } else {
        // Land on 3x (index 6)
        targetIndex = 6;
      }
    }

    const finalSegment = activeSegments[targetIndex];

    // 2. Compute exact target landing angle
    const arc = (2 * Math.PI) / activeSegments.length;
    let targetAngle = 1.5 * Math.PI - (targetIndex + 0.5) * arc;

    // Ensure we rotate forward at least 8 full rotations
    const totalSpinTime = 4000;
    const numRevolutions = 8;
    const finalAngle = targetAngle + numRevolutions * 2 * Math.PI;

    const startAngleValue = startAngleRef.current;
    const angleDiff = finalAngle - startAngleValue;
    const startTime = Date.now();

    const animate = async () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= totalSpinTime) {
        startAngleRef.current = finalAngle % (2 * Math.PI);
        drawWheel(startAngleRef.current);

        // 3. Resolve result
        const finalMultiplier = finalSegment.mult;
        const payout = Math.round(numericBet * finalMultiplier);

        if (payout > 0) {
          await updateUserBalance(0, payout);
          const profit = payout - actualWager;
          setFeedback({
            type: 'win',
            msg: `🎉 Landed on ${finalSegment.label}! Won +${payout.toLocaleString()} 💎 ${profit >= 0 ? `(Profit: +${profit.toLocaleString()})` : `(Loss: -${Math.abs(profit).toLocaleString()})`}`
          });
          throwParticles();
          
          const record: HistoryCard = { 
            text: `Spin (${finalMultiplier}x): +${payout.toLocaleString()} 💎`, 
            isWin: true 
          };
          setSpinHistory(prev => [record, ...prev].slice(0, 15));
          addHistory('spin', `Spin (${finalMultiplier}x): +${payout.toLocaleString()} 💎`, true);
        } else {
          setFeedback({
            type: 'loss',
            msg: `💥 Landed on 0.0x Loss! Lost -${actualWager.toLocaleString()} 💎`
          });
          
          const record: HistoryCard = { 
            text: `Spin (0.0x): -${actualWager.toLocaleString()} 💎`, 
            isWin: false 
          };
          setSpinHistory(prev => [record, ...prev].slice(0, 15));
          addHistory('spin', `Spin (0.0x): Landed on Loss (-${actualWager.toLocaleString()})`, false);
        }

        setSpinning(false);
        return;
      }

      // Cubic Ease Out Easing progress
      const progress = elapsed / totalSpinTime;
      const t = 1 - Math.pow(1 - progress, 3);
      startAngleRef.current = startAngleValue + angleDiff * t;
      drawWheel(startAngleRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Settings Panel */}
      <div className="lg:col-span-5 bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl relative overflow-hidden">
        <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase border-l-4 border-primary pl-3 mb-6">
          Spin Wheel Settings
        </h3>

        <div className="mb-6">
          <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
            Bet Amount
          </label>
          <div className="relative">
            <input
              type="text"
              value={betValue}
              disabled={spinning}
              onChange={(e) => setBetValue(e.target.value)}
              className="w-full bg-bg-input border border-border-color rounded-lg px-4 py-3 text-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all disabled:opacity-50"
              placeholder="e.g. 1M, 5M, 20M"
            />
            <Coins className="absolute right-4 top-3.5 h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* Shortcuts */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <button
            onClick={() => handleShortcutBet(0.1)}
            disabled={spinning}
            className="bg-bg-card hover:bg-primary/20 border border-border-color hover:border-primary/50 text-slate-200 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            10%
          </button>
          <button
            onClick={() => handleShortcutBet(0.25)}
            disabled={spinning}
            className="bg-bg-card hover:bg-primary/20 border border-border-color hover:border-primary/50 text-slate-200 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            25%
          </button>
          <button
            onClick={() => handleShortcutBet(0.5)}
            disabled={spinning}
            className="bg-bg-card hover:bg-primary/20 border border-border-color hover:border-primary/50 text-slate-200 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            50%
          </button>
          <button
            onClick={() => handleShortcutBet(1.0)}
            disabled={spinning}
            className="bg-bg-card hover:bg-primary/20 border border-border-color hover:border-primary/50 text-slate-200 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
          >
            MAX
          </button>
        </div>

        {/* Spin Wheel Hard Mode Option */}
        <div className="mb-5 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
              Hard Mode 🔥
            </span>
            <span className="text-[10px] text-slate-400">
              7 losses (0.0x), exactly 1 Jackpot of 50.0x!
            </span>
          </div>
          <input
            type="checkbox"
            id="hard-mode-checkbox"
            checked={hardMode}
            disabled={spinning}
            onChange={(e) => setHardMode(e.target.checked)}
            className="w-4 h-4 text-rose-500 accent-rose-500 cursor-pointer rounded disabled:opacity-50"
          />
        </div>

        {/* Submit */}
        <button
          onClick={triggerSpin}
          disabled={spinning}
          className="w-full bg-primary hover:brightness-110 border-none py-3.5 block text-white font-display font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-all shadow-md shadow-indigo-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {spinning ? '🏥 Spinning Index...' : '🎡 Pull Lever & Spin'}
        </button>

        {/* Feedback box */}
        <div className={`mt-5 p-3 rounded-lg text-xs font-medium border text-center ${
          feedback.type === 'win' 
            ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400' 
            : feedback.type === 'loss' 
              ? 'bg-rose-500/5 border-rose-500/25 text-rose-400' 
              : 'bg-bg-input border-border-color text-slate-400'
        }`}>
          {feedback.msg}
        </div>

        {/* Mini Game History list */}
        <div className="mt-6 border-t border-border-color pt-4">
          <h4 className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-2.5">
            Your Spins History
          </h4>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {spinHistory.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex justify-between items-center text-[11px] p-2 bg-bg-input border border-border-color rounded-md ${
                    h.isWin ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-rose-500'
                  }`}
                >
                  <span className="text-slate-300 truncate max-w-[80%]">{h.text}</span>
                  <span className={`font-bold ${h.isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {h.isWin ? 'WIN' : 'LOSS'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {spinHistory.length === 0 && (
              <div className="text-[11px] text-slate-600 py-3 text-center italic">
                No spins recorded in this session.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wheel Visual Graphic Canvas Panel */}
      <div className="lg:col-span-7 bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
        {/* Dynamic win pop overlay */}
        <AnimatePresence>
          {particles.length > 0 && (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="absolute pointer-events-none text-cyan-400 font-display font-extrabold text-2xl z-10"
              style={{ top: '15%' }}
            >
              BIG payout! 💎
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wheel container */}
        <div className="relative">
          {/* Top cyan pin marker arrow pointer */}
          <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[16px] border-t-cyan-400 z-10 drop-shadow-[0_2px_8px_rgba(6,182,212,0.4)]" />
          
          <div className="rounded-full bg-slate-950 p-2 border border-border-color/60 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
            <canvas ref={canvasRef} width="280" height="280" className="block max-w-full" />
          </div>
        </div>

        {/* Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ 
                x: p.x, 
                y: p.y, 
                opacity: 0, 
                scale: 0.3,
                rotate: Math.random() * 360 
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="absolute left-1/2 top-1/2 text-lg z-20"
            >
              {p.emoji}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
