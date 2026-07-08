import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  NflBoxScoreActual,
  NflBoxScoreGame,
  NflBoxScoreGuess,
  NflScoreBreakdown,
} from '../models/nfl-boxscore.models';

@Injectable({ providedIn: 'root' })
export class NflBoxscoreService {
  private readonly SCOREBOARD_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  private readonly SUMMARY_API = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary';

  constructor(private http: HttpClient) {}

  async fetchRandomGame(): Promise<{ game: NflBoxScoreGame; actual: NflBoxScoreActual }> {
    try {
      return await this.fetchRandomGameFromEspn();
    } catch {
      return this.getFallbackGame();
    }
  }

  private async fetchRandomGameFromEspn(): Promise<{ game: NflBoxScoreGame; actual: NflBoxScoreActual }> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const seasonYear = 2018 + Math.floor(Math.random() * 8);
      const month = [9, 10, 11, 12, 1, 2][Math.floor(Math.random() * 6)];
      const year = month >= 9 ? seasonYear : seasonYear + 1;
      const day = 1 + Math.floor(Math.random() * 27);
      const date = new Date(year, month - 1, day);
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

      const scoreboard: any = await firstValueFrom(this.http.get(`${this.SCOREBOARD_API}?dates=${dateStr}`));
      const events = (scoreboard?.events ?? []).filter((event: any) =>
        event?.status?.type?.completed &&
        event?.competitions?.[0]?.competitors?.length === 2 &&
        !String(event?.name ?? '').toLowerCase().includes('pro bowl') &&
        event?.competitions?.[0]?.competitors?.every(
          (team: any) => !['AFC', 'NFC'].includes(String(team?.team?.abbreviation ?? '').toUpperCase())
        )
      );

      if (!events.length) continue;

      const event = events[Math.floor(Math.random() * events.length)];
      const summary: any = await firstValueFrom(this.http.get(`${this.SUMMARY_API}?event=${event.id}`));
      const competition = summary?.header?.competitions?.[0];
      const teams = summary?.boxscore?.teams ?? [];
      const playerGroups = summary?.boxscore?.players ?? [];
      if (!competition || teams.length !== 2) continue;

      const home = competition.competitors.find((team: any) => team.homeAway === 'home');
      const away = competition.competitors.find((team: any) => team.homeAway === 'away');
      if (!home || !away) continue;

      const awayStats = teams.find((team: any) => team.homeAway === 'away')?.statistics ?? [];
      const homeStats = teams.find((team: any) => team.homeAway === 'home')?.statistics ?? [];

      const awayLeaders = this.extractLeaders(playerGroups, 'away');
      const homeLeaders = this.extractLeaders(playerGroups, 'home');

      const game: NflBoxScoreGame = {
        eventId: String(event.id),
        gameDate: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        awayTeam: {
          id: String(away.team.id),
          name: away.team.displayName,
          abbreviation: away.team.abbreviation,
        },
        homeTeam: {
          id: String(home.team.id),
          name: home.team.displayName,
          abbreviation: home.team.abbreviation,
        },
        venue: summary?.gameInfo?.venue?.fullName ?? competition?.venue?.fullName ?? 'Unknown venue',
        weather: competition?.weather?.displayValue ?? summary?.weather?.displayValue,
        awayQuarterback: awayLeaders.quarterback,
        homeQuarterback: homeLeaders.quarterback,
        awayLeaders: awayLeaders.summary,
        homeLeaders: homeLeaders.summary,
      };

      const actual: NflBoxScoreActual = {
        awayPoints: parseInt(away.score, 10) || 0,
        homePoints: parseInt(home.score, 10) || 0,
        awayTotalYards: this.parseTeamStat(awayStats, 'Total Yards'),
        homeTotalYards: this.parseTeamStat(homeStats, 'Total Yards'),
        awayTurnovers: this.parseTeamStat(awayStats, 'Turnovers'),
        homeTurnovers: this.parseTeamStat(homeStats, 'Turnovers'),
        awayPassYards: this.parseTeamStat(awayStats, 'Passing'),
        homePassYards: this.parseTeamStat(homeStats, 'Passing'),
        awayRushYards: this.parseTeamStat(awayStats, 'Rushing'),
        homeRushYards: this.parseTeamStat(homeStats, 'Rushing'),
      };

