import { pool, query } from '../db';
import dotenv from 'dotenv';

dotenv.config();

const MLB_API_BASE = process.env.MLB_API_BASE || 'https://statsapi.mlb.com/api/v1';

interface MlbPerson {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  primaryPosition?: { abbreviation: string };
  batSide?: { code: string };
  pitchHand?: { code: string };
  mlbDebutDate?: string;
  lastPlayedDate?: string;
  birthCountry?: string;
  birthDate?: string;
  active?: boolean;
}

interface MlbStatSplit {
  season: string;
  team?: { abbreviation?: string };
  league?: { abbreviation?: string };
  stat: Record<string, unknown>;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`MLB API error: ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

async function importActiveRoster(): Promise<void> {
  console.log('Fetching active MLB rosters...');

  // Get all teams
  const teamsData = (await fetchJson(`${MLB_API_BASE}/teams?sportId=1`)) as {
    teams: { id: number; abbreviation: string }[];
  };

  for (const team of teamsData.teams) {
    console.log(`  Fetching roster for ${team.abbreviation}...`);

    try {
      const rosterData = (await fetchJson(
        `${MLB_API_BASE}/teams/${team.id}/roster?rosterType=40Man`
      )) as {
        roster?: { person: { id: number; fullName: string }; position: { abbreviation: string } }[];
      };

      if (!rosterData.roster) continue;

      for (const entry of rosterData.roster) {
        // Get detailed player info
        const personData = (await fetchJson(
          `${MLB_API_BASE}/people/${entry.person.id}`
        )) as { people: MlbPerson[] };

        if (!personData.people || personData.people.length === 0) continue;
        const p = personData.people[0];

        const debutYear = p.mlbDebutDate ? parseInt(p.mlbDebutDate.substring(0, 4)) : null;
        const birthYear = p.birthDate ? parseInt(p.birthDate.substring(0, 4)) : null;

        // Upsert player by mlb_id
        await query(
          `INSERT INTO players (mlb_id, first_name, last_name, full_name, debut_year, birth_year, birth_country, bats, throws, primary_position)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (mlb_id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             primary_position = EXCLUDED.primary_position,
             updated_at = NOW()`,
          [
            p.id,
            p.firstName,
            p.lastName,
            p.fullName,
            debutYear,
            birthYear,
            p.birthCountry || null,
            p.batSide?.code || null,
            p.pitchHand?.code || null,
            p.primaryPosition?.abbreviation || entry.position.abbreviation,
          ]
        );
      }
    } catch (err) {
      console.warn(`  Warning: Could not fetch roster for team ${team.abbreviation}:`, err);
    }
  }
}

async function importRecentStats(startYear: number, endYear: number): Promise<void> {
  console.log(`Fetching season stats from ${startYear} to ${endYear}...`);

  for (let year = startYear; year <= endYear; year++) {
    console.log(`  Fetching ${year} batting leaders...`);

    try {
      // Batting stats - get qualified batters
      const battingData = (await fetchJson(
        `${MLB_API_BASE}/stats?stats=season&group=hitting&season=${year}&sportId=1&limit=500&fields=stats,splits,player,id,fullName,stat,season,team,abbreviation,gamesPlayed,atBats,runs,hits,doubles,triples,homeRuns,rbi,stolenBases,caughtStealing,baseOnBalls,strikeOuts,avg,obp,slg,ops`
      )) as { stats?: { splits: (MlbStatSplit & { player: { id: number; fullName: string } })[] }[] };

      if (battingData.stats?.[0]?.splits) {
        for (const split of battingData.stats[0].splits) {
          const s = split.stat as Record<string, string>;
          const mlbId = split.player?.id;
          if (!mlbId) continue;

          // Find player in DB
          const playerResult = await query(
            'SELECT player_id FROM players WHERE mlb_id = $1',
            [mlbId]
          );
          if (playerResult.rows.length === 0) continue;

          const playerId = playerResult.rows[0].player_id;
          const teamAbbr = split.team?.abbreviation || '';

          await query(
            `INSERT INTO batting_seasons (player_id, year, team, games, at_bats, runs, hits, doubles, triples, home_runs, rbi, stolen_bases, caught_stealing, walks, strikeouts, batting_avg, on_base_pct, slugging_pct, ops)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
             ON CONFLICT (player_id, year, team) DO UPDATE SET
               hits = EXCLUDED.hits, home_runs = EXCLUDED.home_runs, stolen_bases = EXCLUDED.stolen_bases,
               batting_avg = EXCLUDED.batting_avg, ops = EXCLUDED.ops`,
            [
              playerId, year, teamAbbr,
              parseInt(s.gamesPlayed || '0'),
              parseInt(s.atBats || '0'),
              parseInt(s.runs || '0'),
              parseInt(s.hits || '0'),
              parseInt(s.doubles || '0'),
              parseInt(s.triples || '0'),
              parseInt(s.homeRuns || '0'),
              parseInt(s.rbi || '0'),
              parseInt(s.stolenBases || '0'),
              parseInt(s.caughtStealing || '0'),
              parseInt(s.baseOnBalls || '0'),
              parseInt(s.strikeOuts || '0'),
              parseFloat(s.avg || '0') || null,
              parseFloat(s.obp || '0') || null,
              parseFloat(s.slg || '0') || null,
              parseFloat(s.ops || '0') || null,
            ]
          );
        }
      }

      // Pitching stats
      console.log(`  Fetching ${year} pitching leaders...`);
      const pitchingData = (await fetchJson(
        `${MLB_API_BASE}/stats?stats=season&group=pitching&season=${year}&sportId=1&limit=500&fields=stats,splits,player,id,stat,season,team,abbreviation,wins,losses,era,gamesPlayed,gamesStarted,completeGames,shutouts,saves,inningsPitched,hits,earnedRuns,homeRuns,baseOnBalls,strikeOuts,whip`
      )) as { stats?: { splits: (MlbStatSplit & { player: { id: number } })[] }[] };

      if (pitchingData.stats?.[0]?.splits) {
        for (const split of pitchingData.stats[0].splits) {
          const s = split.stat as Record<string, string>;
          const mlbId = split.player?.id;
          if (!mlbId) continue;

          const playerResult = await query(
            'SELECT player_id FROM players WHERE mlb_id = $1',
            [mlbId]
          );
          if (playerResult.rows.length === 0) continue;

          const playerId = playerResult.rows[0].player_id;
          const teamAbbr = split.team?.abbreviation || '';

          await query(
            `INSERT INTO pitching_seasons (player_id, year, team, wins, losses, era, games, games_started, complete_games, shutouts, saves, innings_pitched, hits_allowed, earned_runs, home_runs_allowed, walks, strikeouts, whip)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
             ON CONFLICT (player_id, year, team) DO UPDATE SET
               wins = EXCLUDED.wins, saves = EXCLUDED.saves, strikeouts = EXCLUDED.strikeouts, era = EXCLUDED.era`,
            [
              playerId, year, teamAbbr,
              parseInt(s.wins || '0'),
              parseInt(s.losses || '0'),
              parseFloat(s.era || '0') || null,
              parseInt(s.gamesPlayed || '0'),
              parseInt(s.gamesStarted || '0'),
              parseInt(s.completeGames || '0'),
              parseInt(s.shutouts || '0'),
              parseInt(s.saves || '0'),
              parseFloat(s.inningsPitched || '0'),
              parseInt(s.hits || '0'),
              parseInt(s.earnedRuns || '0'),
              parseInt(s.homeRuns || '0'),
              parseInt(s.baseOnBalls || '0'),
              parseInt(s.strikeOuts || '0'),
              parseFloat(s.whip || '0') || null,
            ]
          );
        }
      }
    } catch (err) {
      console.warn(`  Warning: Error fetching ${year} stats:`, err);
    }
  }
}

async function main(): Promise<void> {
  console.log('=== MLB Stats API Import ===');

  try {
    await importActiveRoster();

    const currentYear = new Date().getFullYear();
    await importRecentStats(currentYear - 5, currentYear);

    console.log('\n=== MLB API import complete! ===');
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
