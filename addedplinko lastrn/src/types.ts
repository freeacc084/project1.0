export type UserRank = 'member' | 'admin' | 'overlord';

export interface UserData {
  password?: string;
  balance: number;
  rank: UserRank;
  totalDeposit: number;
  totalCashout: number;
  totalWager: number;
  lastClaimedDaily?: number;
  customTag?: string;
  customTagColor?: string;
  unwageredReward?: number;
}

export interface ChatMessage {
  username: string;
  rank: UserRank;
  timestamp: string;
  text: string;
  customTag?: string;
  customTagColor?: string;
}

export interface SpinSegment {
  label: string;
  mult: number;
  color: string;
}

export type TowerDifficulty = 'easy' | 'normal' | 'hard';

export interface HistoryCard {
  text: string;
  isWin: boolean;
  value?: string;
  timestamp?: number;
}
