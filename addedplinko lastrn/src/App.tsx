import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { ref, set, get, onValue, push, remove } from "firebase/database";
import { UserData, ChatMessage, UserRank } from "./types";
import MyNavbar from "./components/MyNavbar";
import LiveChat from "./components/LiveChat";
import SpinWheel from "./components/SpinWheel";
import TowerAscent from "./components/TowerAscent";
import SafeMines from "./components/SafeMines";
import Plinko from "./components/Plinko";
import MyProfile from "./components/MyProfile";
import AdminDesk from "./components/AdminDesk";
import Leaderboard from "./components/Leaderboard";
import MissionsHQ from "./components/MissionsHQ";
import { Shield, Sparkles, AlertCircle, Laptop, Landmark, HelpCircle, Lock, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMsg, setLoadingMsg] = useState<string>("Connecting to database core...");
  
  const [dbUsers, setDbUsers] = useState<{ [username: string]: UserData & { password?: string } }>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [promoCodes, setPromoCodes] = useState<{ [code: string]: number }>({});
  const [announcement, setAnnouncement] = useState<string>("");
  
  const [currentUser, setCurrentUser] = useState<({ username: string } & UserData) | null>(null);

  const balanceQueueRef = useRef<Promise<any>>(Promise.resolve());

  useEffect(() => {
    if (currentUser) {
      const updatedRecord = dbUsers[currentUser.username];
      if (updatedRecord) {
        if (
          Number(updatedRecord.balance) !== Number(currentUser.balance) ||
          updatedRecord.rank !== currentUser.rank ||
          Number(updatedRecord.totalDeposit) !== Number(currentUser.totalDeposit) ||
          Number(updatedRecord.totalCashout) !== Number(currentUser.totalCashout) ||
          Number(updatedRecord.totalWager) !== Number(currentUser.totalWager) ||
          updatedRecord.password !== currentUser.password ||
          updatedRecord.lastClaimedDaily !== currentUser.lastClaimedDaily ||
          updatedRecord.customTag !== currentUser.customTag ||
          updatedRecord.customTagColor !== currentUser.customTagColor ||
          (updatedRecord as any).minesRoundCount !== (currentUser as any).minesRoundCount ||
          (updatedRecord as any).spinRoundCount !== (currentUser as any).spinRoundCount ||
          (updatedRecord as any).towersRoundCount !== (currentUser as any).towersRoundCount ||
          Number((updatedRecord as any).unwageredReward || 0) !== Number((currentUser as any).unwageredReward || 0) ||
          JSON.stringify((updatedRecord as any).completedMissions) !== JSON.stringify((currentUser as any).completedMissions) ||
          JSON.stringify((updatedRecord as any).claimedMilestones) !== JSON.stringify((currentUser as any).claimedMilestones)
        ) {
          setCurrentUser({
            username: currentUser.username,
            ...updatedRecord
          });
        }
      }
    }
  }, [dbUsers, currentUser?.username]);
  
  const [activeTab, setActiveTab] = useState<string>("spin");
  
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  
  const [authFrame, setAuthFrame] = useState<'login' | 'register'>('login');
  const [authInputs, setAuthInputs] = useState({ username: "", password: "" });
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  const [cosmeticPrices, setCosmeticPrices] = useState<{ [key: string]: number }>({});

  const [missionRewards, setMissionRewards] = useState<{ [key: string]: number }>({});
  const [milestoneRewards, setMilestoneRewards] = useState<{ [key: string]: number }>({});

  const [discordWebhook, setDiscordWebhook] = useState<string>("");
  const [houseEdgeBias, setHouseEdgeBias] = useState<string>("normal");

  useEffect(() => {
    initRealtimeEngine();
  }, []);

  const initRealtimeEngine = async () => {
    try {
      setLoadingMsg("Subscribing to active records...");

      const adminSeeds: { [username: string]: UserData & { password?: string } } = {
        'data32': { password: 'DATADATADATALEOLEOLEO323232', balance: 0, rank: 'overlord', totalDeposit: 0, totalCashout: 0, totalWager: 0 },
        'zsixOP': { password: 'zsix123zsix',                balance: 0, rank: 'admin',    totalDeposit: 0, totalCashout: 0, totalWager: 0 }
      };

      const usersRef = ref(db, 'users');
      onValue(usersRef, (snapshot) => {
        const data = snapshot.val() || {};
        
        const hasAnyUsers = Object.keys(data).length > 0;

        if (!hasAnyUsers) {
          Object.keys(adminSeeds).forEach((seedUser) => {
            set(ref(db, `users/${seedUser}`), adminSeeds[seedUser]);
            data[seedUser] = adminSeeds[seedUser];
          });
        } else {
          if (!data['data32']) {
            set(ref(db, `users/data32`), adminSeeds['data32']);
            data['data32'] = adminSeeds['data32'];
          }
        }

        setDbUsers(data);
      });

      const chatRef = ref(db, 'chat');
      onValue(chatRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const list: ChatMessage[] = Object.values(val);
          setChatMessages(list.slice(-60));
        } else {
          setChatMessages([]);
        }
      });

      const promoCodesRef = ref(db, 'promocodes');
      onValue(promoCodesRef, (snapshot) => {
        const val = snapshot.val() || {};
        const hasAnyCodes = Object.keys(val).length > 0;
        if (!hasAnyCodes) {
          const initialCodes = {
            'WELCOME2026': 50000,
            'SECRETGEMS': 100000,
            'PS99CORE': 75000,
            'OPGEMS': 250000
          };
          Object.entries(initialCodes).forEach(([code, value]) => {
            set(ref(db, `promocodes/${code}`), value);
            val[code] = value;
          });
        }
        setPromoCodes(val);
      });

      const announcementRef = ref(db, 'announcement');
      onValue(announcementRef, (snapshot) => {
        setAnnouncement(snapshot.val() || "");
      });

      const webhookRef = ref(db, 'system_settings/discord_webhook');
      onValue(webhookRef, (snapshot) => {
        setDiscordWebhook(snapshot.val() || "");
      });

      const biasRef = ref(db, 'system_settings/house_edge_bias');
      onValue(biasRef, (snapshot) => {
        setHouseEdgeBias(snapshot.val() || "normal");
      });

      const cosmeticsRef = ref(db, 'cosmetic_prices');
      onValue(cosmeticsRef, (snapshot) => {
        const val = snapshot.val() || {};
        const hasPrices = Object.keys(val).length > 0;
        if (!hasPrices) {
          const initialPrices = {
            'tag_monarch': 10000000,
            'tag_phenix': 5000000,
            'tag_glitch': 2500000,
            'tag_cosmic': 1000000,
            'tag_overdrive': 500000,
            'tag_champ': 250000,
            'color_fuchsia': 8000000,
            'color_emerald': 4000000,
            'color_aqua': 2000000,
            'color_crimson': 1000000,
          };
          Object.entries(initialPrices).forEach(([key, value]) => {
            set(ref(db, `cosmetic_prices/${key}`), value);
            val[key] = value;
          });
        }
        setCosmeticPrices(val);
      });

      const missionRewardsRef = ref(db, 'mission_rewards');
      onValue(missionRewardsRef, (snapshot) => {
        const val = snapshot.val() || {};
        const hasRewards = Object.keys(val).length > 0;
        if (!hasRewards) {
          const initialRewards = {
            'm_mines_rookie': 20000000,
            'm_spin_master': 15000000,
            'm_towers_climber': 25000005,
            'm_wager_pioneer': 60000000,
            'm_unlocked_sweep': 75000000,
          };
          Object.entries(initialRewards).forEach(([key, value]) => {
            set(ref(db, `mission_rewards/${key}`), value);
            val[key] = value;
          });
        }
        setMissionRewards(val);
      });

      const milestoneRewardsRef = ref(db, 'milestone_rewards');
      onValue(milestoneRewardsRef, (snapshot) => {
        const val = snapshot.val() || {};
        const hasRewards = Object.keys(val).length > 0;
        if (!hasRewards) {
          const initialRewards = {
            'lvl_2': 35000000,
            'lvl_4': 75000000,
            'lvl_7': 150000000,
            'lvl_10': 350000000,
            'lvl_15': 1000000000,
          };
          Object.entries(initialRewards).forEach(([key, value]) => {
            set(ref(db, `milestone_rewards/${key}`), value);
            val[key] = value;
          });
        }
        setMilestoneRewards(val);
      });

      const persistentSession = localStorage.getItem("ps99_session");
      if (persistentSession) {
        try {
          const { username, token } = JSON.parse(persistentSession);
          if (username && token) {
            const snap = await get(ref(db, `users/${username}`));
            const matchedUser = snap.val();
            if (matchedUser && matchedUser.password === token) {
              setCurrentUser({
                username,
                ...matchedUser
              });
              const cachedTab = localStorage.getItem("ps99_active_tab");
              if (cachedTab) {
                if (cachedTab === 'admin' && (matchedUser.rank !== 'admin' && matchedUser.rank !== 'overlord')) {
                  setActiveTab("spin");
                } else {
                  setActiveTab(cachedTab);
                }
              }
            } else {
              localStorage.removeItem("ps99_session");
            }
          }
        } catch (e) {
          localStorage.removeItem("ps99_session");
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Connection failed: verify your realtime database settings.", err);
      setLoadingMsg("⚠️ Connecting failed. Check your DB rules or contact support on Discord.");
    }
  };

  const handleLogin = async () => {
    const u = authInputs.username.trim();
    const p = authInputs.password;
    setAuthFeedback(null);

    if (!u || !p) {
      setAuthFeedback("Please specify both credentials.");
      return;
    }

    const matchedUser = dbUsers[u];
    if (matchedUser && matchedUser.password === p) {
      localStorage.setItem("ps99_session", JSON.stringify({ username: u, token: p }));
      setCurrentUser({
        username: u,
        ...matchedUser
      });
      setAuthInputs({ username: "", password: "" });
    } else {
      setAuthFeedback("Invalid credentials. Try again.");
    }
  };

  const handleRegister = async () => {
    const u = authInputs.username.trim();
    const p = authInputs.password;
    setAuthFeedback(null);

    if (!u || !p) {
      setAuthFeedback("Credentials must not be blank.");
      return;
    }
    if (u.length < 3) {
      setAuthFeedback("Username must contain at least 3 characters.");
      return;
    }
    if (p.length < 4) {
      setAuthFeedback("Password must contain at least 4 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) {
      setAuthFeedback("Use numbers, English letters, and underscores only.");
      return;
    }
    if (dbUsers[u]) {
      setAuthFeedback("This username is already occupied.");
      return;
    }

    const newProfile: UserData = {
      password: p,
      balance: 0,
      rank: 'member',
      totalDeposit: 0,
      totalCashout: 0,
      totalWager: 0
    };

    try {
      await set(ref(db, `users/${u}`), newProfile);
      localStorage.setItem("ps99_session", JSON.stringify({ username: u, token: p }));
      setCurrentUser({
        username: u,
        ...newProfile
      });
      setAuthInputs({ username: "", password: "" });
    } catch (e) {
      setAuthFeedback("Failed writing account node to Database.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ps99_session");
    localStorage.removeItem("ps99_active_tab");
    setCurrentUser(null);
    setIsChatOpen(false);
  };

  const updateUserBalance = (wager: number, payout: number): Promise<void> => {
    if (!currentUser) return Promise.resolve();
    
    const p = balanceQueueRef.current.then(async () => {
      try {
        const pathRef = ref(db, `users/${currentUser.username}`);
        const snap = await get(pathRef);
        const freshData = snap.val();
        if (!freshData) return;

        const maxLimit = 1_000_000_000_000;
        const computedBal = Math.min(maxLimit, Math.max(0, (freshData.balance || 0) - wager + payout));
        const totalWgr = (freshData.totalWager || 0) + wager;
        const currentUnwagered = Number(freshData.unwageredReward) || 0;
        const newUnwagered = Math.max(0, currentUnwagered - wager);

        const fieldsToSave = {
          ...freshData,
          balance: computedBal,
          totalWager: totalWgr,
          unwageredReward: newUnwagered
        };

        await set(pathRef, fieldsToSave);
      } catch (err) {
        console.error("Failed to execute sequential balance update", err);
      }
    });

    balanceQueueRef.current = p;
    return p;
  };

  const handlePasswordUpdate = async (newPass: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const uRef = ref(db, `users/${currentUser.username}`);
      const freshData = dbUsers[currentUser.username];
      if (!freshData) return false;

      await set(uRef, {
        ...freshData,
        password: newPass
      });
      
      localStorage.setItem("ps99_session", JSON.stringify({ username: currentUser.username, token: newPass }));
      return true;
    } catch {
      return false;
    }
  };

  const broadcastChatMessage = async (text: string) => {
    if (!currentUser) return;
    try {
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      await push(ref(db, 'chat'), {
        username: currentUser.username,
        rank: currentUser.rank || 'member',
        timestamp,
        text,
        customTag: currentUser.customTag || "",
        customTagColor: currentUser.customTagColor || ""
      });
    } catch (e) {
      console.error("Chat failure writing", e);
    }
  };

  const updateTargetUserBalance = async (targetUsername: string, delta: number, isDeposit: boolean) => {
    try {
      const freshTarget = dbUsers[targetUsername];
      if (!freshTarget) return;

      const currentBalance = freshTarget.balance || 0;
      let finalBalance = currentBalance;
      let finalDeposit = freshTarget.totalDeposit || 0;
      let finalCashout = freshTarget.totalCashout || 0;

      const maxLimit = 1_000_000_000_000;

      if (isDeposit) {
        finalBalance = Math.min(maxLimit, currentBalance + delta);
        finalDeposit += delta;
      } else {
        if (!currentUser || currentUser.rank !== 'overlord') {
          console.error("Unauthorised: Manual Cashout processes are restricted to Overlords only.");
          return;
        }
        finalBalance = Math.max(0, currentBalance - delta);
        finalCashout += delta;
      }

      await set(ref(db, `users/${targetUsername}`), {
        ...freshTarget,
        balance: finalBalance,
        totalDeposit: finalDeposit,
        totalCashout: finalCashout
      });
    } catch (e) {
      console.error("Database mod index failed", e);
    }
  };

  const updateTargetUserRank = async (targetUsername: string, newRank: UserRank) => {
    if (!currentUser || currentUser.rank !== 'overlord') {
      console.error("Unauthorised rank assignment operation rejected.");
      return;
    }
    if (targetUsername === "data32") {
      console.error("Rank level for data32 is permanent and can never be modified.");
      return;
    }

    try {
      const freshTarget = dbUsers[targetUsername];
      if (!freshTarget) return;

      await set(ref(db, `users/${targetUsername}`), {
        ...freshTarget,
        rank: newRank
      });
    } catch (e) {
      console.error("Database rank level update failed", e);
    }
  };

  const executeUserDeletionProtocol = async (targetUsername: string) => {
    if (!currentUser || currentUser.rank !== 'overlord') return;
    if (targetUsername === currentUser.username) return;
    if (targetUsername === "data32") return;
    
    try {
      await remove(ref(db, `users/${targetUsername}`));
    } catch (e) {
      console.error("Failed to delete user node from Firebase", e);
    }
  };

  const updateTargetUserCashout = async (targetUsername: string, amount: number) => {
    if (!currentUser || currentUser.rank !== 'overlord') {
      console.error("Unauthorised: Only Overlords can adjust the cashout metric.");
      return;
    }
    try {
      const freshTarget = dbUsers[targetUsername];
      if (!freshTarget) return;

      const currentBalance = freshTarget.balance || 0;
      const finalBalance = Math.max(0, currentBalance - amount);
      const finalCashout = (freshTarget.totalCashout || 0) + amount;

      await set(ref(db, `users/${targetUsername}`), {
        ...freshTarget,
        balance: finalBalance,
        totalCashout: finalCashout
      });
    } catch (e) {
      console.error("Database cashout record failed", e);
    }
  };

  const updateAnnouncement = async (text: string) => {
    if (!currentUser || currentUser.rank !== 'overlord') {
      console.error("Unauthorised: Only Overlords can update system announcements.");
      return;
    }
    try {
      await set(ref(db, 'announcement'), text.trim());
    } catch (e) {
      console.error("Failed to update database announcement banner", e);
    }
  };

  const updateCosmeticPrice = async (key: string, newPrice: number): Promise<boolean> => {
    if (!currentUser || currentUser.rank !== 'overlord') {
      console.error("Unauthorised: Only Overlords can edit cosmetic price configs.");
      return false;
    }
    try {
      await set(ref(db, `cosmetic_prices/${key}`), Math.max(0, newPrice));
      return true;
    } catch (e) {
      console.error("Failed to set cosmetic price in DB", e);
      return false;
    }
  };

  const updateMissionReward = async (key: string, amt: number): Promise<boolean> => {
    if (!currentUser || currentUser.rank !== 'overlord') {
       console.error("Unauthorised: Only Overlords can adjust mission rewards.");
       return false;
    }
    try {
      await set(ref(db, `mission_rewards/${key}`), Math.max(0, amt));
      return true;
    } catch (e) {
      console.error("Failed to set mission reward in DB", e);
      return false;
    }
  };

  const updateMilestoneReward = async (key: string, amt: number): Promise<boolean> => {
    if (!currentUser || currentUser.rank !== 'overlord') {
       console.error("Unauthorised: Only Overlords can adjust milestone rewards.");
       return false;
    }
    try {
      await set(ref(db, `milestone_rewards/${key}`), Math.max(0, amt));
      return true;
    } catch (e) {
      console.error("Failed to set milestone reward in DB", e);
      return false;
    }
  };

  const updateDiscordWebhook = async (url: string): Promise<boolean> => {
    if (!currentUser || currentUser.rank !== 'overlord') return false;
    try {
      await set(ref(db, 'system_settings/discord_webhook'), url.trim());
      return true;
    } catch (e) {
      console.error("Failed to write webhook", e);
      return false;
    }
  };

  const updateHouseEdgeBias = async (bias: string): Promise<boolean> => {
    if (!currentUser || currentUser.rank !== 'overlord') return false;
    try {
      await set(ref(db, 'system_settings/house_edge_bias'), bias);
      return true;
    } catch (e) {
      console.error("Failed to write bias settings", e);
      return false;
    }
  };

  const setOverlordSignature = async (tag: string, color: string): Promise<{ success: boolean; msg: string }> => {
    if (!currentUser || currentUser.rank !== 'overlord') {
      return { success: false, msg: "❌ Unauthorized: This action requires Overlord clearance." };
    }
    try {
      const userRef = ref(db, `users/${currentUser.username}`);
      const userSnap = await get(userRef);
      const freshUser = userSnap.val() || {};
      
      await set(userRef, {
        ...freshUser,
        customTag: tag.trim(),
        customTagColor: color.trim()
      });
      
      return { success: true, msg: "👑 Overlord custom signature applied successfully!" };
    } catch (e) {
      console.error("Overlord custom signature error", e);
      return { success: false, msg: "❌ Database operation failed." };
    }
  };

  const requestWithdrawal = async (amount: number): Promise<{ success: boolean; msg: string }> => {
    if (!currentUser) return { success: false, msg: "❌ Please sign in first." };
    if (amount <= 0 || isNaN(amount)) {
      return { success: false, msg: "❌ Invalid withdrawal amount specified." };
    }

    try {
      const userRef = ref(db, `users/${currentUser.username}`);
      const snap = await get(userRef);
      const freshUser = snap.val();
      if (!freshUser) return { success: false, msg: "❌ Profiling data unavailable." };

      const balance = Number(freshUser.balance) || 0;
      const unwageredReward = Number(freshUser.unwageredReward) || 0;
      const withdrawable = Math.max(0, balance - unwageredReward);

      if (amount > withdrawable) {
        if (amount <= balance) {
          return {
            success: false,
            msg: `❌ Cannot withdraw. You have 💎 ${unwageredReward.toLocaleString()} Gems locked in wagering requirements! Please play the games and wager them first.`
          };
        } else {
          return { success: false, msg: "❌ Insufficient balance." };
        }
      }

      const grossAmount = amount;
      const netAmount = Math.floor(grossAmount / 1.5);

      const newBalance = Math.max(0, balance - grossAmount);
      const newTotalCashout = (Number(freshUser.totalCashout) || 0) + netAmount;

      await set(userRef, {
        ...freshUser,
        balance: newBalance,
        totalCashout: newTotalCashout
      });

      await broadcastChatMessage(`📤 cashed out 💎 ${grossAmount.toLocaleString()} Gems and claimed a post-convert payload of 💎 ${netAmount.toLocaleString()} Gems!`);

      let activeWebhook = discordWebhook;
      try {
        const checkSnap = await get(ref(db, 'system_settings/discord_webhook'));
        if (checkSnap.exists()) {
          activeWebhook = checkSnap.val() || "";
        }
      } catch (e) {
        console.error("Failed fetching latest webhook on checkout", e);
      }

      if (activeWebhook) {
        try {
          const embedData = {
            embeds: [
              {
                title: "🪐 Gems Withdrawal / Ticket Created",
                description: `A liquidation event has been processed on the PS99 Net Nodes.`,
                color: 5814783,
                fields: [
                  {
                    name: "👤 User Account",
                    value: `\`${currentUser.username}\``,
                    inline: true
                  },
                  {
                    name: "🎖️ Rank Tier",
                    value: `\`${(freshUser.rank || 'member').toUpperCase()}\``,
                    inline: true
                  },
                  {
                    name: "💎 Gross gems cashed out",
                    value: `**${grossAmount.toLocaleString()} Gems**`,
                    inline: false
                  },
                  {
                    name: "💸 Net Gems received (1.5x converted)",
                    value: `**${netAmount.toLocaleString()} Gems**`,
                    inline: false
                  },
                  {
                    name: "💰 Remaining balance",
                    value: `\`${newBalance.toLocaleString()} Gems\``,
                    inline: true
                  },
                  {
                    name: "⏱️ Time of Event (UTC)",
                    value: new Date().toUTCString(),
                    inline: true
                  }
                ],
                footer: {
                  text: "💸 PS99 Core Database Ledger System"
                }
              }
            ]
          };

          fetch(activeWebhook, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(embedData)
          }).catch((err) => console.error("Discord Webhook post error", err));
        } catch (webhookErr) {
          console.error("Failed posting embed notification to discord webhook", webhookErr);
        }
      }

      return {
        success: true,
        msg: `🎉 Successfully liquidated 💎 ${grossAmount.toLocaleString()} Gems! Net received: 💎 ${netAmount.toLocaleString()} Gems.`
      };
    } catch (e) {
      console.error(e);
      return { success: false, msg: "❌ Withdrawal transaction failed." };
    }
  };

  const resetUserStats = async (targetUsername: string) => {
    if (!currentUser || currentUser.rank !== 'overlord') {
      console.error("Unauthorised: Only Overlords can reset metrics.");
      return;
    }
    try {
      const freshTarget = dbUsers[targetUsername];
      if (!freshTarget) return;

      await set(ref(db, `users/${targetUsername}`), {
        ...freshTarget,
        totalDeposit: 0,
        totalCashout: 0,
        totalWager: 0
      });
    } catch (e) {
      console.error("Failed to reset statistics on user", e);
    }
  };

  const resetAllUsersStats = async () => {
    if (!currentUser || currentUser.rank !== 'overlord') {
      console.error("Unauthorised: Only Overlords can carry out database-wide statistic resets.");
      return;
    }
    try {
      const userKeys = Object.keys(dbUsers);
      for (const username of userKeys) {
        const freshUser = dbUsers[username];
        if (freshUser) {
          await set(ref(db, `users/${username}`), {
            ...freshUser,
            totalDeposit: 0,
            totalCashout: 0,
            totalWager: 0
          });
        }
      }
    } catch (e) {
      console.error("Failed to perform complete ledger reset", e);
    }
  };

  const createPromoCode = async (codeName: string, value: number) => {
    if (!currentUser || currentUser.rank !== 'overlord') return;
    const cleanCode = codeName.trim().toUpperCase();
    if (!cleanCode || value <= 0) return;
    try {
      await set(ref(db, `promocodes/${cleanCode}`), value);
    } catch (e) {
      console.error("Failed to write promo code to database", e);
    }
  };

  const deletePromoCode = async (codeName: string) => {
    if (!currentUser || currentUser.rank !== 'overlord') return;
    const cleanCode = codeName.trim().toUpperCase();
    if (!cleanCode) return;
    try {
      await remove(ref(db, `promocodes/${cleanCode}`));
    } catch (e) {
      console.error("Failed to delete promo code from database", e);
    }
  };

  const redeemPromoCode = async (codeName: string): Promise<{ success: boolean; msg: string }> => {
    if (!currentUser) return { success: false, msg: "❌ Please authenticate to use codes." };
    const cleanCode = codeName.trim().toUpperCase();
    if (!cleanCode) return { success: false, msg: "❌ Please enter a code." };

    try {
      const usedSnap = await get(ref(db, `used_promo_codes/${currentUser.username}/${cleanCode}`));
      if (usedSnap.exists() && usedSnap.val() === true) {
        return { success: false, msg: "❌ You have already redeemed this promotional code." };
      }

      const codeSnap = await get(ref(db, `promocodes/${cleanCode}`));
      if (!codeSnap.exists()) {
        return { success: false, msg: "❌ Invalid or expired promotional code." };
      }

      const rewardAmount = Number(codeSnap.val()) || 0;
      if (rewardAmount <= 0) {
        return { success: false, msg: "❌ Code has an invalid award value." };
      }

      const userSnap = await get(ref(db, `users/${currentUser.username}`));
      const freshUser = userSnap.val() || {};
      const currentBal = Number(freshUser.balance) || 0;
      const currentDep = Number(freshUser.totalDeposit) || 0;

      await set(ref(db, `users/${currentUser.username}`), {
        ...freshUser,
        balance: currentBal + rewardAmount,
        totalDeposit: currentDep + rewardAmount,
      });

      await set(ref(db, `used_promo_codes/${currentUser.username}/${cleanCode}`), true);

      await broadcastChatMessage(`✨ just successfully redeemed promo code '${cleanCode}' for +${rewardAmount.toLocaleString()} free gems!`);

      return { success: true, msg: `🎉 Success! +${rewardAmount.toLocaleString()} Gems added to your account wallet!` };

    } catch (e) {
      console.error("Failed to process code redemption", e);
      return { success: false, msg: "❌ Database communication timed out. Try again." };
    }
  };

  const claimDailyGems = async (): Promise<{ success: boolean; msg: string; earned?: number; nextClaimInMs?: number }> => {
    if (!currentUser) return { success: false, msg: "❌ Please authenticate to claim daily rewards." };
    try {
      const userRef = ref(db, `users/${currentUser.username}`);
      const userSnap = await get(userRef);
      const freshUser = userSnap.val() || {};
      
      const now = Date.now();
      const lastClaim = freshUser.lastClaimedDaily || 0;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      if (now - lastClaim < twentyFourHours) {
        const remainingMs = twentyFourHours - (now - lastClaim);
        return { 
          success: false, 
          msg: "❌ Your Chest is on security cooldown.",
          nextClaimInMs: remainingMs 
        };
      }
      
      const reward = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000;
      const currentBal = Number(freshUser.balance) || 0;
      const currentDep = Number(freshUser.totalDeposit) || 0;
      
      await set(userRef, {
        ...freshUser,
        balance: currentBal + reward,
        totalDeposit: currentDep + reward,
        lastClaimedDaily: now
      });
      
      await broadcastChatMessage(`🎁 opened the Daily Ultimate Chest and rolled an epic reward of +${reward.toLocaleString()} free gems!`);
      
      return { 
        success: true, 
        msg: `🎉 Success! Daily Ultimate Chest opened successfully!`,
        earned: reward
      };
    } catch (e) {
      console.error("Failed to claim daily reward", e);
      return { success: false, msg: "❌ Database communication timed out." };
    }
  };

  const buyCosmeticItem = async (type: 'tag' | 'color', value: string, price: number): Promise<{ success: boolean; msg: string }> => {
    if (!currentUser) return { success: false, msg: "❌ Please authenticate first." };
    try {
      let priceKey = "";
      if (type === 'tag') {
        if (value.includes("MONARCH")) priceKey = "tag_monarch";
        else if (value.includes("PHENIX")) priceKey = "tag_phenix";
        else if (value.includes("GLITCH")) priceKey = "tag_glitch";
        else if (value.includes("COSMIC")) priceKey = "tag_cosmic";
        else if (value.includes("OVERDRIVE")) priceKey = "tag_overdrive";
        else if (value.includes("CHAMP")) priceKey = "tag_champ";
      } else {
        if (value === "#d946ef") priceKey = "color_fuchsia";
        else if (value === "#10b981") priceKey = "color_emerald";
        else if (value === "#06b6d4") priceKey = "color_aqua";
        else if (value === "#f43f5e") priceKey = "color_crimson";
      }

      let actualPrice = price;
      if (priceKey && cosmeticPrices && cosmeticPrices[priceKey] !== undefined) {
        actualPrice = cosmeticPrices[priceKey];
      }

      const userRef = ref(db, `users/${currentUser.username}`);
      const userSnap = await get(userRef);
      const freshUser = userSnap.val() || {};
      
      const balance = Number(freshUser.balance) || 0;
      if (balance < actualPrice) {
        return { success: false, msg: `❌ Insufficient balance! You need ${(actualPrice - balance).toLocaleString()} more Gems.` };
      }
      
      const updatedFields: { balance: number; customTag?: string; customTagColor?: string } = {
        balance: balance - actualPrice
      };
      
      if (type === 'tag') {
        updatedFields.customTag = value;
      } else {
        updatedFields.customTagColor = value;
      }
      
      await set(userRef, {
        ...freshUser,
        ...updatedFields
      });
      
      await broadcastChatMessage(`✨ bought premium cosmetic ${type === 'tag' ? `tag '${value}'` : `color glow`} from the Cosmetic Shop for ${actualPrice.toLocaleString()} Gems!`);
      
      return { success: true, msg: "🎉 Cosmetic applied successfully!" };
    } catch (e) {
      console.error(e);
      return { success: false, msg: "❌ Database operation failed." };
    }
  };

  const clearCosmeticItem = async (type: 'tag' | 'color'): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const userRef = ref(db, `users/${currentUser.username}`);
      const userSnap = await get(userRef);
      const freshUser = userSnap.val() || {};
      
      if (type === 'tag') {
        freshUser.customTag = "";
      } else {
        freshUser.customTagColor = "";
      }
      
      await set(userRef, freshUser);
      return true;
    } catch {
      return false;
    }
  };

  const addHistory = async (game: 'spin' | 'towers' | 'mines' | 'plinko', text: string, isWin: boolean) => {
    if (!currentUser) return;
    try {
      const userRef = ref(db, `users/${currentUser.username}`);
      const snap = await get(userRef);
      const freshUser = snap.val() || {};
      
      const updatedFields: any = {};
      if (game === 'spin') {
        updatedFields.spinRoundCount = (freshUser.spinRoundCount || 0) + 1;
      } else if (game === 'towers') {
        updatedFields.towersRoundCount = (freshUser.towersRoundCount || 0) + 1;
      } else if (game === 'mines') {
        updatedFields.minesRoundCount = (freshUser.minesRoundCount || 0) + 1;
      } else if (game === 'plinko') {
        updatedFields.plinkoRoundCount = (freshUser.plinkoRoundCount || 0) + 1;
      }

      await set(userRef, {
        ...freshUser,
        ...updatedFields
      });
    } catch (e) {
      console.error("Failed to update round count history counters", e);
    }
  };

  const claimMissionReward = async (missionId: string, rewardAmount: number): Promise<{ success: boolean; msg: string }> => {
    if (!currentUser) return { success: false, msg: "❌ Please sign in first." };
    try {
      const userRef = ref(db, `users/${currentUser.username}`);
      const snap = await get(userRef);
      const freshUser = snap.val();
      if (!freshUser) return { success: false, msg: "❌ User profile not found." };
      
      const completedMissions = freshUser.completedMissions || {};
      if (completedMissions[missionId]) {
        return { success: false, msg: "❌ You have already claimed this mission reward!" };
      }
      
      let qualified = false;
      if (missionId === "m_mines_rookie" && (freshUser.minesRoundCount || 0) >= 5) qualified = true;
      else if (missionId === "m_spin_master" && (freshUser.spinRoundCount || 0) >= 5) qualified = true;
      else if (missionId === "m_towers_climber" && (freshUser.towersRoundCount || 0) >= 5) qualified = true;
      else if (missionId === "m_wager_pioneer" && (freshUser.totalWager || 0) >= 150000000) qualified = true;
      else if (missionId === "m_unlocked_sweep" && (freshUser.minesRoundCount || 0) >= 15) qualified = true;
      
      if (!qualified) {
        return { success: false, msg: "❌ You do not meet the requirements for this mission yet." };
      }
      
      const actualReward = missionRewards[missionId] ?? rewardAmount;
      completedMissions[missionId] = true;
      const currentBalance = Number(freshUser.balance) || 0;
      const newBalance = Math.min(1000000000000, currentBalance + actualReward);
      const newUnwagered = (Number(freshUser.unwageredReward) || 0) + actualReward;
      
      await set(userRef, {
        ...freshUser,
        balance: newBalance,
        unwageredReward: newUnwagered,
        completedMissions: completedMissions
      });
      
      await broadcastChatMessage(`🏆 completed quest and claimed a payload of +${actualReward.toLocaleString()} Gems!`);
      
      return { success: true, msg: "🎉 Reward claimed successfully!" };
    } catch (e) {
      console.error(e);
      return { success: false, msg: "❌ Failed database write operation." };
    }
  };

  const claimLevelMilestone = async (level: number, rewardAmount: number): Promise<{ success: boolean; msg: string }> => {
    if (!currentUser) return { success: false, msg: "❌ Please sign in first." };
    try {
      const userRef = ref(db, `users/${currentUser.username}`);
      const snap = await get(userRef);
      const freshUser = snap.val();
      if (!freshUser) return { success: false, msg: "❌ Profiling data unavailable." };
      
      const claimedMilestones = freshUser.claimedMilestones || {};
      if (claimedMilestones[level]) {
        return { success: false, msg: "❌ You have already redeemed this level milestones vault!" };
      }
      
      const totalWager = Number(freshUser.totalWager) || 0;
      const computedLevel = Math.floor(Math.sqrt(totalWager / 5000000)) + 1;
      
      if (computedLevel < level) {
        return { success: false, msg: "❌ Qualified level too low to break lock." };
      }
      
      const actualReward = milestoneRewards[`lvl_${level}`] ?? rewardAmount;
      claimedMilestones[level] = true;
      const currentBalance = Number(freshUser.balance) || 0;
      const newBalance = Math.min(1000000000000, currentBalance + actualReward);
      const newUnwagered = (Number(freshUser.unwageredReward) || 0) + actualReward;
      
      await set(userRef, {
        ...freshUser,
        balance: newBalance,
        unwageredReward: newUnwagered,
        claimedMilestones: claimedMilestones
      });
      
      await broadcastChatMessage(`✨ unlocked Level ${level} Vault and scooped a bounty of +${actualReward.toLocaleString()} Gems!`);
      
      return { success: true, msg: "🎉 Level milestone vault successfully breached and claimed!" };
    } catch (e) {
      console.error(e);
      return { success: false, msg: "❌ Level vault claim transaction failed." };
    }
  };

  const syncActiveTab = (tabId: string) => {
    setActiveTab(tabId);
    localStorage.setItem("ps99_active_tab", tabId);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#020204] cyber-grid flex flex-col justify-center items-center gap-6 z-50">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-600/10 blur-[100px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-600/10 blur-[100px] rounded-full animate-pulse" />
        
        <h2 className="font-display font-black text-2xl md:text-3xl text-white tracking-widest uppercase animate-pulse relative z-10">
          💎 PS99 <span className="text-cyan-400">Core</span>
        </h2>
        <div className="w-12 h-12 border-2 border-white/5 border-t-cyan-400 rounded-full animate-spin relative z-10" />
        <p className="text-slate-500 font-display text-[10px] uppercase tracking-widest text-center max-w-sm px-4 relative z-10">
          {loadingMsg}
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#020204] cyber-grid flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-120 h-120 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-120 h-120 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md bg-black/60 border border-white/5 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 animate-pulse" />

          <div className="text-center mb-8 select-none">
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-wider uppercase">
              💎 PS99 <span className="text-cyan-400">Core</span>
            </h1>
            <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-2.5 font-display font-extrabold">
              Secure Gaming Dashboard
            </p>
          </div>

          <AnimatePresence mode="wait">
            {authFrame === 'login' ? (
              <motion.div
                key="login-frame"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-xs font-display font-bold uppercase text-white tracking-wider mb-5 border-l-2 border-cyan-400 pl-2.5">
                  Sign In to Account
                </h3>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      value={authInputs.username}
                      onChange={(e) => setAuthInputs(prev => ({ ...prev, username: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                      className="w-full bg-[#030305] border border-white/5 hover:border-white/10 focus:border-cyan-500/50 rounded-lg px-4 py-3 text-white text-xs outline-none transition-all"
                      placeholder="Enter your username..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={authInputs.password}
                      onChange={(e) => setAuthInputs(prev => ({ ...prev, password: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                      className="w-full bg-[#030305] border border-white/5 hover:border-white/10 focus:border-cyan-500/50 rounded-lg px-4 py-3 text-white text-xs outline-none transition-all"
                      placeholder="Enter your password..."
                    />
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 hover:bg-blue-500 border-none py-3.5 block text-white font-display font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-all"
                >
                  Sign In
                </button>

                <div className="text-center mt-5">
                  <span
                    onClick={() => { setAuthFrame('register'); setAuthInputs({ username: "", password: "" }); setAuthFeedback(null); }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer select-none"
                  >
                    Don't have an account? Register here &rarr;
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="register-frame"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-xs font-display font-bold uppercase text-white tracking-wider mb-5 border-l-2 border-indigo-400 pl-2.5">
                  Register a New Account
                </h3>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">
                      Choose Username
                    </label>
                    <input
                      type="text"
                      value={authInputs.username}
                      onChange={(e) => setAuthInputs(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full bg-[#030305] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-lg px-4 py-3 text-white text-xs outline-none transition-all"
                      placeholder="Minimum 3 characters (letters/numbers)"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={authInputs.password}
                      onChange={(e) => setAuthInputs(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-[#030305] border border-white/5 hover:border-white/10 focus:border-blue-500/50 rounded-lg px-4 py-3 text-white text-xs outline-none transition-all"
                      placeholder="Minimum 4 characters"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRegister}
                  className="w-full bg-blue-600 hover:bg-blue-500 border-none py-3.5 block text-white font-display font-bold text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-all"
                >
                  Create Account
                </button>

                <div className="text-center mt-5">
                  <span
                    onClick={() => { setAuthFrame('login'); setAuthInputs({ username: "", password: "" }); setAuthFeedback(null); }}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer select-none"
                  >
                    &larr; Already have an account? Sign in here
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {authFeedback && (
            <div className="mt-5 p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs font-semibold text-center flex items-center justify-center gap-1.5 select-none">
              <AlertCircle className="h-4 w-4" /> {authFeedback}
            </div>
          )}

        </div>

        <div className="mt-6 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-slate-600">
          <Shield className="h-3.5 w-3.5" /> Secure SSL Encryption Enabled
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020204] cyber-grid flex flex-col relative pb-16">
      <div className="absolute top-0 right-0 w-120 h-120 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-120 h-120 bg-cyan-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <MyNavbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={syncActiveTab}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        logout={handleLogout}
      />

      {announcement && (
        <div className="bg-cyan-950/20 border-y border-cyan-500/20 py-2.5 relative overflow-hidden flex items-center shadow-[inset_0_0_15px_rgba(6,182,212,0.05)]">
          <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#020204] via-[#020204]/90 to-transparent w-24 z-10 pointer-events-none" />
          <div className="absolute top-0 right-0 bottom-0 bg-gradient-to-l from-[#020204] via-[#020204]/90 to-transparent w-24 z-10 pointer-events-none" />
          
          <div className="flex items-center gap-2 pl-4 sm:pl-8 shrink-0 z-20">
            <span className="bg-cyan-400 text-black text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded font-display flex items-center gap-1 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.4)]">
              <Sparkles className="h-2.5 w-2.5 fill-black" /> Broadcast
            </span>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div className="whitespace-nowrap animation-marquee hover:animation-play-state-paused inline-block pl-4 text-xs font-display font-semibold tracking-wider text-cyan-200">
              {announcement}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        
        <div className="bg-gradient-to-r from-bg-panel to-bg-card border border-border-color rounded-xl p-5 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all">
          <div>
            <h3 className="font-display font-extrabold text-sm text-white uppercase flex items-center gap-1.5 tracking-wide">
              ⚡ Safe Asset Deposit Bridge
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Need more gem supply? Coordinate securely with directory Overlords or Administrators on our Discord server.
            </p>
          </div>
          <a
            href="https://discord.gg/5F8H63r98"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-cyan-500 hover:bg-cyan-400 text-black py-2.5 px-4 rounded-xl text-xs font-bold font-display uppercase tracking-wider block transition-all shadow-md active:scale-95"
          >
            Open Discord
          </a>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait">
            {activeTab === 'spin' && (
              <motion.div
                key="spin-v"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <SpinWheel
                  currentUser={currentUser}
                  balance={currentUser.balance}
                  updateUserBalance={updateUserBalance}
                  addHistory={addHistory}
                  houseEdgeBias={houseEdgeBias}
                />
              </motion.div>
            )}

            {activeTab === 'towers' && (
              <motion.div
                key="towers-v"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <TowerAscent
                  currentUser={currentUser}
                  balance={currentUser.balance}
                  updateUserBalance={updateUserBalance}
                  addHistory={addHistory}
                  houseEdgeBias={houseEdgeBias}
                />
              </motion.div>
            )}

            {activeTab === 'mines' && (
              <motion.div
                key="mines-v"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <SafeMines
                  currentUser={currentUser}
                  balance={currentUser.balance}
                  updateUserBalance={updateUserBalance}
                  addHistory={addHistory}
                  houseEdgeBias={houseEdgeBias}
                />
              </motion.div>
            )}

            {activeTab === 'plinko' && (
              <motion.div
                key="plinko-v"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Plinko
                  currentUser={currentUser}
                  balance={currentUser.balance}
                  updateUserBalance={updateUserBalance}
                  addHistory={addHistory}
                  houseEdgeBias={houseEdgeBias}
                />
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div
                key="profile-v"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <MyProfile
                  currentUser={currentUser}
                  updateUserPassword={handlePasswordUpdate}
                  redeemPromoCode={redeemPromoCode}
                  claimDailyGems={claimDailyGems}
                  buyCosmeticItem={buyCosmeticItem}
                  clearCosmeticItem={clearCosmeticItem}
                  cosmeticPrices={cosmeticPrices}
                  requestWithdrawal={requestWithdrawal}
                  setOverlordSignature={setOverlordSignature}
                />
              </motion.div>
            )}

            {activeTab === 'leaderboard' && (
              <motion.div
                key="leaderboard-v"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Leaderboard
                  dbUsers={dbUsers}
                  currentUser={currentUser}
                />
              </motion.div>
            )}

            {activeTab === 'missions' && (
              <motion.div
                key="missions-v"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <MissionsHQ
                  currentUser={currentUser}
                  dbUsers={dbUsers}
                  claimMissionReward={claimMissionReward}
                  claimLevelMilestone={claimLevelMilestone}
                  missionRewards={missionRewards}
                  milestoneRewards={milestoneRewards}
                />
              </motion.div>
            )}

            {activeTab === 'admin' && (currentUser.rank === 'admin' || currentUser.rank === 'overlord') && (
              <motion.div
                key="admin-v"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <AdminDesk
                  currentUser={currentUser}
                  dbUsers={dbUsers}
                  updateUserBalance={updateTargetUserBalance}
                  updateUserRank={updateTargetUserRank}
                  deleteUser={executeUserDeletionProtocol}
                  resetUserStats={resetUserStats}
                  resetAllUsersStats={resetAllUsersStats}
                  promoCodes={promoCodes}
                  createPromoCode={createPromoCode}
                  deletePromoCode={deletePromoCode}
                  updateUserCashout={updateTargetUserCashout}
                  announcement={announcement}
                  updateAnnouncement={updateAnnouncement}
                  cosmeticPrices={cosmeticPrices}
                  updateCosmeticPrice={updateCosmeticPrice}
                  missionRewards={missionRewards}
                  updateMissionReward={updateMissionReward}
                  milestoneRewards={milestoneRewards}
                  updateMilestoneReward={updateMilestoneReward}
                  discordWebhook={discordWebhook}
                  updateDiscordWebhook={updateDiscordWebhook}
                  houseEdgeBias={houseEdgeBias}
                  updateHouseEdgeBias={updateHouseEdgeBias}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-bg-panel border border-border-color/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 mt-12 mb-4">
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white text-3xl font-display shadow-lg shadow-indigo-500/20">
              💬
            </div>
            <div>
              <h4 className="font-display font-extrabold text-white text-base">
                Join our premium community Discord Server
              </h4>
              <p className="text-xs text-slate-500 mt-1 select-text">
                File help tickets, buy package deals, communicate coordinates, or chat live with other network members.
              </p>
            </div>
          </div>
          <a
            href="https://discord.gg/5F8H63r98"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 px-6 font-display font-bold text-xs uppercase tracking-widest block transition-all hover:shadow-lg hover:shadow-indigo-500/20"
          >
            Join Discord Space
          </a>
        </div>

      </div>

      <LiveChat
        currentUser={currentUser}
        chatMessages={chatMessages}
        broadcastMessage={broadcastChatMessage}
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
      />

    </div>
  );
}
