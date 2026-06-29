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
  season?: number;
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

/** Fetch award recipients — optionally filtered by season */
async function getAwardRecipients(
  awardId: string,
  season?: number
): Promise<PlayerStat[]> {
  const seasonParam = season ? `?season=${season}` : '';
  const url = `${MLB_API}/awards/${awardId}/recipients${seasonParam}`;
  const data = await fetchJson(url);
  const awards: any[] = data.awards ?? [];
  return awards.map((a: any) => ({
    name: a.player?.nameFirstLast ?? 'Unknown',
    playerId: a.player?.id ?? 0,
    value: a.season ?? '',
    numValue: parseInt(a.season) || 0,
  }));
}

/** Combine AL + NL award recipients for a given season */
async function getCombinedAwardRecipients(
  alAwardId: string,
  nlAwardId: string,
  season?: number
): Promise<PlayerStat[]> {
  const [al, nl] = await Promise.all([
    getAwardRecipients(alAwardId, season),
    getAwardRecipients(nlAwardId, season),
  ]);
  return [...al, ...nl];
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

/** Pick a random year from a range */
function randomSeason(min = 2000, max = 2025): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ----- Category templates -----
// VERIFIED WORKING stat categories:
//   Career batting: homeRuns, runsBattedIn, doubles
//   Season batting: homeRuns, runsBattedIn, doubles, extraBaseHits, onBasePlusSlugging
//   Career pitching: wins, strikeouts, saves
//   Season pitching: earnedRunAverage, wins, saves, strikeouts, walksAndHitsPerInningPitched
//
// Awards API IDs used:
//   ALGG/NLGG = Gold Glove,  ALSS/NLSS = Silver Slugger,
//   ALMVP/NLMVP = MVP,  ALCY/NLCY = Cy Young,
//   WSMVP = World Series MVP,  MLBHOF = Hall of Fame,
//   ALAS/NLAS = All-Star,  ALROY/NLROY = Rookie of the Year

function buildTemplates(season: number): CategoryTemplate[] {
  return [
    // ===== EASY — well-known career milestones =====
    {
      name: '500+ Career Home Runs',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('homeRuns', 50);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 500)
          .map((l: any) => leaderToStat(l, ' HR'));
      },
    },
    {
      name: '400-499 Career Home Runs',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('homeRuns', 50);
        return leaders
          .filter((l: any) => { const v = parseFloat(l.value); return v >= 400 && v < 500; })
          .map((l: any) => leaderToStat(l, ' HR'));
      },
    },
    {
      name: '300-399 Career Home Runs',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('homeRuns', 50);
        return leaders
          .filter((l: any) => { const v = parseFloat(l.value); return v >= 300 && v < 400; })
          .map((l: any) => leaderToStat(l, ' HR'));
      },
    },
    {
      name: '1,500+ Career RBI',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('runsBattedIn', 50);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 1500)
          .map((l: any) => leaderToStat(l, ' RBI'));
      },
    },
    {
      name: '1,000–1,499 Career RBI',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('runsBattedIn', 50);
        return leaders
          .filter((l: any) => { const v = parseFloat(l.value); return v >= 1000 && v < 1500; })
          .map((l: any) => leaderToStat(l, ' RBI'));
      },
    },
    {
      name: '500+ Career Doubles',
      difficulty: 'easy',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('doubles', 50);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 500)
          .map((l: any) => leaderToStat(l, ' 2B'));
      },
    },
    {
      name: 'Hall of Famers',
      difficulty: 'easy',
      fetch: async () => getAwardRecipients('MLBHOF'),
    },

    // ===== MEDIUM — season stats (uses puzzle year) + moderate career =====
    {
      name: `35+ Home Runs in ${season}`,
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('homeRuns', season, 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 35)
          .map((l: any) => leaderToStat(l, ' HR'));
      },
    },
    {
      name: `100+ RBI in ${season}`,
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('runsBattedIn', season, 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 100)
          .map((l: any) => leaderToStat(l, ' RBI'));
      },
    },
    {
      name: `40+ Doubles in ${season}`,
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('doubles', season, 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 40)
          .map((l: any) => leaderToStat(l, ' 2B'));
      },
    },
    {
      name: `70+ Extra-Base Hits in ${season}`,
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('extraBaseHits', season, 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 70)
          .map((l: any) => leaderToStat(l, ' XBH'));
      },
    },
    {
      name: '250-299 Career Wins (Pitchers)',
      difficulty: 'medium',
      fetch: async () => {
        const leaders = await getCareerPitchingLeaders('wins', 50);
        return leaders
          .filter((l: any) => { const v = parseFloat(l.value); return v >= 250 && v < 300; })
          .map((l: any) => leaderToStat(l, ' W'));
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
      name: `Gold Glove Winners in ${season}`,
      difficulty: 'medium',
      fetch: async () => getCombinedAwardRecipients('ALGG', 'NLGG', season),
    },
    {
      name: `Silver Slugger Winners in ${season}`,
      difficulty: 'medium',
      fetch: async () => getCombinedAwardRecipients('ALSS', 'NLSS', season),
    },

    // ===== HARD — tighter season stats + niche career + awards =====
    {
      name: `ERA Under 3.00 in ${season}`,
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('earnedRunAverage', season, 30);
        return leaders
          .filter((l: any) => { const v = parseFloat(l.value); return v > 0 && v < 3.0; })
          .map((l: any) => leaderToStat(l, ' ERA'));
      },
    },
    {
      name: `200+ Strikeouts (Pitching) in ${season}`,
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('strikeouts', season, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 200)
          .map((l: any) => leaderToStat(l, ' K'));
      },
    },
    {
      name: `15+ Wins (Pitching) in ${season}`,
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('wins', season, 30);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 15)
          .map((l: any) => leaderToStat(l, ' W'));
      },
    },
    {
      name: `OPS Over .900 in ${season}`,
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('onBasePlusSlugging', season, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 0.9)
          .map((l: any) => leaderToStat(l, ' OPS'));
      },
    },
    {
      name: `30+ Saves in ${season}`,
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('saves', season, 20);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 30)
          .map((l: any) => leaderToStat(l, ' SV'));
      },
    },
    {
      name: '2,500+ Career Strikeouts (Pitchers)',
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getCareerPitchingLeaders('strikeouts', 50);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 2500)
          .map((l: any) => leaderToStat(l, ' K'));
      },
    },
    {
      name: '300+ Career Saves',
      difficulty: 'hard',
      fetch: async () => {
        const leaders = await getCareerPitchingLeaders('saves', 50);
        return leaders
          .filter((l: any) => { const v = parseFloat(l.value); return v >= 300; })
          .map((l: any) => leaderToStat(l, ' SV'));
      },
    },
    {
      name: 'Won AL or NL MVP',
      difficulty: 'hard',
      fetch: async () => getCombinedAwardRecipients('ALMVP', 'NLMVP'),
    },
    {
      name: 'Won Cy Young Award',
      difficulty: 'hard',
      fetch: async () => getCombinedAwardRecipients('ALCY', 'NLCY'),
    },

    // ===== TRICKY — very specific / deceptive =====
    {
      name: `WHIP Under 1.10 in ${season}`,
      difficulty: 'tricky',
      fetch: async () => {
        const leaders = await getSeasonPitchingLeaders('walksAndHitsPerInningPitched', season, 30);
        return leaders
          .filter((l: any) => { const v = parseFloat(l.value); return v > 0 && v < 1.10; })
          .map((l: any) => leaderToStat(l, ' WHIP'));
      },
    },
    {
      name: `40+ Home Runs in ${season}`,
      difficulty: 'tricky',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('homeRuns', season, 15);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 40)
          .map((l: any) => leaderToStat(l, ' HR'));
      },
    },
    {
      name: `120+ RBI in ${season}`,
      difficulty: 'tricky',
      fetch: async () => {
        const leaders = await getSeasonBattingLeaders('runsBattedIn', season, 15);
        return leaders
          .filter((l: any) => parseFloat(l.value) >= 120)
          .map((l: any) => leaderToStat(l, ' RBI'));
      },
    },
    {
      name: '350-499 Career Doubles',
      difficulty: 'tricky',
      fetch: async () => {
        const leaders = await getCareerBattingLeaders('doubles', 50);
        return leaders
          .filter((l: any) => { const v = parseFloat(l.value); return v >= 350 && v < 500; })
          .map((l: any) => leaderToStat(l, ' 2B'));
      },
    },
    {
      name: 'World Series MVP',
      difficulty: 'tricky',
      fetch: async () => getAwardRecipients('WSMVP'),
    },
    {
      name: 'Won Rookie of the Year',
      difficulty: 'tricky',
      fetch: async () => getCombinedAwardRecipients('ALROY', 'NLROY'),
    },
    {
      name: `All-Star in ${season}`,
      difficulty: 'tricky',
      fetch: async () => getCombinedAwardRecipients('ALAS', 'NLAS', season),
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
  const season = randomSeason(2000, new Date().getFullYear());
  console.log(`  Featured season: ${season}`);
  const templates = buildTemplates(season);
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

  return { id, date: dateStr, season, categories };
}

