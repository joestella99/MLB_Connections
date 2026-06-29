import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  BoxScoreGame,
  BoxScoreActual,
  BoxScoreGuess,
  ScoreBreakdown,
  TeamInfo,
} from '../models/boxscore.models';

@Injectable({ providedIn: 'root' })
export class BoxScoreService {
  private readonly API = 'https://statsapi.mlb.com/api/v1';

  constructor(private http: HttpClient) {}

  /** Pick a random completed game from a random date (2005–2024) */
  async fetchRandomGame(): Promise<{ game: BoxScoreGame; actual: BoxScoreActual }> {
    const year = 2005 + Math.floor(Math.random() * 20); // 2005-2024
    const month = 4 + Math.floor(Math.random() * 6);    // Apr-Sep
    const day = 1 + Math.floor(Math.random() * 28);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const scheduleUrl = `${this.API}/schedule?date=${dateStr}&sportId=1&hydrate=linescore,weather,probablePitcher(note),team`;
    const schedule: any = await firstValueFrom(this.http.get(scheduleUrl));

    const dates = schedule?.dates ?? [];
    if (!dates.length || !dates[0].games?.length) {
      // retry with different date
      return this.fetchRandomGame();
    }

    // Filter to completed games (Final status)
    const completed = dates[0].games.filter(
      (g: any) => g.status?.detailedState === 'Final'
    );
    if (!completed.length) {
      return this.fetchRandomGame();
    }

    const gameData = completed[Math.floor(Math.random() * completed.length)];
    const gamePk = gameData.gamePk;

    // Fetch box score
    const boxUrl = `${this.API}/game/${gamePk}/boxscore`;
    const box: any = await firstValueFrom(this.http.get(boxUrl));

    const awayTeamData = gameData.teams.away.team;
    const homeTeamData = gameData.teams.home.team;
    const linescore = gameData.linescore;

    const awayTeam: TeamInfo = {
      id: awayTeamData.id,
      name: awayTeamData.name,
      abbreviation: awayTeamData.abbreviation ?? awayTeamData.name.substring(0, 3).toUpperCase(),
    };
    const homeTeam: TeamInfo = {
      id: homeTeamData.id,
      name: homeTeamData.name,
      abbreviation: homeTeamData.abbreviation ?? homeTeamData.name.substring(0, 3).toUpperCase(),
    };

    // Extract lineups from box score
    const awayLineup = this.extractLineup(box.teams?.away);
    const homeLineup = this.extractLineup(box.teams?.home);

    // Weather
    const weather = gameData.weather
      ? `${gameData.weather.condition}, ${gameData.weather.temp}°F, Wind: ${gameData.weather.wind}`
      : undefined;

    // Probable pitchers
    const awayProbable = gameData.teams?.away?.probablePitcher?.fullName;
    const homeProbable = gameData.teams?.home?.probablePitcher?.fullName;

    const game: BoxScoreGame = {
      gamePk,
      gameDate: dateStr,
      awayTeam,
      homeTeam,
      venue: gameData.venue?.name ?? 'Unknown',
      weather,
      awayProbable,
      homeProbable,
      awayLineup,
      homeLineup,
    };

    // Extract actual box score stats
    const awayBatting = box.teams?.away?.teamStats?.batting ?? {};
    const homeBatting = box.teams?.home?.teamStats?.batting ?? {};

    const actual: BoxScoreActual = {
      awayRuns: linescore?.teams?.away?.runs ?? awayBatting.runs ?? 0,
      homeRuns: linescore?.teams?.home?.runs ?? homeBatting.runs ?? 0,
      awayHits: linescore?.teams?.away?.hits ?? awayBatting.hits ?? 0,
      homeHits: linescore?.teams?.home?.hits ?? homeBatting.hits ?? 0,
      awayErrors: linescore?.teams?.away?.errors ?? 0,
      homeErrors: linescore?.teams?.home?.errors ?? 0,
      awayHR: awayBatting.homeRuns ?? 0,
      homeHR: homeBatting.homeRuns ?? 0,
      awayStrikeouts: awayBatting.strikeOuts ?? 0,
      homeStrikeouts: homeBatting.strikeOuts ?? 0,
    };

    return { game, actual };
  }

