import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { pool, query } from '../db';
import dotenv from 'dotenv';

dotenv.config();

const LAHMAN_PATH = process.env.LAHMAN_CSV_PATH || './data/lahman';

interface CsvRow {
  [key: string]: string;
}

async function readCsv(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on('data', (row: CsvRow) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function toInt(val: string | undefined): number | null {
  if (!val || val === '') return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function toFloat(val: string | undefined): number | null {
  if (!val || val === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

async function importPlayers(): Promise<void> {
  const filePath = path.join(LAHMAN_PATH, 'People.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping People.csv - not found at ${filePath}`);
    return;
  }

  console.log('Importing players from People.csv...');
  const rows = await readCsv(filePath);

  let count = 0;
  for (const row of rows) {
    const firstName = row.nameFirst || '';
    const lastName = row.nameLast || '';
    const fullName = `${firstName} ${lastName}`.trim();

    if (!fullName) continue;

    await query(
      `INSERT INTO players (lahman_id, first_name, last_name, full_name, debut_year, final_year, birth_year, birth_country, bats, throws)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (lahman_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         full_name = EXCLUDED.full_name,
         debut_year = EXCLUDED.debut_year,
         final_year = EXCLUDED.final_year,
         updated_at = NOW()`,
      [
        row.playerID,
        firstName,
        lastName,
        fullName,
        toInt(row.debut?.substring(0, 4)),
        toInt(row.finalGame?.substring(0, 4)),
        toInt(row.birthYear),
        row.birthCountry || null,
        row.bats || null,
        row.throws || null,
      ]
    );
    count++;
    if (count % 1000 === 0) console.log(`  ...${count} players`);
  }
  console.log(`  Imported ${count} players.`);
}

async function importBatting(): Promise<void> {
  const filePath = path.join(LAHMAN_PATH, 'Batting.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping Batting.csv - not found at ${filePath}`);
    return;
  }

  console.log('Importing batting stats from Batting.csv...');
  const rows = await readCsv(filePath);

  let count = 0;
  for (const row of rows) {
    // Look up the player
    const playerResult = await query(
      'SELECT player_id FROM players WHERE lahman_id = $1',
      [row.playerID]
    );
    if (playerResult.rows.length === 0) continue;

    const playerId = playerResult.rows[0].player_id;
    const ab = toInt(row.AB) || 0;
    const h = toInt(row.H) || 0;
    const bb = toInt(row.BB) || 0;
    const hbp = toInt(row.HBP) || 0;
    const sf = toInt(row.SF) || 0;
    const doubles = toInt(row['2B']) || 0;
    const triples = toInt(row['3B']) || 0;
    const hr = toInt(row.HR) || 0;

    const battingAvg = ab > 0 ? h / ab : null;
    const obp =
      ab + bb + hbp + sf > 0
        ? (h + bb + hbp) / (ab + bb + hbp + sf)
        : null;
    const tb = h + doubles + 2 * triples + 3 * hr;
    const slg = ab > 0 ? tb / ab : null;
    const ops = obp !== null && slg !== null ? obp + slg : null;

    await query(
      `INSERT INTO batting_seasons (player_id, year, team, league, games, at_bats, runs, hits, doubles, triples, home_runs, rbi, stolen_bases, caught_stealing, walks, strikeouts, batting_avg, on_base_pct, slugging_pct, ops)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (player_id, year, team) DO UPDATE SET
         hits = EXCLUDED.hits, home_runs = EXCLUDED.home_runs, rbi = EXCLUDED.rbi,
         stolen_bases = EXCLUDED.stolen_bases, batting_avg = EXCLUDED.batting_avg,
         on_base_pct = EXCLUDED.on_base_pct, slugging_pct = EXCLUDED.slugging_pct, ops = EXCLUDED.ops,
         games = EXCLUDED.games, at_bats = EXCLUDED.at_bats`,
      [
        playerId,
        toInt(row.yearID),
        row.teamID,
        row.lgID,
        toInt(row.G),
        ab,
        toInt(row.R),
        h,
        doubles,
        triples,
        hr,
        toInt(row.RBI),
        toInt(row.SB),
        toInt(row.CS),
        bb,
        toInt(row.SO),
        battingAvg ? parseFloat(battingAvg.toFixed(3)) : null,
        obp ? parseFloat(obp.toFixed(3)) : null,
        slg ? parseFloat(slg.toFixed(3)) : null,
        ops ? parseFloat(ops.toFixed(3)) : null,
      ]
    );
    count++;
    if (count % 5000 === 0) console.log(`  ...${count} batting rows`);
  }
  console.log(`  Imported ${count} batting season rows.`);
}

async function importPitching(): Promise<void> {
  const filePath = path.join(LAHMAN_PATH, 'Pitching.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping Pitching.csv - not found at ${filePath}`);
    return;
  }

  console.log('Importing pitching stats from Pitching.csv...');
  const rows = await readCsv(filePath);

  let count = 0;
  for (const row of rows) {
    const playerResult = await query(
      'SELECT player_id FROM players WHERE lahman_id = $1',
      [row.playerID]
    );
    if (playerResult.rows.length === 0) continue;

    const playerId = playerResult.rows[0].player_id;
    const ipOuts = toInt(row.IPouts) || 0;
    const ip = ipOuts / 3;
    const er = toInt(row.ER) || 0;
    const era = ip > 0 ? (er * 9) / ip : null;
    const ha = toInt(row.H) || 0;
    const bb = toInt(row.BB) || 0;
    const whip = ip > 0 ? (ha + bb) / ip : null;

    await query(
      `INSERT INTO pitching_seasons (player_id, year, team, league, wins, losses, era, games, games_started, complete_games, shutouts, saves, innings_pitched, hits_allowed, earned_runs, home_runs_allowed, walks, strikeouts, whip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       ON CONFLICT (player_id, year, team) DO UPDATE SET
         wins = EXCLUDED.wins, losses = EXCLUDED.losses, era = EXCLUDED.era,
         saves = EXCLUDED.saves, strikeouts = EXCLUDED.strikeouts, whip = EXCLUDED.whip,
         innings_pitched = EXCLUDED.innings_pitched`,
      [
        playerId,
        toInt(row.yearID),
        row.teamID,
        row.lgID,
        toInt(row.W),
        toInt(row.L),
        era ? parseFloat(era.toFixed(2)) : null,
        toInt(row.G),
        toInt(row.GS),
        toInt(row.CG),
        toInt(row.SHO),
        toInt(row.SV),
        parseFloat(ip.toFixed(1)),
        ha,
        er,
        toInt(row.HR),
        bb,
        toInt(row.SO),
        whip ? parseFloat(whip.toFixed(2)) : null,
      ]
    );
    count++;
    if (count % 5000 === 0) console.log(`  ...${count} pitching rows`);
  }
  console.log(`  Imported ${count} pitching season rows.`);
}

async function importAwards(): Promise<void> {
  const filePath = path.join(LAHMAN_PATH, 'AwardsPlayers.csv');
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping AwardsPlayers.csv - not found at ${filePath}`);
    return;
  }

  console.log('Importing awards from AwardsPlayers.csv...');
  const rows = await readCsv(filePath);

  let count = 0;
  for (const row of rows) {
    const playerResult = await query(
      'SELECT player_id FROM players WHERE lahman_id = $1',
      [row.playerID]
    );
    if (playerResult.rows.length === 0) continue;

    await query(
      `INSERT INTO awards (player_id, year, award_name, league)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (player_id, year, award_name) DO NOTHING`,
      [playerResult.rows[0].player_id, toInt(row.yearID), row.awardID, row.lgID]
    );
    count++;
  }
  console.log(`  Imported ${count} awards.`);
}

async function buildCareerStats(): Promise<void> {
  console.log('Building career stats...');

  await query(`
    INSERT INTO career_stats (player_id, total_games, total_hits, total_home_runs, total_rbi, total_stolen_bases, total_walks, total_strikeouts_batting, career_batting_avg)
    SELECT
      p.player_id,
      COALESCE(SUM(b.games), 0),
      COALESCE(SUM(b.hits), 0),
      COALESCE(SUM(b.home_runs), 0),
      COALESCE(SUM(b.rbi), 0),
      COALESCE(SUM(b.stolen_bases), 0),
      COALESCE(SUM(b.walks), 0),
      COALESCE(SUM(b.strikeouts), 0),
      CASE WHEN SUM(b.at_bats) > 0 THEN ROUND(SUM(b.hits)::numeric / SUM(b.at_bats), 3) ELSE NULL END
    FROM players p
    LEFT JOIN batting_seasons b ON b.player_id = p.player_id
    GROUP BY p.player_id
    ON CONFLICT (player_id) DO UPDATE SET
      total_games = EXCLUDED.total_games,
      total_hits = EXCLUDED.total_hits,
      total_home_runs = EXCLUDED.total_home_runs,
      total_rbi = EXCLUDED.total_rbi,
      total_stolen_bases = EXCLUDED.total_stolen_bases,
      total_walks = EXCLUDED.total_walks,
      total_strikeouts_batting = EXCLUDED.total_strikeouts_batting,
      career_batting_avg = EXCLUDED.career_batting_avg
  `);

  // Update pitching career stats
  await query(`
    UPDATE career_stats cs SET
      total_wins = sub.total_wins,
      total_saves = sub.total_saves,
      total_strikeouts_pitching = sub.total_ks,
      career_era = sub.career_era
    FROM (
      SELECT
        player_id,
        SUM(wins) as total_wins,
        SUM(saves) as total_saves,
        SUM(strikeouts) as total_ks,
        CASE WHEN SUM(innings_pitched) > 0 THEN ROUND((SUM(earned_runs) * 9.0) / SUM(innings_pitched), 2) ELSE NULL END as career_era
      FROM pitching_seasons
      GROUP BY player_id
    ) sub
    WHERE cs.player_id = sub.player_id
  `);

  // Update award counts
  await query(`
    UPDATE career_stats cs SET
      mvp_awards = COALESCE(sub.mvp, 0),
      cy_young_awards = COALESCE(sub.cy, 0),
      gold_glove_awards = COALESCE(sub.gg, 0),
      all_star_appearances = COALESCE(sub.asg, 0)
    FROM (
      SELECT
        player_id,
        COUNT(*) FILTER (WHERE award_name = 'Most Valuable Player') as mvp,
        COUNT(*) FILTER (WHERE award_name = 'Cy Young Award') as cy,
        COUNT(*) FILTER (WHERE award_name = 'Gold Glove') as gg,
        COUNT(*) FILTER (WHERE award_name LIKE '%All-Star%') as asg
      FROM awards
      GROUP BY player_id
    ) sub
    WHERE cs.player_id = sub.player_id
  `);

  console.log('  Career stats built.');
}

async function main(): Promise<void> {
  console.log('=== Lahman Database Import ===');
  console.log(`Reading CSVs from: ${path.resolve(LAHMAN_PATH)}`);

  if (!fs.existsSync(LAHMAN_PATH)) {
    console.error(`\nLahman data directory not found: ${path.resolve(LAHMAN_PATH)}`);
    console.error('Download the Lahman database from:');
    console.error('  https://github.com/chadwickbureau/baseballdatabank');
    console.error(`\nPlace the CSV files (People.csv, Batting.csv, Pitching.csv, AwardsPlayers.csv) in:\n  ${path.resolve(LAHMAN_PATH)}`);
    process.exit(1);
  }

  try {
    await importPlayers();
    await importBatting();
    await importPitching();
    await importAwards();
    await buildCareerStats();

    console.log('\n=== Import complete! ===');
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
