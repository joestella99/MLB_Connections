import { query, pool } from '../db';
import dotenv from 'dotenv';

dotenv.config();

interface CategoryTemplate {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'tricky';
  sql: string;
  displayStat?: string; // column to show as stat_value
}

// ============================================================
// Category templates — each SQL must return: full_name, player_id, stat_value
// These are the stat milestones that make great trivia
// ============================================================
const CATEGORY_POOL: CategoryTemplate[] = [
  // === EASY ===
  {
    name: '500+ Career Home Runs',
    difficulty: 'easy',
    sql: `SELECT p.full_name, p.player_id, cs.total_home_runs::text AS stat_value
          FROM career_stats cs JOIN players p ON p.player_id = cs.player_id
          WHERE cs.total_home_runs >= 500
          ORDER BY RANDOM()`,
  },
  {
    name: '3,000+ Career Hits',
    difficulty: 'easy',
    sql: `SELECT p.full_name, p.player_id, cs.total_hits::text AS stat_value
          FROM career_stats cs JOIN players p ON p.player_id = cs.player_id
          WHERE cs.total_hits >= 3000
          ORDER BY RANDOM()`,
  },
  {
    name: '300+ Career Wins (Pitchers)',
    difficulty: 'easy',
    sql: `SELECT p.full_name, p.player_id, cs.total_wins::text AS stat_value
          FROM career_stats cs JOIN players p ON p.player_id = cs.player_id
          WHERE cs.total_wins >= 300
          ORDER BY RANDOM()`,
  },
  {
    name: '600+ Career Home Runs',
    difficulty: 'easy',
    sql: `SELECT p.full_name, p.player_id, cs.total_home_runs::text AS stat_value
          FROM career_stats cs JOIN players p ON p.player_id = cs.player_id
          WHERE cs.total_home_runs >= 600
          ORDER BY RANDOM()`,
  },
  {
    name: '3,000+ Career Strikeouts (Pitchers)',
    difficulty: 'easy',
    sql: `SELECT p.full_name, p.player_id, cs.total_strikeouts_pitching::text AS stat_value
          FROM career_stats cs JOIN players p ON p.player_id = cs.player_id
          WHERE cs.total_strikeouts_pitching >= 3000
          ORDER BY RANDOM()`,
  },

  // === MEDIUM ===
  {
    name: '50+ Home Run Season',
    difficulty: 'medium',
    sql: `SELECT DISTINCT p.full_name, p.player_id, MAX(b.home_runs)::text AS stat_value
          FROM batting_seasons b JOIN players p ON p.player_id = b.player_id
          WHERE b.home_runs >= 50
          GROUP BY p.full_name, p.player_id
          ORDER BY RANDOM()`,
  },
  {
    name: '40/40 Club (40 HR & 40 SB in a Season)',
    difficulty: 'medium',
    sql: `SELECT DISTINCT p.full_name, p.player_id, (b.home_runs || ' HR / ' || b.stolen_bases || ' SB') AS stat_value
          FROM batting_seasons b JOIN players p ON p.player_id = b.player_id
          WHERE b.home_runs >= 40 AND b.stolen_bases >= 40
          ORDER BY RANDOM()`,
  },
  {
    name: '30+ Stolen Base Seasons (5+ Times)',
    difficulty: 'medium',
    sql: `SELECT p.full_name, p.player_id, COUNT(*)::text || ' seasons' AS stat_value
          FROM batting_seasons b JOIN players p ON p.player_id = b.player_id
          WHERE b.stolen_bases >= 30
          GROUP BY p.full_name, p.player_id
          HAVING COUNT(*) >= 5
          ORDER BY RANDOM()`,
  },
  {
    name: '.350+ Batting Average Season (Modern Era)',
    difficulty: 'medium',
    sql: `SELECT DISTINCT p.full_name, p.player_id, MAX(b.batting_avg)::text AS stat_value
          FROM batting_seasons b JOIN players p ON p.player_id = b.player_id
          WHERE b.batting_avg >= 0.350 AND b.at_bats >= 400 AND b.year >= 1920
          GROUP BY p.full_name, p.player_id
          ORDER BY RANDOM()`,
  },
  {
    name: '200+ Hit Seasons (3+ Times)',
    difficulty: 'medium',
    sql: `SELECT p.full_name, p.player_id, COUNT(*)::text || ' seasons' AS stat_value
          FROM batting_seasons b JOIN players p ON p.player_id = b.player_id
          WHERE b.hits >= 200
          GROUP BY p.full_name, p.player_id
          HAVING COUNT(*) >= 3
          ORDER BY RANDOM()`,
  },
  {
    name: '40+ Save Seasons',
    difficulty: 'medium',
    sql: `SELECT DISTINCT p.full_name, p.player_id, MAX(ps.saves)::text AS stat_value
          FROM pitching_seasons ps JOIN players p ON p.player_id = ps.player_id
          WHERE ps.saves >= 40
          GROUP BY p.full_name, p.player_id
          ORDER BY RANDOM()`,
  },

  // === HARD ===
  {
    name: '30-30 Club (30 HR & 30 SB Same Season)',
    difficulty: 'hard',
    sql: `SELECT DISTINCT p.full_name, p.player_id, (b.home_runs || ' HR / ' || b.stolen_bases || ' SB') AS stat_value
          FROM batting_seasons b JOIN players p ON p.player_id = b.player_id
          WHERE b.home_runs >= 30 AND b.stolen_bases >= 30
          ORDER BY RANDOM()`,
  },
  {
    name: '20-Win Seasons (Pitchers, Post-1960)',
    difficulty: 'hard',
    sql: `SELECT DISTINCT p.full_name, p.player_id, MAX(ps.wins)::text || ' W' AS stat_value
          FROM pitching_seasons ps JOIN players p ON p.player_id = ps.player_id
          WHERE ps.wins >= 20 AND ps.year >= 1960
          GROUP BY p.full_name, p.player_id
          ORDER BY RANDOM()`,
  },
  {
    name: 'Sub-2.00 ERA Season (100+ IP, Post-1920)',
    difficulty: 'hard',
    sql: `SELECT DISTINCT p.full_name, p.player_id, MIN(ps.era)::text || ' ERA' AS stat_value
          FROM pitching_seasons ps JOIN players p ON p.player_id = ps.player_id
          WHERE ps.era < 2.00 AND ps.era > 0 AND ps.innings_pitched >= 100 AND ps.year >= 1920
          GROUP BY p.full_name, p.player_id
          ORDER BY RANDOM()`,
  },
  {
    name: 'MVP Award Winners',
    difficulty: 'hard',
    sql: `SELECT DISTINCT p.full_name, p.player_id, COUNT(*)::text || 'x MVP' AS stat_value
          FROM awards a JOIN players p ON p.player_id = a.player_id
          WHERE a.award_name = 'Most Valuable Player'
          GROUP BY p.full_name, p.player_id
          ORDER BY RANDOM()`,
  },
  {
    name: '100+ RBI Seasons (8+ Times)',
    difficulty: 'hard',
    sql: `SELECT p.full_name, p.player_id, COUNT(*)::text || ' seasons' AS stat_value
          FROM batting_seasons b JOIN players p ON p.player_id = b.player_id
          WHERE b.rbi >= 100
          GROUP BY p.full_name, p.player_id
          HAVING COUNT(*) >= 8
          ORDER BY RANDOM()`,
  },

  // === TRICKY ===
  {
    name: 'Hit 40+ HR But Never Won MVP',
    difficulty: 'tricky',
    sql: `SELECT DISTINCT p.full_name, p.player_id, MAX(b.home_runs)::text || ' HR' AS stat_value
          FROM batting_seasons b
          JOIN players p ON p.player_id = b.player_id
          LEFT JOIN awards a ON a.player_id = p.player_id AND a.award_name = 'Most Valuable Player'
          WHERE b.home_runs >= 40 AND a.id IS NULL
          GROUP BY p.full_name, p.player_id
          ORDER BY RANDOM()`,
  },
  {
    name: 'Cy Young Winners Who Had a 20-Loss Season',
    difficulty: 'tricky',
    sql: `SELECT DISTINCT p.full_name, p.player_id, 'CY + ' || MAX(ps.losses) || 'L season' AS stat_value
          FROM awards a
          JOIN players p ON p.player_id = a.player_id
          JOIN pitching_seasons ps ON ps.player_id = p.player_id AND ps.losses >= 20
          WHERE a.award_name = 'Cy Young Award'
          GROUP BY p.full_name, p.player_id
          ORDER BY RANDOM()`,
  },
  {
    name: 'Stole 50+ Bases in a Season But Had Sub-.300 AVG',
    difficulty: 'tricky',
    sql: `SELECT DISTINCT p.full_name, p.player_id, (b.stolen_bases || ' SB / ' || b.batting_avg || ' AVG') AS stat_value
          FROM batting_seasons b JOIN players p ON p.player_id = b.player_id
          WHERE b.stolen_bases >= 50 AND b.batting_avg < 0.300 AND b.at_bats >= 400
          ORDER BY RANDOM()`,
  },
  {
    name: '300+ Career HR as a Shortstop',
    difficulty: 'tricky',
    sql: `SELECT p.full_name, p.player_id, cs.total_home_runs::text || ' HR' AS stat_value
          FROM career_stats cs
          JOIN players p ON p.player_id = cs.player_id
          WHERE cs.total_home_runs >= 300 AND p.primary_position IN ('SS', '6')
          ORDER BY RANDOM()`,
  },
  {
    name: 'Led League in Strikeouts (Batting) & Home Runs Same Year',
    difficulty: 'tricky',
    sql: `SELECT DISTINCT p.full_name, p.player_id, (b.home_runs || ' HR / ' || b.strikeouts || ' K') AS stat_value
          FROM batting_seasons b
          JOIN players p ON p.player_id = b.player_id
          WHERE b.home_runs >= 40 AND b.strikeouts >= 150 AND b.year >= 1950
          ORDER BY RANDOM()`,
  },
  {
    name: 'Switch Hitters with 400+ Career HR',
    difficulty: 'tricky',
    sql: `SELECT p.full_name, p.player_id, cs.total_home_runs::text || ' HR' AS stat_value
          FROM career_stats cs
          JOIN players p ON p.player_id = cs.player_id
          WHERE cs.total_home_runs >= 400 AND p.bats = 'S'
          ORDER BY RANDOM()`,
  },
];

