import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const MLB_API = process.env.MLB_API_BASE || 'https://statsapi.mlb.com/api/v1';

// ----- Types -----

interface PlayerStat {
  name: string;
  playerId: number;
  value: string;
  numValue: number;
}

interface CategoryTemplate {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'tricky';
  fetch: () => Promise<PlayerStat[]>;
  minPlayers?: number; // default 4
}

interface PuzzleCategory {
  name: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'tricky';
  words: string[];
}

interface Puzzle {
  id: number;
  date: string;
  categories: PuzzleCategory[];
}

// ----- API helpers -----

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function getSeasonBattingLeaders(
  stat: string,
  season: number,
  limit = 50
): Promise<any[]> {
  const url = `${MLB_API}/stats/leaders?leaderCategories=${stat}&season=${season}&sportId=1&limit=${limit}`;
  const data = await fetchJson(url);
  return data.leagueLeaders?.[0]?.leaders ?? [];
}

async function getCareerBattingLeaders(
  stat: string,
  limit = 50
): Promise<any[]> {
  const url = `${MLB_API}/stats/leaders?leaderCategories=${stat}&statType=career&sportId=1&limit=${limit}`;
  const data = await fetchJson(url);
  return data.leagueLeaders?.[0]?.leaders ?? [];
}

async function getSeasonPitchingLeaders(
  stat: string,
  season: number,
  limit = 50
): Promise<any[]> {
  const url = `${MLB_API}/stats/leaders?leaderCategories=${stat}&season=${season}&sportId=1&limit=${limit}`;
  const data = await fetchJson(url);
  return data.leagueLeaders?.[0]?.leaders ?? [];
}

async function getCareerPitchingLeaders(
  stat: string,
  limit = 50
): Promise<any[]> {
  const url = `${MLB_API}/stats/leaders?leaderCategories=${stat}&statType=career&sportId=1&limit=${limit}`;
  const data = await fetchJson(url);
  return data.leagueLeaders?.[0]?.leaders ?? [];
}

function leaderToStat(leader: any, suffix = ''): PlayerStat {
  const name: string = leader.person?.fullName ?? 'Unknown';
  return {
    name,
    playerId: leader.person?.id ?? 0,
    value: `${leader.value}${suffix}`,
    numValue: parseFloat(leader.value) || 0,
  };
}

function displayName(fullName: string): string {
  return fullName.trim().toUpperCase();
}

// ----- Category templates -----
// Each template is a function that queries the MLB API and returns qualifying players
// VERIFIED WORKING categories only:
//   Career batting: homeRuns, runsBattedIn, doubles
//   Season batting: homeRuns, runsBattedIn, doubles, extraBaseHits, onBasePlusSlugging
//   Career pitching: wins, strikeouts, saves
//   Season pitching: earnedRunAverage, wins, saves, strikeouts, walksAndHitsPerInningPitched

