export interface NflTeamInfo {
  id: string;
  name: string;
  abbreviation: string;
}

export interface NflBoxScoreGame {
  eventId: string;
  gameDate: string;
  awayTeam: NflTeamInfo;
  homeTeam: NflTeamInfo;
  venue: string;
  weather?: string;
  awayQuarterback?: string;
  homeQuarterback?: string;
  awayLeaders: string[];
  homeLeaders: string[];
}

export interface NflBoxScoreActual {
  awayPoints: number;
  homePoints: number;
  awayTotalYards: number;
  homeTotalYards: number;
  awayTurnovers: number;
  homeTurnovers: number;
  awayPassYards: number;
  homePassYards: number;
  awayRushYards: number;
  homeRushYards: number;
}

export interface NflBoxScoreGuess {
  awayPoints: number | null;
  homePoints: number | null;
  awayTotalYards: number | null;
  homeTotalYards: number | null;
  awayTurnovers: number | null;
  homeTurnovers: number | null;
  awayPassYards: number | null;
  homePassYards: number | null;
  awayRushYards: number | null;
  homeRushYards: number | null;
}

export interface NflScoreBreakdown {
  totalPoints: number;
  maxPoints: number;
  correctWinner: boolean;
  winnerPoints: number;
  marginPoints: number;
  awayPointPoints: number;
  homePointPoints: number;
  awayYardPoints: number;
  homeYardPoints: number;
  awayTurnoverPoints: number;
  homeTurnoverPoints: number;
  awayPassPoints: number;
  homePassPoints: number;
  awayRushPoints: number;
  homeRushPoints: number;
  perfectBonus: number;
}

export interface NflBoxScoreGameState {
  game: NflBoxScoreGame | null;
  actual: NflBoxScoreActual | null;
  guess: NflBoxScoreGuess;
  submitted: boolean;
  breakdown: NflScoreBreakdown | null;
  loading: boolean;
  error: string | null;
}