async function generatePuzzle(puzzleDate: string): Promise<void> {
  // Pick one category per difficulty, ensuring no player overlap
  const usedPlayerIds = new Set<number>();
  const selectedCategories: {
    template: CategoryTemplate;
    players: { full_name: string; player_id: number; stat_value: string }[];
  }[] = [];

  const difficulties: ('easy' | 'medium' | 'hard' | 'tricky')[] = [
    'easy',
    'medium',
    'hard',
    'tricky',
  ];

  for (const diff of difficulties) {
    const candidates = CATEGORY_POOL.filter((c) => c.difficulty === diff);
    // Shuffle candidates
    const shuffled = candidates.sort(() => Math.random() - 0.5);

    let found = false;
    for (const template of shuffled) {
      const result = await query(template.sql);
      // Filter out already-used players
      const available = result.rows.filter(
        (r: { player_id: number }) => !usedPlayerIds.has(r.player_id)
      );

      if (available.length >= 4) {
        const picked = available.slice(0, 4);
        picked.forEach((p: { player_id: number }) => usedPlayerIds.add(p.player_id));
        selectedCategories.push({ template, players: picked });
        found = true;
        break;
      }
    }

    if (!found) {
      console.warn(`  Could not find a valid ${diff} category with 4 unique players. Skipping.`);
      return;
    }
  }

  // Insert puzzle
  const puzzleResult = await query(
    `INSERT INTO puzzles (puzzle_date, title) VALUES ($1, $2) RETURNING puzzle_id`,
    [puzzleDate, `MLB Connections - ${puzzleDate}`]
  );
  const puzzleId = puzzleResult.rows[0].puzzle_id;

  for (let i = 0; i < selectedCategories.length; i++) {
    const { template, players } = selectedCategories[i];

    const catResult = await query(
      `INSERT INTO puzzle_categories (puzzle_id, name, difficulty, stat_query, sort_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING category_id`,
      [puzzleId, template.name, template.difficulty, template.sql, i]
    );
    const categoryId = catResult.rows[0].category_id;

    for (const player of players) {
      // Use last name as the word (more puzzle-like)
      const displayName = player.full_name.split(' ').pop()?.toUpperCase() || player.full_name.toUpperCase();

      await query(
        `INSERT INTO puzzle_words (category_id, word, player_id, stat_value)
         VALUES ($1, $2, $3, $4)`,
        [categoryId, displayName, player.player_id, player.stat_value]
      );
    }
  }

  console.log(`  Puzzle #${puzzleId} created for ${puzzleDate}`);
  for (const cat of selectedCategories) {
    const names = cat.players.map((p) => p.full_name).join(', ');
    console.log(`    [${cat.template.difficulty}] ${cat.template.name}: ${names}`);
  }
}

async function main(): Promise<void> {
  console.log('=== Puzzle Generator ===');

  // Generate puzzles for the next 7 days
  const today = new Date();
  const numPuzzles = parseInt(process.argv[2] || '7', 10);

  for (let i = 0; i < numPuzzles; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    // Check if puzzle already exists
    const existing = await query(
      'SELECT puzzle_id FROM puzzles WHERE puzzle_date = $1',
      [dateStr]
    );
    if (existing.rows.length > 0) {
      console.log(`  Puzzle for ${dateStr} already exists, skipping.`);
      continue;
    }

    console.log(`\nGenerating puzzle for ${dateStr}...`);
    await generatePuzzle(dateStr);
  }

  console.log('\n=== Generation complete! ===');
  await pool.end();
}

main();