// ----- File I/O helpers -----

const OUT_DIR = path.resolve(__dirname, '../../public/data');
const OUT_PATH = path.join(OUT_DIR, 'puzzles.json');

function readCatalog(): Puzzle[] {
  if (!fs.existsSync(OUT_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(OUT_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeCatalog(puzzles: Puzzle[]): void {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  // Sort by date ascending
  puzzles.sort((a, b) => a.date.localeCompare(b.date));
  fs.writeFileSync(OUT_PATH, JSON.stringify(puzzles, null, 2));
}

// ----- Main -----

async function main(): Promise<void> {
  const isAppend = process.argv.includes('--append');

  if (isAppend) {
    // === DAILY MODE: append one puzzle for today ===
    console.log('=== MLB Connections — Daily Puzzle Generation ===\n');

    const catalog = readCatalog();
    const todayStr = new Date().toISOString().slice(0, 10);

    const existing = catalog.find((p) => p.date === todayStr);
    if (existing) {
      console.log(`Puzzle for ${todayStr} already exists (id=${existing.id}). Skipping.`);
      return;
    }

    const nextId = catalog.length > 0
      ? Math.max(...catalog.map((p) => p.id)) + 1
      : 1;

    console.log(`Generating puzzle #${nextId} for ${todayStr}...`);
    const puzzle = await generatePuzzle(nextId, todayStr);

    if (puzzle) {
      catalog.push(puzzle);
      writeCatalog(catalog);
      console.log(`\n✓ Appended puzzle #${nextId} (${todayStr}) → ${OUT_PATH}`);
      console.log(`  Catalog now has ${catalog.length} puzzles.`);
    } else {
      console.error('✗ Failed to generate a valid puzzle for today.');
      process.exit(1);
    }
  } else {
    // === BATCH MODE: generate N puzzles from scratch ===
    console.log('=== MLB Connections Puzzle Generator (batch) ===\n');

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

    writeCatalog(puzzles);
    console.log(`\n✓ Generated ${puzzles.length} puzzles → ${OUT_PATH}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
