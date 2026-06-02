import React, { useState, useEffect, useRef } from "react";
import { Coins, Flame, Gem, Trophy, Skull } from "lucide-react";
import { UserData, HistoryCard } from "../types";
import { parseGems } from "../utils";
import { motion, AnimatePresence } from "motion/react";

let audioCtx: AudioContext | null = null;

const playBounceSound = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(650 + Math.random() * 200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
  } catch (e) {
    // browser block safe
  }
};

const playLandedSound = (isHigh: boolean) => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    
    if (isHigh) {
      [523.25, 659.25, 783.99].forEach((freq) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start();
        osc.stop(now + 0.35);
      });
    } else {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start();
      osc.stop(now + 0.15);
    }
  } catch (e) {
    // browser block safe
  }
};

interface PlinkoProps {
  currentUser: { username: string } & UserData;
  balance: number;
  updateUserBalance: (wager: number, payout: number) => Promise<void>;
  addHistory: (game: 'spin' | 'towers' | 'mines' | 'plinko', text: string, isWin: boolean) => void;
  houseEdgeBias?: string;
}

type PlinkoRisk = 'low' | 'medium' | 'high';

interface PlinkoBall {
  id: number;
  wager: number;
  risk: PlinkoRisk;
  path: { x: number; y: number }[];
  currentStep: number;
  progress: number;
  payout: number;
  mult: number;
}

const MULTIPLIERS: Record<PlinkoRisk, number[]> = {
  low: [2.5, 1.2, 0.7, 0.4, 0.2, 0.1, 0.2, 0.4, 0.7, 1.2, 2.5],
  medium: [5.0, 1.8, 0.8, 0.4, 0.2, 0.1, 0.0, 0.1, 0.2, 0.4, 0.8, 1.8, 5.0],
  high: [10.0, 1.4, 0.5, 0.3, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.3, 0.5, 1.4, 10.0],
};

const BUCKET_COLORS: Record<PlinkoRisk, string[]> = {
  low: [
    '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', 
    '#f1f5f9', 
    '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669'
  ],
  medium: [
    '#b91c1c', '#ea580c', '#f97316', '#fb923c', '#fdba74', '#ffedd5',
    '#f1f5f9',
    '#ffedd5', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#b91c1c'
  ],
  high: [
    '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5',
    '#1e293b',
    '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'
  ],
};

