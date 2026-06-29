export interface BoxScoreGame {
  gamePk: number;
  gameDate: string;
  awayTeam: TeamInfo;
  homeTeam: TeamInfo;
  venue: string;
  weather?: string;
  awayProbable?: string;
  homeProbable?: string;
  awayLineup: string[];
  homeLineup: string[];
}

export interface TeamInfo {
  id: number;
  name: string;
  abbreviation: string;
}

export interface BoxScoreActual {
  awayRuns: number;
  homeRuns: number;
  awayHits: number;
  homeHits: number;
  awayErrors: number;
  homeErrors: number;
  awayHR: number;
  homeHR: number;
  awayStrikeouts: number;
  homeStrikeouts: number;
}

export interface BoxScoreGuess {
  awayRuns: number | null;
  homeRuns: number | null;
  awayHits: number | null;
  homeHits: number | null;
  awayErrors: number | null;
  homeErrors: number | null;
  awayHR: number | null;
  homeHR: number | null;
  awayStrikeouts: number | null;
  homeStrikeouts: number | null;
}

export interface ScoreBreakdown {
  totalPoints: number;
  maxPoints: number;
  correctWinner: boolean;
  winnerPoints: number;
  runDiffPoints: number;
  awayRunPoints: number;
  homeRunPoints: number;
  awayHitPoints: number;
  homeHitPoints: number;
  awayErrorPoints: number;
  homeErrorPoints: number;
  awayHRPoints: number;
  homeHRPoints: number;
  awayKPoints: number;
  homeKPoints: number;
  perfectBonus: number;
}

export interface LeaderboardEntry {
  id?: string;
  playerName: string;
  score: number;
  maxScore: number;
  accuracy: number;
  correctWinner: boolean;
  gamePk: number;
  gameDate: string;
  matchup: string;
  submittedAt: string;
}

export interface BoxScoreGameState {
  game: BoxScoreGame | null;
  actual: BoxScoreActual | null;
  guess: BoxScoreGuess;
  submitted: boolean;
  breakdown: ScoreBreakdown | null;
  loading: boolean;
  error: string | null;
}
