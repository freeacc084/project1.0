import React, { useState, useEffect } from "react";
import { Sparkles, Trophy, Skull, Flame, ShieldAlert, Coins } from "lucide-react";
import { UserData, HistoryCard, TowerDifficulty } from "../types";
import { parseGems } from "../utils";
import { motion, AnimatePresence } from "motion/react";

interface TowerAscentProps {
  currentUser: { username: string } & UserData;
  balance: number;
  updateUserBalance: (wager: number, payout: number) => Promise<void>;
  addHistory: (game: 'spin' | 'towers' | 'mines' | 'plinko', text: string, isWin: boolean) => void;
  houseEdgeBias?: string;
}

const TOWER_FLOORS_MAX = 8;

export default function TowerAscent({ currentUser, balance, updateUserBalance, addHistory, houseEdgeBias = "normal" }: TowerAscentProps) {
  const [difficulty, setDifficulty] = useState<TowerDifficulty>('easy');
  const [betValue, setBetValue] = useState<string>("1M");
  const [active, setActive] = useState<boolean>(false);
  const [currentFloor, setCurrentFloor] = useState<number>(0); // 0 to 7
  const [floorLayouts, setFloorLayouts] = useState<number[][]>([]); // 0: safe, 1: bomb
  const [revealedFloors, setRevealedFloors] = useState<{ [floor: number]: number }>({}); // floor -> cellPicked
  const [explodedFloor, setExplodedFloor] = useState<{ floor: number; cell: number } | null>(null);
  
  const [feedback, setFeedback] = useState<{ type: 'neutral' | 'win' | 'loss'; msg: string | null }>({ type: 'neutral', msg: 'Configure your bet and start.' });
  const [gameHistory, setGameHistory] = useState<HistoryCard[]>([]);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  const TOWER_MULTIPLIERS: Record<TowerDifficulty, number[]> = {
    easy: [1.01, 1.02, 1.03, 1.12, 1.25, 1.42, 1.65, 1.95],
    normal: [1.3, 1.8, 2.6, 3.8, 5.8, 9.0, 14.5, 25.0],
    hard: [1.8, 3.5, 7.5, 16.0, 34.0, 68.0, 110.0, 150.0],
  };

  // Calculate tower multipliers step by step
  const calcMultiplierForFloor = (tierIndex: number, diffType: TowerDifficulty) => {
    return TOWER_MULTIPLIERS[diffType]?.[tierIndex] ?? 1.0;
  };

  const handleShortcutBet = (percent: number) => {
    const calculated = Math.round(balance * percent);
    setBetValue(calculated.toLocaleString());
  };

  const startGame = async () => {
    if (active) return;
    const numericBet = parseGems(betValue);

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

    // Instantly subtract the bet
    await updateUserBalance(numericBet, 0);

    // Initialize layout for each floor inside grid
    const bombsCount = difficulty === 'easy' ? 1 : difficulty === 'normal' ? 2 : 3;
    const cellsInRow = difficulty === 'hard' ? 4 : 3;
    const layouts: number[][] = [];
    
    for (let f = 0; f < TOWER_FLOORS_MAX; f++) {
      const floorNodes = Array(cellsInRow).fill(0);
      let placed = 0;
      while (placed < bombsCount) {
        const i = Math.floor(Math.random() * cellsInRow);
        if (floorNodes[i] === 0) {
          floorNodes[i] = 1;
          placed++;
        }
      }
      layouts.push(floorNodes);
    }

    setFloorLayouts(layouts);
    setRevealedFloors({});
    setExplodedFloor(null);
    setCurrentFloor(0);
    setActive(true);
    setFeedback({ type: 'neutral', msg: 'Tower grid active! Pick a safe tile on current floor.' });
  };

  const handleCellSelect = async (floorIndex: number, cellIndex: number) => {
    if (!active || floorIndex !== currentFloor) return;

    let isBomb = floorLayouts[floorIndex][cellIndex] === 1;
    const isOverlord = currentUser.rank === 'overlord';
    const isAdmin = currentUser.rank === 'admin' || isOverlord;

    // Rigged extra difficulty: adjust based on settings and rank
    let unfairBombRate = 0.15;
    if (houseEdgeBias === 'ripped') {
      unfairBombRate = isAdmin ? 0.0 : 0.35;
    } else if (houseEdgeBias === 'god' || isOverlord) {
      unfairBombRate = 0.0;
    }

    // Rigged extra difficulty: chance to trigger a surprise bomb on safe cells if not an admin and floor level is > 0
    if (!isBomb && !isAdmin && floorIndex > 0 && Math.random() < unfairBombRate) {
      isBomb = true;
      // Synthesize layout update so visual explosion is triggered correctly on this cell
      const updatedLayouts = [...floorLayouts];
      updatedLayouts[floorIndex] = [...updatedLayouts[floorIndex]];
      updatedLayouts[floorIndex][cellIndex] = 1;
      setFloorLayouts(updatedLayouts);
    }

    // Capture pick state
    setRevealedFloors(prev => ({ ...prev, [floorIndex]: cellIndex }));

    if (isBomb) {
      // Exploded
      setExplodedFloor({ floor: floorIndex, cell: cellIndex });
      setActive(false);
      
      const numericBet = parseGems(betValue);
      setFeedback({
        type: 'loss',
        msg: `💥 Bomb exploded on floor ${floorIndex + 1}! Lost -${numericBet.toLocaleString()} 💎`
      });

      const record: HistoryCard = { 
        text: `Towers (${difficulty}): Hit bomb on floor ${floorIndex + 1} (-${numericBet.toLocaleString()})`, 
        isWin: false 
      };
      setGameHistory(prev => [record, ...prev].slice(0, 15));
      addHistory('towers', `Towers (${difficulty}): Lost on floor ${floorIndex + 1}`, false);

    } else {
      // Safe check
      const currentMult = calcMultiplierForFloor(floorIndex, difficulty);

      if (floorIndex === TOWER_FLOORS_MAX - 1) {
        // High-Rise Completed!
        setActive(false);
        const numericBet = parseGems(betValue);
        
        // Apply 2.5x multiplier boost for Overlords if high luck modes are active!
        let customMult = currentMult;
        if (isOverlord && (houseEdgeBias === 'god' || houseEdgeBias === 'ripped')) {
          customMult = customMult * 2.5;
        }
        const payout = Math.round(numericBet * customMult);
        
        await updateUserBalance(0, payout);

        setFeedback({
          type: 'win',
          msg: `🏆 CONGRATULATIONS! cleared all 8 floors!${isOverlord && customMult !== currentMult ? " (Applied 2.5x Overlord Booster!)" : ""} +${payout.toLocaleString()} 💎`
        });

        // Trigger dynamic confetti burst
        setParticles(Array.from({ length: 15 }).map((_, i) => ({
          id: i,
          x: (Math.random() - 0.5) * 140,
          y: (Math.random() - 0.5) * 140 - 20
        })));
        setTimeout(() => setParticles([]), 1200);

        const record: HistoryCard = { 
          text: `Towers (${difficulty}): cleared 8 floors (+${payout.toLocaleString()})`, 
          isWin: true 
        };
        setGameHistory(prev => [record, ...prev].slice(0, 15));
        addHistory('towers', `Towers (${difficulty}): cleared 8 floors (+${payout.toLocaleString()})`, true);

      } else {
        // Advance floor
        setCurrentFloor(prev => prev + 1);
        setFeedback({
          type: 'win',
          msg: `✅ Floor ${floorIndex + 1} secure! Multiplier: ${currentMult}x.${isOverlord ? " (Overlord bypass active!)" : ""} Continue or Cash Out!`
        });
      }
    }
  };

  const cashOut = async () => {
    if (!active || currentFloor === 0) return;

    setActive(false);
    const activeMult = calcMultiplierForFloor(currentFloor - 1, difficulty);
    const numericBet = parseGems(betValue);
    
    // Apply 2.5x multiplier boost for Overlords if high luck modes are active!
    const isOverlord = currentUser.rank === 'overlord';
    let customMult = activeMult;
    if (isOverlord && (houseEdgeBias === 'god' || houseEdgeBias === 'ripped')) {
      customMult = customMult * 2.5;
    }
    const payout = Math.round(numericBet * customMult);

    await updateUserBalance(0, payout);

    setFeedback({
      type: 'win',
      msg: `💰 Cashed out! Won +${payout.toLocaleString()} 💎 at multiplier ${customMult}x!${isOverlord && customMult !== activeMult ? " (Applied 2.5x Overlord Booster!)" : ""}`
    });

    const record: HistoryCard = { 
      text: `Towers (${difficulty}): Cashed out on floor ${currentFloor} (+${payout.toLocaleString()})`, 
      isWin: true 
    };
    setGameHistory(prev => [record, ...prev].slice(0, 15));
    addHistory('towers', `Towers (${difficulty}): Cashed out floor ${currentFloor} (+${payout.toLocaleString()})`, true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Configuration Column */}
      <div className="lg:col-span-5 bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl relative overflow-hidden">
        <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase border-l-4 border-primary pl-3 mb-6">
          Tower Ascent Controls
        </h3>

        {/* Difficulty Selector */}
        <div className="mb-5">
          <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
            Selected Hazard Risk
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as TowerDifficulty[]).map((d) => (
              <button
                key={d}
                disabled={active}
                onClick={() => setDifficulty(d)}
                className={`text-xs py-2.5 rounded-lg font-bold border cursor-pointer uppercase tracking-wider transition-all disabled:opacity-50 ${
                  difficulty === d 
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-400' 
                    : 'border-border-color bg-bg-card text-slate-400 hover:text-white'
                }`}
              >
                {d === 'easy' && 'Easy (1)'}
                {d === 'normal' && 'Medium (2)'}
                {d === 'hard' && 'Hard (3)'}
              </button>
            ))}
          </div>
        </div>

        {/* Bet amount formulation */}
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
              placeholder="e.g. 1M, 10M, 100M"
            />
            <Coins className="absolute right-4 top-3.5 h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* Short-cuts column */}
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

        {/* Start Game */}
        {!active ? (
          <button
            onClick={startGame}
            className="w-full bg-primary hover:brightness-110 border-none py-3.5 block text-white font-display font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-all shadow-md shadow-indigo-600/30"
          >
            🏰 Start Ascent
          </button>
        ) : (
          <button
            onClick={cashOut}
            disabled={currentFloor === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 border-none py-3.5 block text-white font-display font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💰 Cash Out (+{calcMultiplierForFloor(currentFloor - 1, difficulty)}x)
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

        {/* Session history log */}
        <div className="mt-6 border-t border-border-color pt-4">
          <h4 className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-2.5">
            Ascent History
          </h4>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {gameHistory.map((h, i) => (
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
            {gameHistory.length === 0 && (
              <div className="text-[11px] text-slate-600 py-3 text-center italic">
                Ready when you are! Use easy difficulty to learn layout.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real Tower Ladder View Grid */}
      <div className="lg:col-span-7 bg-bg-panel border border-border-color rounded-xl p-4 shadow-xl flex flex-col justify-between min-h-[400px]">
        {/* Status panel */}
        <div className="flex justify-between items-center border-b border-border-color pb-3 mb-4 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <div>
            Floor: <span className="text-white font-display font-bold">
              {active ? `${currentFloor + 1}` : '—'}
            </span> / <span className="text-slate-500">8</span>
          </div>
          <div>
            Current Multiplier: <span className="text-cyan-400 font-display font-medium">
              {currentFloor > 0 ? `${calcMultiplierForFloor(currentFloor - 1, difficulty)}x` : '1.00x'}
            </span>
          </div>
        </div>

        {/* Dynamic Interactive Towers representation */}
        <div className="flex flex-col gap-1.5 max-w-lg mx-auto w-full">
          {Array.from({ length: 8 }).map((_, fIndex) => {
            // Display high floors at the top, floor index values from 7 at top down to 0 at bottom
            const floor = TOWER_FLOORS_MAX - 1 - fIndex;
            const isFloorLocked = active ? (floor > currentFloor) : true;
            const isFloorActive = active && (floor === currentFloor);
            const isFloorCleared = active ? (floor < currentFloor) : false;
            
            const cellPicked = revealedFloors[floor];
            const hasExplodedOnThisFloor = explodedFloor?.floor === floor;

            return (
              <div
                key={floor}
                className={`grid gap-2 px-1 relative transition-all duration-300 ${
                  difficulty === 'hard' ? 'grid-cols-4' : 'grid-cols-3'
                } ${
                  isFloorLocked ? 'opacity-20 pointer-events-none' : 'opacity-100'
                }`}
              >
                {/* Visual Cleared Overlay Indicator */}
                {isFloorCleared && (
                  <div className="absolute inset-0 bg-emerald-500/5 border-y border-emerald-500/10 pointer-events-none rounded-lg flex items-center justify-center z-10" />
                )}

                {/* Draw dynamic cells of current row */}
                {Array.from({ length: difficulty === 'hard' ? 4 : 3 }).map((_, cIndex) => {
                  const wasPicked = cellPicked === cIndex;
                  const layoutIsBomb = floorLayouts[floor]?.[cIndex] === 1;
                  
                  // Reveal conditions (if game over, reveal what was in the floor cells)
                  const finalRevealBombs = !active && floorLayouts.length > 0;
                  const isCellShownExploded = hasExplodedOnThisFloor && wasPicked;
                  
                  let innerSymbol = '?';
                  let cellClasses = 'bg-bg-card border-border-color hover:border-slate-500 text-slate-400';

                  if (isCellShownExploded) {
                    innerSymbol = '💥';
                    cellClasses = 'bg-rose-950/40 border-rose-500 text-rose-400';
                  } else if (wasPicked && isFloorCleared) {
                    innerSymbol = '💎';
                    cellClasses = 'bg-emerald-950/40 border-emerald-500 text-emerald-400';
                  } else if (finalRevealBombs) {
                    if (layoutIsBomb) {
                      innerSymbol = '💥';
                      cellClasses = wasPicked 
                        ? 'bg-rose-950 border-rose-500 text-rose-400' 
                        : 'bg-rose-950/25 border-rose-950/40 text-rose-500/55';
                    } else {
                      innerSymbol = '💎';
                      cellClasses = wasPicked 
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-400' 
                        : 'bg-emerald-950/25 border-emerald-950/40 text-emerald-500/55';
                    }
                  }

                  // Customize hovered indicators
                  const dynamicCellHoverEffects = isFloorActive 
                    ? 'hover:bg-primary/10 hover:border-primary cursor-pointer active:scale-95' 
                    : 'cursor-default';

                  return (
                    <motion.div
                      key={cIndex}
                      onClick={() => handleCellSelect(floor, cIndex)}
                      className={`relative aspect-[3.8/1.6] border rounded-lg flex flex-col justify-center items-center select-none transition-all duration-200 ${cellClasses} ${dynamicCellHoverEffects}`}
                      whileHover={isFloorActive ? { y: -2 } : {}}
                    >
                      <span className="text-[9px] font-sans font-semibold tracking-wide opacity-50 block mb-1">
                        {calcMultiplierForFloor(floor, difficulty)}x
                      </span>
                      <span className="font-display font-extrabold text-sm tracking-widest text-white leading-none">
                        {innerSymbol}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