      return { game, actual };
    }

    throw new Error('Unable to find a completed NFL game');
  }

  private parseTeamStat(stats: any[], label: string): number {
    const stat = stats.find((entry: any) => entry.label === label);
    if (!stat) return 0;
    const raw = String(stat.displayValue ?? stat.value ?? '0');
    const match = raw.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  private extractLeaders(playerGroups: any[], homeAway: 'home' | 'away'): { quarterback?: string; summary: string[] } {
    const teamBlock = playerGroups.find((group: any) => group.homeAway === homeAway);
    const stats = teamBlock?.statistics ?? [];

    const passing = stats.find((entry: any) => entry.name === 'passing')?.athletes?.[0];
    const rushing = stats.find((entry: any) => entry.name === 'rushing')?.athletes?.[0];
    const receiving = stats.find((entry: any) => entry.name === 'receiving')?.athletes?.[0];

    return {
      quarterback: passing?.athlete?.displayName,
      summary: [
        passing ? `${passing.athlete.displayName} (QB)` : null,
        rushing ? `${rushing.athlete.displayName} (R)` : null,
        receiving ? `${receiving.athlete.displayName} (REC)` : null,
      ].filter((value): value is string => !!value),
    };
  }

  calculateScore(guess: NflBoxScoreGuess, actual: NflBoxScoreActual): NflScoreBreakdown {
    const g = {
      awayPoints: guess.awayPoints ?? 0,
      homePoints: guess.homePoints ?? 0,
      awayTotalYards: guess.awayTotalYards ?? 0,
      homeTotalYards: guess.homeTotalYards ?? 0,
      awayTurnovers: guess.awayTurnovers ?? 0,
      homeTurnovers: guess.homeTurnovers ?? 0,
      awayPassYards: guess.awayPassYards ?? 0,
      homePassYards: guess.homePassYards ?? 0,
      awayRushYards: guess.awayRushYards ?? 0,
      homeRushYards: guess.homeRushYards ?? 0,
    };

    const guessedWinner = g.awayPoints > g.homePoints ? 'away' : g.homePoints > g.awayPoints ? 'home' : 'tie';
    const actualWinner = actual.awayPoints > actual.homePoints ? 'away' : actual.homePoints > actual.awayPoints ? 'home' : 'tie';
    const correctWinner = guessedWinner === actualWinner;
    const winnerPoints = correctWinner ? 25 : 0;

    const guessedMargin = Math.abs(g.awayPoints - g.homePoints);
    const actualMargin = Math.abs(actual.awayPoints - actual.homePoints);
    const marginGap = Math.abs(guessedMargin - actualMargin);
    const marginPoints = marginGap === 0 ? 15 : marginGap <= 3 ? 10 : marginGap <= 7 ? 5 : 0;

    const statPoints = (guessed: number, actualValue: number, max: number, near = 1, medium = 2) => {
      const gap = Math.abs(guessed - actualValue);
      if (gap === 0) return max;
      if (gap <= near) return Math.floor(max / 2);
      if (gap <= medium) return Math.floor(max / 4);
      return 0;
    };

    const yardPoints = (guessed: number, actualValue: number, max: number) => {
      const gap = Math.abs(guessed - actualValue);
      if (gap === 0) return max;
      if (gap <= 15) return Math.floor(max / 2);
      if (gap <= 35) return Math.floor(max / 4);
      return 0;
    };

    const awayPointPoints = statPoints(g.awayPoints, actual.awayPoints, 20, 1, 3);
    const homePointPoints = statPoints(g.homePoints, actual.homePoints, 20, 1, 3);
    const awayYardPoints = yardPoints(g.awayTotalYards, actual.awayTotalYards, 10);
    const homeYardPoints = yardPoints(g.homeTotalYards, actual.homeTotalYards, 10);
    const awayTurnoverPoints = statPoints(g.awayTurnovers, actual.awayTurnovers, 5);
    const homeTurnoverPoints = statPoints(g.homeTurnovers, actual.homeTurnovers, 5);
    const awayPassPoints = yardPoints(g.awayPassYards, actual.awayPassYards, 5);
    const homePassPoints = yardPoints(g.homePassYards, actual.homePassYards, 5);
    const awayRushPoints = yardPoints(g.awayRushYards, actual.awayRushYards, 5);
    const homeRushPoints = yardPoints(g.homeRushYards, actual.homeRushYards, 5);

    const subtotal =
      winnerPoints + marginPoints +
      awayPointPoints + homePointPoints +
      awayYardPoints + homeYardPoints +
      awayTurnoverPoints + homeTurnoverPoints +
      awayPassPoints + homePassPoints +
      awayRushPoints + homeRushPoints;

    const perfectBonus = subtotal === 130 ? 15 : 0;

    return {
      totalPoints: subtotal + perfectBonus,
      maxPoints: 145,
      correctWinner,
      winnerPoints,
      marginPoints,
      awayPointPoints,
      homePointPoints,
      awayYardPoints,
      homeYardPoints,
      awayTurnoverPoints,
      homeTurnoverPoints,
      awayPassPoints,
      homePassPoints,
      awayRushPoints,
      homeRushPoints,
      perfectBonus,
    };
  }

  private getFallbackGame(): { game: NflBoxScoreGame; actual: NflBoxScoreActual } {
    return {
      game: {
        eventId: '401438030',
        gameDate: '2023-02-12',
        awayTeam: { id: '12', name: 'Kansas City Chiefs', abbreviation: 'KC' },
        homeTeam: { id: '21', name: 'Philadelphia Eagles', abbreviation: 'PHI' },
        venue: 'State Farm Stadium',
        awayQuarterback: 'Patrick Mahomes',
        homeQuarterback: 'Jalen Hurts',
        awayLeaders: ['Patrick Mahomes (QB)', 'Isiah Pacheco (R)', 'Travis Kelce (REC)'],
        homeLeaders: ['Jalen Hurts (QB)', 'Jalen Hurts (R)', 'DeVonta Smith (REC)'],
      },
      actual: {
        awayPoints: 38,
        homePoints: 35,
        awayTotalYards: 340,
        homeTotalYards: 417,
        awayTurnovers: 0,
        homeTurnovers: 1,
        awayPassYards: 182,
        homePassYards: 302,
        awayRushYards: 158,
        homeRushYards: 115,
      },
    };
  }
}