  private extractLineup(teamBox: any): string[] {
    if (!teamBox?.battingOrder) return [];
    const players = teamBox.players ?? {};
    return teamBox.battingOrder
      .map((id: number) => {
        const p = players[`ID${id}`];
        if (!p) return null;
        const name = p.person?.fullName ?? 'Unknown';
        const pos = p.position?.abbreviation ?? '';
        return `${name} (${pos})`;
      })
      .filter(Boolean)
      .slice(0, 9);
  }

  /** Calculate score based on guess vs actual */
  calculateScore(guess: BoxScoreGuess, actual: BoxScoreActual): ScoreBreakdown {
    const g = {
      awayRuns: guess.awayRuns ?? 0,
      homeRuns: guess.homeRuns ?? 0,
      awayHits: guess.awayHits ?? 0,
      homeHits: guess.homeHits ?? 0,
      awayErrors: guess.awayErrors ?? 0,
      homeErrors: guess.homeErrors ?? 0,
      awayHR: guess.awayHR ?? 0,
      homeHR: guess.homeHR ?? 0,
      awayStrikeouts: guess.awayStrikeouts ?? 0,
      homeStrikeouts: guess.homeStrikeouts ?? 0,
    };

    // Winner guess (25 pts)
    const guessedWinner = g.awayRuns > g.homeRuns ? 'away' : g.homeRuns > g.awayRuns ? 'home' : 'tie';
    const actualWinner = actual.awayRuns > actual.homeRuns ? 'away' : actual.homeRuns > actual.awayRuns ? 'home' : 'tie';
    const correctWinner = guessedWinner === actualWinner;
    const winnerPoints = correctWinner ? 25 : 0;

    // Run differential (15 max)
    const guessedDiff = Math.abs(g.awayRuns - g.homeRuns);
    const actualDiff = Math.abs(actual.awayRuns - actual.homeRuns);
    const diffGap = Math.abs(guessedDiff - actualDiff);
    const runDiffPoints = diffGap === 0 ? 15 : diffGap === 1 ? 10 : diffGap === 2 ? 5 : 0;

    // Individual stat closeness (exact = full, off by 1 = half, off by 2 = quarter)
    const statPoints = (guessed: number, actual: number, max: number) => {
      const gap = Math.abs(guessed - actual);
      if (gap === 0) return max;
      if (gap === 1) return Math.floor(max / 2);
      if (gap === 2) return Math.floor(max / 4);
      return 0;
    };

    const awayRunPoints = statPoints(g.awayRuns, actual.awayRuns, 20);
    const homeRunPoints = statPoints(g.homeRuns, actual.homeRuns, 20);
    const awayHitPoints = statPoints(g.awayHits, actual.awayHits, 10);
    const homeHitPoints = statPoints(g.homeHits, actual.homeHits, 10);
    const awayErrorPoints = statPoints(g.awayErrors, actual.awayErrors, 5);
    const homeErrorPoints = statPoints(g.homeErrors, actual.homeErrors, 5);
    const awayHRPoints = statPoints(g.awayHR, actual.awayHR, 10);
    const homeHRPoints = statPoints(g.homeHR, actual.homeHR, 10);
    const awayKPoints = statPoints(g.awayStrikeouts, actual.awayStrikeouts, 5);
    const homeKPoints = statPoints(g.homeStrikeouts, actual.homeStrikeouts, 5);

    const subtotal =
      winnerPoints + runDiffPoints +
      awayRunPoints + homeRunPoints +
      awayHitPoints + homeHitPoints +
      awayErrorPoints + homeErrorPoints +
      awayHRPoints + homeHRPoints +
      awayKPoints + homeKPoints;

    const maxPoints = 155; // 25+15+40+20+10+20+10 = 140 + 15 perfect bonus
    const isPerfect = subtotal === 140;
    const perfectBonus = isPerfect ? 15 : 0;

    return {
      totalPoints: subtotal + perfectBonus,
      maxPoints,
      correctWinner,
      winnerPoints,
      runDiffPoints,
      awayRunPoints,
      homeRunPoints,
      awayHitPoints,
      homeHitPoints,
      awayErrorPoints,
      homeErrorPoints,
      awayHRPoints,
      homeHRPoints,
      awayKPoints,
      homeKPoints,
      perfectBonus,
    };
  }
}