export default function Plinko({ currentUser, balance, updateUserBalance, addHistory, houseEdgeBias = "normal" }: PlinkoProps) {
  const [risk, setRisk] = useState<PlinkoRisk>('medium');
  const [betValue, setBetValue] = useState<string>("1M");
  const [activeBalls, setActiveBalls] = useState<PlinkoBall[]>([]);
  const [plinkoHistory, setPlinkoHistory] = useState<HistoryCard[]>([]);
  const [flashingBucket, setFlashingBucket] = useState<{ index: number; risk: PlinkoRisk } | null>(null);
  const [payoutLogs, setPayoutLogs] = useState<{ id: number; mult: number; text: string }[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Dynamic additions
  const [autoMode, setAutoMode] = useState<boolean>(false);
  const [isAutoActive, setIsAutoActive] = useState<boolean>(false);
  const [landCounts, setLandCounts] = useState<number[]>([]);
  const [isTurbo, setIsTurbo] = useState<boolean>(false);

  // Casino Safeguard Telemetry States
  const jackpotCooldownBallsRef = useRef<number>(0);
  const totalShieldBlocksRef = useRef<number>(0);
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [shieldStat, setShieldStat] = useState({
    totalDrops: 0,
    shieldBlocks: 0,
    activeCooldown: 0,
    hitExpectancy: "0.01%",
    vaultStatus: "SECURED"
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeBallsRef = useRef<PlinkoBall[]>([]);
  const pendingWagerRef = useRef<number>(0);
  const sparksRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);

  // Clear validation messages after 4 seconds automatically
  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(() => setValidationError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [validationError]);

  // Dimensions of board are completely dynamic based on risk levels
  const canvasWidth = 480;
  const canvasHeight = 440;
  const numRows = risk === 'low' ? 10 : risk === 'medium' ? 12 : 14;
  const pinSpacing = risk === 'low' ? 32 : risk === 'medium' ? 28 : 24;
  const rowSpacing = risk === 'low' ? 30 : risk === 'medium' ? 26 : 22;
  const startY = risk === 'low' ? 50 : risk === 'medium' ? 40 : 35;

  // Track bucket stats over the user's session
  useEffect(() => {
    setLandCounts(Array(numRows + 1).fill(0));
    setIsAutoActive(false); // Reset auto drop loop when changing risk
  }, [risk, numRows]);

  // Auto Drop loop runner
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    if (isAutoActive) {
      timerId = setInterval(() => {
        dropBall();
      }, isTurbo ? 150 : 450);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isAutoActive, risk, betValue, balance, isTurbo]);

  // Sync state array with mutable ref for requestAnimationFrame speed
  useEffect(() => {
    activeBallsRef.current = activeBalls;
  }, [activeBalls]);

  useEffect(() => {
    // Canvas tick drawing
    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // 1. Draw triangular rows of pins
      const centerX = canvasWidth / 2;
      ctx.fillStyle = "#475569"; // pin color

      for (let r = 0; r < numRows; r++) {
        const pinsInRow = r + 3; // Row 0 has 3 pins, etc.
        const rowY = startY + r * rowSpacing;
        const rowWidth = (pinsInRow - 1) * pinSpacing;
        const startX = centerX - rowWidth / 2;

        for (let p = 0; p < pinsInRow; p++) {
          const pinX = startX + p * pinSpacing;
          
          // Draw standard circular pins
          ctx.beginPath();
          ctx.arc(pinX, rowY, 3, 0, Math.PI * 2);
          ctx.fill();

          // Outer halo to look futuristic
          ctx.fillStyle = "rgba(14, 116, 144, 0.15)";
          ctx.beginPath();
          ctx.arc(pinX, rowY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#475569";
        }
      }

      // 2. Draw multiplier buckets at bottom
      const bucketY = startY + numRows * rowSpacing + 5;
      const bucketSpacing = pinSpacing;
      const bucketWidth = pinSpacing - 5;
      const bucketHeight = 22;
      const totalBuckets = numRows + 1; // dynamic count of buckets
      const bucketsStartX = centerX - ((totalBuckets - 1) * bucketSpacing) / 2;

      for (let b = 0; b < totalBuckets; b++) {
        const bx = bucketsStartX + b * bucketSpacing - bucketWidth / 2;
        const multVal = MULTIPLIERS[risk][b];
        const isFlashing = flashingBucket?.index === b && flashingBucket?.risk === risk;

        // Draw bucket capsule card
        ctx.fillStyle = BUCKET_COLORS[risk][b];
        ctx.strokeStyle = isFlashing ? "#ffffff" : "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = isFlashing ? 2 : 1;

        // Rounded bucket rectangle mockup
        ctx.beginPath();
        ctx.roundRect(bx, bucketY, bucketWidth, bucketHeight, 3);
        ctx.fill();
        ctx.stroke();

        // Multiplier short label
        ctx.fillStyle = multVal >= 2.0 ? "#000000" : "#ffffff";
        ctx.font = "bold 9px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${multVal}x`, bx + bucketWidth / 2, bucketY + bucketHeight / 2 + 3);
      }

      // 2.5. Draw and update spark particles
      ctx.save();
      sparksRef.current = sparksRef.current.filter((spark) => {
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.08; // moderate gravity
        spark.life -= 0.045; // rate of spark fade-out

        if (spark.life <= 0) return false;

        ctx.fillStyle = spark.color;
        ctx.globalAlpha = spark.life;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });
      ctx.restore();

      // 3. Update active ball paths & render
      const stepSpeed = isTurbo ? 0.165 : 0.055; // visual drop speed
      const nextActive: PlinkoBall[] = [];

      activeBallsRef.current.forEach((ball) => {
        ball.progress += stepSpeed;
        if (ball.progress >= 1.0) {
          ball.progress = 0.0;
          ball.currentStep += 1;
          playBounceSound();

          // Spawn delicious, sparkling visual bounce particles off the pins!
          if (ball.currentStep < ball.path.length) {
            const bounceNode = ball.path[ball.currentStep];
            if (bounceNode) {
              const sparkColors = ['#06b6d4', '#22d3ee', '#38bdf8', '#fbbf24', '#ffffff', '#ec4899'];
              for (let i = 0; i < 7; i++) {
                sparksRef.current.push({
                  x: bounceNode.x,
                  y: bounceNode.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 3 - 1.2, // slightly upwards explosion
                  color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
                  life: 1.0
                });
              }
            }
          }
        }

        if (ball.currentStep < ball.path.length - 1) {
          // Ball in transition
          const startNode = ball.path[ball.currentStep];
          const endNode = ball.path[ball.currentStep + 1];

          // Cubic transition curves for bouncing look
          const t = ball.progress;
          const x = startNode.x + (endNode.x - startNode.x) * t;
          
          // Satisfying physical bounce curve!
          const arcLift = Math.sin(t * Math.PI) * 7;
          const y = startNode.y + (endNode.y - startNode.y) * t - arcLift;

          // Draw trailing particle stream
          ctx.fillStyle = "rgba(6, 182, 212, 0.3)";
          ctx.beginPath();
          ctx.arc(x, y - 2, 4.5, 0, Math.PI * 2);
          ctx.fill();

          // Render main ball body
          ctx.fillStyle = "#06b6d4"; // Cyan solid particle
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          nextActive.push(ball);
        } else {
          // Ball completed fall and landed in bucket!
          const finalBucketIndex = Math.round((ball.path[ball.path.length - 1].x - (centerX - (numRows * bucketSpacing) / 2)) / bucketSpacing);
          const validatedBucket = Math.max(0, Math.min(numRows, finalBucketIndex));
          
          resolveBallLanding(ball, validatedBucket);
        }
      });

      if (nextActive.length !== activeBallsRef.current.length) {
        setActiveBalls(nextActive);
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [risk, flashingBucket, isTurbo]);

  const resolveBallLanding = async (ball: PlinkoBall, bucketIdx: number) => {
    // Release atomic wager block
    pendingWagerRef.current = Math.max(0, pendingWagerRef.current - ball.wager);

    // 1. Flash target bucket segment and play landing chime
    setFlashingBucket({ index: bucketIdx, risk: ball.risk });
    playLandedSound(ball.mult >= 1.4);
    setTimeout(() => {
      setFlashingBucket(prev => prev?.index === bucketIdx && prev?.risk === ball.risk ? null : prev);
    }, 450);

    // Incremental histogram tracking
    setLandCounts(prev => {
      const copy = [...prev];
      if (bucketIdx < copy.length) {
        copy[bucketIdx] = (copy[bucketIdx] || 0) + 1;
      }
      return copy;
    });

    // 2. Perform reward deposit
    const payoutAmount = ball.payout;
    await updateUserBalance(0, payoutAmount);

    // 3. Form logs
    const currentMult = ball.mult;
    const isWinOutcome = currentMult >= 1.0;
    const logText = `Plinko (${ball.risk}): Landed on ${currentMult}x ${isWinOutcome ? 'win' : 'return'} (+${payoutAmount.toLocaleString()} 💎)`;

    setPlinkoHistory(prev => [
      { text: logText, isWin: isWinOutcome },
      ...prev
    ].slice(0, 15));

    // Dynamic toast alerts inside panel to satisfy completed ball visual outcomes
    const toastId = Date.now();
    setPayoutLogs(prev => [
      { id: toastId, mult: currentMult, text: `+${payoutAmount.toLocaleString()}` },
      ...prev
    ].slice(0, 3));
    setTimeout(() => {
      setPayoutLogs(prev => prev.filter(l => l.id !== toastId));
    }, 2500);

    // 4. Update core records
    addHistory('plinko', `Plinko (${ball.risk}): Scrawled ${currentMult}x (+${payoutAmount.toLocaleString()})`, isWinOutcome);
  };

  const handleShortcutBet = (percent: number) => {
    const calculated = Math.round(balance * percent);
    setBetValue(calculated.toLocaleString());
  };

  // Launch a new ball Drop!
  const dropBall = async () => {
    const numericBet = parseGems(betValue);
    const minRequired = risk === 'high' ? 3_000_000 : 1_000_000;

    if (numericBet < minRequired) {
      setValidationError(`Minimum bet for ${risk} risk is ${risk === 'high' ? '3M' : '1M'} gems.`);
      return;
    }
    if (numericBet > 5_000_000_000) {
      setValidationError("Maximum bet is 5B gems.");
      return;
    }
    if (balance - pendingWagerRef.current < numericBet) {
      setValidationError("Insufficient balance of gems (including pending drops).");
      return;
    }

    setValidationError(null);
    pendingWagerRef.current += numericBet;

    // Instant wager subtraction from DB
    await updateUserBalance(numericBet, 0);

    const isOverlord = currentUser.rank === 'overlord';
    const activeRisk = risk;

    // Increment stats drops counters
    setShieldStat(prev => ({ ...prev, totalDrops: prev.totalDrops + 1 }));

    // 1. Roll target index via precise mathematical lottery
    const getTargetBucketIndex = (): number => {
      const currentRowsCount = numRows; // lock in the exact rows at launch
      let rolledIndex = -1;

      if (isOverlord) {
        // Overlords get a safe favorable bias but NEVER direct hits on the outermost top jackpots (no direct farming)
        const roll = Math.random();
        if (roll < 0.12) rolledIndex = 1; // lands on 1.8x / 1.4x
        else if (roll < 0.24) rolledIndex = currentRowsCount - 1; // lands on 1.8x / 1.4x
        else if (roll < 0.38) rolledIndex = 2; // lands on 0.8x / 0.5x
        else if (roll < 0.52) rolledIndex = currentRowsCount - 2; // lands on 0.8x / 0.5x
      }

      if (rolledIndex === -1) {
        let idxProbs: number[] = [];

        if (activeRisk === 'low') {
          if (houseEdgeBias === 'ripped') {
            idxProbs = [0.0, 0.0, 0.0005, 0.0245, 0.20, 0.55, 0.20, 0.0245, 0.0005, 0.0, 0.0];
          } else if (houseEdgeBias === 'easy' || houseEdgeBias === 'god') {
            idxProbs = [0.001, 0.04, 0.10, 0.15, 0.18, 0.10, 0.18, 0.15, 0.10, 0.04, 0.001];
          } else {
            // Normal bias (hard center focus)
            idxProbs = [0.0001, 0.0015, 0.010, 0.065, 0.22, 0.40, 0.22, 0.065, 0.010, 0.0015, 0.0001];
          }
        } else if (activeRisk === 'medium') {
          if (houseEdgeBias === 'ripped') {
            idxProbs = [0.0, 0.0, 0.0, 0.0, 0.0001, 0.15, 0.6999, 0.15, 0.0001, 0.0, 0.0, 0.0, 0.0];
          } else if (houseEdgeBias === 'easy' || houseEdgeBias === 'god') {
            // Cut easy mode jackpots 100-fold to prevent easy loop farming
            idxProbs = [0.00005, 0.005, 0.04, 0.09, 0.14, 0.18, 0.21, 0.18, 0.14, 0.09, 0.04, 0.005, 0.00005];
          } else {
            // Normal: extremely low wide multi rates (focused near center 0x/0.1x/0.2x)
            idxProbs = [0.000001, 0.0001, 0.002, 0.02, 0.11, 0.32, 0.52, 0.32, 0.11, 0.02, 0.002, 0.0001, 0.000001];
          }
        } else {
          // High Risk (14 rows -> 15 elements)
          if (houseEdgeBias === 'ripped') {
            idxProbs = [0.0, 0.0, 0.0, 0.0, 0.0, 0.001, 0.15, 0.698, 0.15, 0.001, 0.0, 0.0, 0.0, 0.0, 0.0];
          } else if (houseEdgeBias === 'easy' || houseEdgeBias === 'god') {
            // Limit edge nodes dramatically
            idxProbs = [0.00002, 0.003, 0.015, 0.06, 0.10, 0.14, 0.17, 0.19, 0.17, 0.14, 0.10, 0.06, 0.015, 0.003, 0.00002];
          } else {
            // Normal Center is extremely heavily focused (make 10x max nearly impossible under normal play)
            idxProbs = [0.0000005, 0.00005, 0.0008, 0.008, 0.05, 0.19, 0.44, 0.62, 0.44, 0.19, 0.05, 0.008, 0.0008, 0.00005, 0.0000005];
          }
        }

        const totalW = idxProbs.reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalW;
        for (let i = 0; i < idxProbs.length; i++) {
          roll -= idxProbs[i];
          if (roll <= 0) {
            rolledIndex = i;
            break;
          }
        }
        if (rolledIndex === -1) {
          rolledIndex = Math.floor(currentRowsCount / 2);
        }
      }

      // --- CASINO SECURITY SHIELD GATE & COOLDOWN FILTER ---
      const middleIdx = Math.floor(currentRowsCount / 2);
      const isJackpot = (rolledIndex === 0 || rolledIndex === currentRowsCount);
      const isNearJackpot = (rolledIndex === 1 || rolledIndex === currentRowsCount - 1);

      // Consume 1 cooldown ball count
      if (jackpotCooldownBallsRef.current > 0) {
        jackpotCooldownBallsRef.current = Math.max(0, jackpotCooldownBallsRef.current - 1);
      }

      // Trigger redirect to safe central indices if cooldown active or secondary gate intercepts
      if (jackpotCooldownBallsRef.current > 0) {
        if (isJackpot) {
          totalShieldBlocksRef.current += 1;
          const safeMids = [middleIdx - 1, middleIdx, middleIdx + 1];
          rolledIndex = safeMids[Math.floor(Math.random() * safeMids.length)];
          setShieldActive(true);
        } else if (isNearJackpot && Math.random() > 0.15) {
          totalShieldBlocksRef.current += 1;
          const safeMids = [middleIdx - 2, middleIdx - 1, middleIdx, middleIdx + 1, middleIdx + 2];
          rolledIndex = safeMids[Math.floor(Math.random() * safeMids.length)];
          setShieldActive(true);
        }
      } else {
        // Double check gate: Even without cooldown active, clamp jackpot hits to 0.1% chance, redirect otherwise
        if (isJackpot) {
          if (Math.random() > 0.001) {
            totalShieldBlocksRef.current += 1;
            const safeMids = [middleIdx - 1, middleIdx, middleIdx + 1];
            rolledIndex = safeMids[Math.floor(Math.random() * safeMids.length)];
            setShieldActive(true);
          } else {
            // Jackpot allowed! Engages a 45-ball lock cooldown instantly
            jackpotCooldownBallsRef.current = 45;
            setShieldActive(false);
          }
        } else if (isNearJackpot) {
          // 4% passage chance on 1.8x/1.4x buckets
          if (Math.random() > 0.04) {
            totalShieldBlocksRef.current += 1;
            const safeMids = [middleIdx - 2, middleIdx - 1, middleIdx, middleIdx + 1, middleIdx + 2];
            rolledIndex = safeMids[Math.floor(Math.random() * safeMids.length)];
            setShieldActive(true);
          }
        } else {
          setShieldActive(false);
        }
      }

      // Sync telemetry metrics state
      setShieldStat(prev => ({
        ...prev,
        shieldBlocks: totalShieldBlocksRef.current,
        activeCooldown: jackpotCooldownBallsRef.current,
        hitExpectancy: jackpotCooldownBallsRef.current > 0 ? "0.00%" : "0.01%",
        vaultStatus: jackpotCooldownBallsRef.current > 0 ? "SHIELD ACTIVE" : "SECURED"
      }));

      return rolledIndex;
    };

    const targetBucketIndex = getTargetBucketIndex();

    // 2. Form a random unique path which delivers exactly `targetBucketIndex` right transitions
    const steps = Array(numRows).fill(false);
    let rightsPlaced = 0;
    while (rightsPlaced < targetBucketIndex) {
      const randIdx = Math.floor(Math.random() * numRows);
      if (!steps[randIdx]) {
        steps[randIdx] = true;
        rightsPlaced++;
      }
    }

    // Generate physical path nodes down the rows
    const centerX = canvasWidth / 2;
    const path: { x: number; y: number }[] = [];

    // Starting Drop spot
    path.push({ x: centerX + (Math.random() - 0.5) * 8, y: 15 });

    let currentCol = 0;
    for (let r = 0; r < numRows; r++) {
      const bounceRight = steps[r];

      if (bounceRight) {
        currentCol += 1;
      }

      // Compute physical coordinates of pin center at r, then calculate ball offset
      const rY = startY + r * rowSpacing;
      const rX = centerX + (currentCol - (r + 1) / 2) * pinSpacing;
      path.push({ x: rX, y: rY + 8 });
    }

    // Final bucket target landing spot
    const bSpacing = pinSpacing;
    const bucketY = startY + numRows * rowSpacing + 5;
    const targetBucketX = centerX + (currentCol - numRows / 2) * bSpacing;
    path.push({ x: targetBucketX, y: bucketY - 4 });

    const finalMult = MULTIPLIERS[activeRisk][targetBucketIndex];
    const payout = Math.round(numericBet * finalMult);

    const newBall: PlinkoBall = {
      id: Date.now() + Math.random(),
      wager: numericBet,
      risk: activeRisk,
      path: path,
      currentStep: 0,
      progress: 0.0,
      payout: payout,
      mult: finalMult
    };

    setActiveBalls(prev => [...prev, newBall]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Settings column */}
      <div className="lg:col-span-5 bg-bg-panel border border-border-color rounded-xl p-6 shadow-xl relative overflow-hidden">
        <h3 className="font-display text-sm font-semibold tracking-wider text-white uppercase border-l-4 border-primary pl-3 mb-6">
          Plinko Board Controls
        </h3>

        {/* Risk Selection */}
        <div className="mb-5">
          <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">
            Volatility Risk Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as PlinkoRisk[]).map((r) => (
              <button
                key={r}
                disabled={activeBalls.length > 0 || isAutoActive}
                onClick={() => setRisk(r)}
                className={`text-xs py-2.5 rounded-lg font-bold border uppercase tracking-wider transition-all cursor-pointer ${
                  activeBalls.length > 0 || isAutoActive ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
                } ${
                  risk === r 
                    ? r === 'high' 
                      ? 'border-rose-500 bg-rose-950/40 text-rose-400' 
                      : r === 'medium'
                        ? 'border-amber-500 bg-amber-950/40 text-amber-400'
                        : 'border-emerald-500 bg-emerald-950/40 text-emerald-400'
                    : 'border-border-color bg-bg-card text-slate-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Game Mode Selector */}
        <div className="mb-5">
          <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 flex justify-between">
            <span>Core Game Mode</span>
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={() => {
                setIsAutoActive(false);
                setAutoMode(false);
              }}
              className={`text-xs py-2 rounded-lg font-bold border cursor-pointer uppercase tracking-wider transition-all ${
                !autoMode
                  ? 'border-cyan-500 bg-cyan-950/30 text-cyan-400'
                  : 'border-border-color bg-bg-card text-slate-400 hover:text-white'
              }`}
            >
              Manual Mode
            </button>
            <button
              onClick={() => setAutoMode(true)}
              className={`text-xs py-2 rounded-lg font-bold border cursor-pointer uppercase tracking-wider transition-all ${
                autoMode
                  ? 'border-cyan-500 bg-cyan-950/30 text-cyan-400'
                  : 'border-border-color bg-bg-card text-slate-400 hover:text-white'
              }`}
            >
              Auto Drop
            </button>
          </div>

          <label className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2 flex justify-between select-none">
            <span>Ball Delivery Speed</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsTurbo(false)}
              className={`text-[11px] py-1.5 rounded-lg border cursor-pointer uppercase tracking-wider transition-all ${
                !isTurbo
                  ? 'border-cyan-500 bg-cyan-950/30 text-cyan-400 font-bold'
                  : 'border-border-color bg-bg-card text-slate-500 hover:text-slate-300'
              }`}
            >
              🐢 Normal (0.05x)
            </button>
            <button
              onClick={() => setIsTurbo(true)}
              className={`text-[11px] py-1.5 rounded-lg border cursor-pointer uppercase tracking-wider transition-all ${
                isTurbo
                  ? 'border-amber-500 bg-amber-950/30 text-amber-400 font-bold'
                  : 'border-border-color bg-bg-card text-slate-500 hover:text-slate-300'
              }`}
            >
              ⚡ Turbo (3x Speed)
            </button>
          </div>
        </div>

        {/* Bet size Formulation */}
        <div className="mb-6">
          <label className="block text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 flex justify-between">
            <span>Wager Amount</span>
            <span className="text-[10px] text-slate-500 font-normal">Min: {risk === 'high' ? '3M' : '1M'}</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={betValue}
              onChange={(e) => setBetValue(e.target.value)}
              className="w-full bg-bg-input border border-border-color rounded-lg px-4 py-3 text-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
              placeholder="e.g. 5M, 50M, 1B"
            />
            <Coins className="absolute right-4 top-3.5 h-4 w-4 text-slate-500" />
          </div>
        </div>

        {/* Bets Shortcuts */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[[0.1, "10%"], [0.25, "25%"], [0.5, "50%"], [1.0, "MAX"]].map(([val, label]) => (
            <button
              key={label}
              onClick={() => handleShortcutBet(val as number)}
              className="bg-bg-card hover:bg-primary/20 border border-border-color hover:border-primary/50 text-slate-200 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error notification banner */}
        {validationError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/5 border border-rose-500/20 text-rose-400 text-xs text-center font-semibold select-none">
            ⚠️ {validationError}
          </div>
        )}

        {/* Drop Ball Trigger! */}
        {!autoMode ? (
          <button
            onClick={dropBall}
            className="w-full bg-cyan-600 hover:bg-cyan-500 border-none py-3.5 block text-white font-display font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-all shadow-md shadow-cyan-600/30"
          >
            🟢 Drop Ball
          </button>
        ) : (
          <button
            onClick={() => setIsAutoActive(!isAutoActive)}
            className={`w-full py-3.5 text-white font-display font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-all shadow-md border-none ${
              isAutoActive 
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/35 animate-pulse' 
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/35'
            }`}
          >
            {isAutoActive ? '🛑 Stop Auto Drop' : '⚡ Start Auto Drop'}
          </button>
        )}

        {/* Payout log overlays */}
        <div className="relative pointer-events-none mt-4 h-12 flex items-center justify-center">
          <AnimatePresence>
            {payoutLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 15, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.8 }}
                className={`absolute px-4 py-1.5 border rounded-full text-xs font-bold font-display shadow-lg ${
                  log.mult >= 1.5 
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400' 
                    : log.mult >= 1.0 
                      ? 'bg-amber-950/80 border-amber-500 text-amber-400' 
                      : 'bg-slate-900/80 border-slate-700 text-slate-400'
                }`}
              >
                Payout: {log.text} ({log.mult}x)
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Casino Safeguard Security Telemetry Panel */}
        <div className="my-5 p-4 rounded-xl border bg-slate-950/60 border-slate-800 backdrop-blur-md relative overflow-hidden select-none">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full absolute top-4 right-4 ${shieldStat.activeCooldown > 0 ? "bg-amber-500 animate-ping" : "bg-emerald-500 animate-pulse"}`} />
              <div className={`w-2.5 h-2.5 rounded-full ${shieldStat.activeCooldown > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                Vault Safeguard Status
              </span>
            </div>
            <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
              shieldStat.activeCooldown > 0 
                ? 'bg-amber-950/25 border border-amber-800/40 text-amber-400' 
                : 'bg-emerald-950/25 border border-emerald-800/40 text-emerald-400'
            }`}>
              {shieldStat.vaultStatus}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 font-sans leading-relaxed mb-4">
            Custom casino defense lines are active. The <span className="font-semibold text-white">Jackpot Shield Interceptor</span> automatically redirects stray high/medium payouts to center zones during intensive activity.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-1">
            <div className="bg-[#0b0e14] border border-slate-900 rounded-lg p-2.5">
              <span className="block text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">
                Shield Intercepts
              </span>
              <span className="font-mono text-xs font-bold text-cyan-400">
                {shieldStat.shieldBlocks} blocks
              </span>
            </div>

            <div className="bg-[#0b0e14] border border-slate-900 rounded-lg p-2.5">
              <span className="block text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">
                Active Cooldown
              </span>
              <span className={`font-mono text-xs font-bold ${shieldStat.activeCooldown > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {shieldStat.activeCooldown > 0 ? `${shieldStat.activeCooldown} drops` : 'Inactive'}
              </span>
            </div>

            <div className="bg-[#0b0e14] border border-slate-900 rounded-lg p-2.5">
              <span className="block text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">
                Jackpot expectancy
              </span>
              <span className="font-mono text-xs font-bold text-[#f87171]">
                {shieldStat.hitExpectancy}
              </span>
            </div>

            <div className="bg-[#0b0e14] border border-slate-900 rounded-lg p-2.5">
              <span className="block text-[8px] text-slate-500 uppercase tracking-wider mb-0.5">
                Suppression force
              </span>
              <span className="font-mono text-xs font-bold text-indigo-400">
                99.9% ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* Session history log panel */}
        <div className="border-t border-border-color pt-4">
          <h4 className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-2.5">
            Plinko Drop History
          </h4>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {plinkoHistory.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex justify-between items-center text-[11px] p-2 bg-bg-input border border-border-color rounded-md ${
                    h.isWin ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-rose-500'
                  }`}
                >
                  <span className="text-slate-300 truncate max-w-[85%]">{h.text}</span>
                  <span className={`font-bold ${h.isWin ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {h.isWin ? 'WIN' : 'PLAY'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {plinkoHistory.length === 0 && (
              <div className="text-[11px] text-slate-600 py-3 text-center italic">
                Choose risk level and drop to trigger dynamic payouts!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual canvas grid */}
      <div className="lg:col-span-7 bg-bg-panel border border-border-color rounded-xl p-4 shadow-xl flex flex-col items-center justify-between min-h-[480px] overflow-hidden relative">
        <canvas 
          ref={canvasRef} 
          width={canvasWidth} 
          height={canvasHeight} 
          className="block w-full max-w-full drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] bg-[#040608]/40 border border-[#1e293b]/50 rounded-xl mb-4"
        />

        {/* Real-time Dynamic Session Histogram Counter */}
        <div className="w-full bg-[#0a0f14]/50 border border-border-color/40 p-3 rounded-lg">
          <div className="flex justify-between items-center mb-2 select-none">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Session Landing Stats
            </span>
            <button 
              onClick={() => setLandCounts(Array(numRows + 1).fill(0))}
              className="text-[9px] text-[#06b6d4] hover:text-cyan-400 font-bold bg-[#06b6d4]/10 hover:bg-[#06b6d4]/20 border-none px-2 py-0.5 rounded transition-all cursor-pointer"
            >
              Reset Statistics
            </button>
          </div>
          <div className="grid grid-flow-col auto-cols-fr gap-1 align-bottom h-9 items-end">
            {landCounts.map((count, idx) => {
              const maxCount = Math.max(...landCounts, 1);
              const heightPercent = Math.min(100, Math.round((count / maxCount) * 100));
              const mColor = BUCKET_COLORS[risk][idx] || '#10b981';
              return (
                <div key={idx} className="flex flex-col items-center group relative cursor-help">
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 border border-slate-700 font-mono text-[9px] text-white px-1.5 py-0.5 rounded shadow z-50 whitespace-nowrap">
                    Bucket {idx + 1} ({MULTIPLIERS[risk][idx]}x): {count} drops
                  </div>
                  <div 
                    className="w-full rounded-t-sm transition-all duration-300 min-h-[2px]"
                    style={{ 
                      height: `${Math.max(4, heightPercent * 0.25)}px`, 
                      backgroundColor: mColor,
                      opacity: count > 0 ? 1 : 0.25
                    }}
                  />
                  <span className="text-[8px] font-mono font-medium text-slate-500 mt-1 select-none">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