function buildTemplates(): CategoryTemplate[] {
  const currentYear = new Date().getFullYear();

  return [
    // ===== EASY (well-known all-time stats) =====
    {
      name: '500+ Career Home Runs',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('homeRuns', 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 500)
          .map((l: any) => leaderToStat(l, ' HR'));
      },
    },
    {
      name: '400+ Career Home Runs',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('homeRuns', 50);
        return leaders
          .filter((l: any) => {
            const v = parseFloat(l.value);
            return v >= 400 && v < 500;
          })
          .map((l: any) => leaderToStat(l, ' HR'));
      },
    },
    {
      name: '2,000+ Career RBI',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('runsBattedIn', 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 2000)
          .map((l: any) => leaderToStat(l, ' RBI'));
      },
    },
    {
      name: '1,500+ Career RBI',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('runsBattedIn', 50);
        return leaders
          .filter((l: any) => {
            const v = parseFloat(l.value);
            return v >= 1500 && v < 2000;
          })
          .map((l: any) => leaderToStat(l, ' RBI'));
      },
    },
    {
      name: '600+ Career Doubles',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('doubles', 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 600)
          .map((l: any) => leaderToStat(l, ' 2B'));
      },
    },

    // ===== MEDIUM (recent season stats + career pitching) =====
    {
      name: `45+ Home Runs in ${currentYear - 1}`,
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('homeRuns', currentYear - 1, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 45)
          .map((l: any) => leaderToStat(l, ' HR'));
      },
    },
    {
      name: `40+ Home Runs in ${currentYear - 2}`,
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('homeRuns', currentYear - 2, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 40)
          .map((l: any) => leaderToStat(l, ' HR'));
      },
    },
    {
      name: `100+ RBI in ${currentYear - 1}`,
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('runsBattedIn', currentYear - 1, 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 100)
          .map((l: any) => leaderToStat(l, ' RBI'));
      },
    },
    {
      name: `40+ Doubles in ${currentYear - 1}`,
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('doubles', currentYear - 1, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 40)
          .map((l: any) => leaderToStat(l, ' 2B'));
      },
    },
    {
      name: '300+ Career Wins (Pitchers)',
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getCareerPitchingLeaders('wins', 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 300)
          .map((l: any) => leaderToStat(l, ' W'));
      },
    },
    {
      name: `15+ Wins (Pitching) in ${currentYear - 1}`,
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('wins', currentYear - 1, 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 15)
          .map((l: any) => leaderToStat(l, ' W'));
      },
    },
    {
      name: `80+ Extra-Base Hits in ${currentYear - 1}`,
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('extraBaseHits', currentYear - 1, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 80)
          .map((l: any) => leaderToStat(l, ' XBH'));
      },
    },

    // ===== HARD =====
    {
      name: `ERA Under 2.50 in ${currentYear - 1}`,
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('earnedRunAverage', currentYear - 1, 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) <= 2.5 && parseFloat(l.value) > 0)
          .map((l: any) => leaderToStat(l, ' ERA'));
      },
    },
    {
      name: '3,000+ Career Strikeouts (Pitchers)',
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getCareerPitchingLeaders('strikeouts', 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 3000)
          .map((l: any) => leaderToStat(l, ' K'));
      },
    },
    {
      name: `30+ Saves in ${currentYear - 1}`,
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('saves', currentYear - 1, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 30)
          .map((l: any) => leaderToStat(l, ' SV'));
      },
    },
    {
      name: `OPS Over 1.000 in ${currentYear - 1}`,
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('onBasePlusSlugging', currentYear - 1, 15);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 1.0)
          .map((l: any) => leaderToStat(l, ' OPS'));
      },
    },
    {
      name: `250+ Strikeouts (Pitching) in ${currentYear - 1}`,
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('strikeouts', currentYear - 1, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 250)
          .map((l: any) => leaderToStat(l, ' K'));
      },
    },
    {
      name: `35+ Home Runs in ${currentYear - 3}`,
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('homeRuns', currentYear - 3, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 35)
          .map((l: any) => leaderToStat(l, ' HR'));
      },
    },

    // ===== TRICKY =====
    {
      name: `200+ Strikeouts (Pitching) in ${currentYear - 1}`,
      difficulty: 'tricky',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('strikeouts', currentYear - 1, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 200)
          .map((l: any) => leaderToStat(l, ' K'));
      },
    },
    {
      name: `WHIP Under 1.00 in ${currentYear - 1}`,
      difficulty: 'tricky',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('walksAndHitsPerInningPitched', currentYear - 1, 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) < 1.0 && parseFloat(l.value) > 0)
          .map((l: any) => leaderToStat(l, ' WHIP'));
      },
    },
    {
      name: '500+ Career Saves',
      difficulty: 'tricky',
      fetch: async () => {
        const leaders = await getCareerPitchingLeaders('saves', 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 500)
          .map((l: any) => leaderToStat(l, ' SV'));
      },
    },
    {
      name: '500+ Career Doubles',
      difficulty: 'tricky',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('doubles', 50);
        return leaders
          .filter((l: any) => {
            const v = parseFloat(l.value);
            return v >= 500 && v < 600;
          })
          .map((l: any) => leaderToStat(l, ' 2B'));
      },
    },
    {
      name: `OPS Over .950 in ${currentYear - 2}`,
      difficulty: 'tricky',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('onBasePlusSlugging', currentYear - 2, 15);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 0.95)
          .map((l: any) => leaderToStat(l, ' OPS'));
      },
    },
    {
      name: `120+ RBI in ${currentYear - 2}`,
      difficulty: 'tricky',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('runsBattedIn', currentYear - 2, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 120)
          .map((l: any) => leaderToStat(l, ' RBI'));
      },
    },
  ];
}

// ----- Puzzle generation -----

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function tryBuildCategory(
  template: CategoryTemplate,
  usedNames: Set<string>
): Promise<{ cat: PuzzleCategory; players: PlayerStat[] } | null> {
  try {
    const players = await template.fetch();
    // Filter out duplicates (same last name already used)
    const available = players.filter((p) => !usedNames.has(displayName(p.name)));

    if (available.length < (template.minPlayers ?? 4)) return null;

    const picked = shuffle(available).slice(0, 4);
    return {
      cat: {
        name: template.name,
        difficulty: template.difficulty,
        words: picked.map((p) => displayName(p.name)),
      },
      players: picked,
    };
  } catch (err) {
    console.warn(`  ⚠ Skipping "${template.name}": ${(err as Error).message}`);
    return null;
  }
}

async function generatePuzzle(id: number, dateStr: string): Promise<Puzzle | null> {
  const templates = buildTemplates();
  const difficulties: ('easy' | 'medium' | 'hard' | 'tricky')[] = [
    'easy', 'medium', 'hard', 'tricky',
  ];

  const usedNames = new Set<string>();
  const categories: PuzzleCategory[] = [];

  for (const diff of difficulties) {
    const candidates = shuffle(templates.filter((t) => t.difficulty === diff));
    let found = false;

    for (const template of candidates) {
      const result = await tryBuildCategory(template, usedNames);
      if (result) {
        result.players.forEach((p) => usedNames.add(displayName(p.name)));
        categories.push(result.cat);
        console.log(
          `  [${diff}] ${template.name}: ${result.players.map((p) => p.name).join(', ')}`
        );
        found = true;
        break;
      }
    }

    if (!found) {
      console.warn(`  ✗ Could not find a valid ${diff} category. Puzzle incomplete.`);
      return null;
    }
  }

  return { id, date: dateStr, categories };
}

// ----- Main -----

async function main(): Promise<void> {
  console.log('=== MLB Connections Puzzle Generator (API-only) ===\n');

  const numPuzzles = parseInt(process.argv[2] || '7', 10);
  const puzzles: Puzzle[] = [];
  const today = new Date();

  for (let i = 0; i < numPuzzles; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().slice(0, 10);

    console.log(`\nGenerating puzzle #${i + 1} for ${dateStr}...`);
    const puzzle = await generatePuzzle(i + 1, dateStr);
    if (puzzle) {
      puzzles.push(puzzle);
    }
  }

  // Write to Angular public assets
  const outDir = path.resolve(__dirname, '../../public/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'puzzles.json');
  fs.writeFileSync(outPath, JSON.stringify(puzzles, null, 2));

  console.log(`\n✓ Generated ${puzzles.length} puzzles → ${outPath}`);
  console.log('  Run "ng serve" and the app will load these automatically.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
