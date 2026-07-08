import fs from 'fs';
import path from 'path';

// ESPN public NFL stats API (free, no auth). Follows the exact same
// data-driven pattern as generate-from-api.ts (MLB): fetch stat leaders,
// filter by threshold, build 4-player groups. NO hardcoded player names.
const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';

// ----- Types (mirror MLB generator) -----

type Difficulty = 'easy' | 'medium' | 'hard' | 'tricky';

interface PlayerStat {
  name: string;
  playerId: number;
  value: string;
  numValue: number;
}

interface CategoryTemplate {
  name: string;
  difficulty: Difficulty;
  fetch: () => Promise<PlayerStat[]>;
  minPlayers?: number;
}

interface PuzzleCategory {
  name: string;
  difficulty: Difficulty;
  words: string[];
}

interface Puzzle {
  id: number;
  date: string;
  sport: 'nfl';
  season?: number;
  categories: PuzzleCategory[];
}

interface BuiltCategory {
  cat: PuzzleCategory;
  players: PlayerStat[];
  eligibleKeys: Set<string>;
  pickedKeys: Set<string>;
}

// ----- File I/O paths -----

const OUT_DIR = path.resolve(__dirname, '../../public/data');
const OUT_PATH = path.join(OUT_DIR, 'nfl-puzzles.json');

// ----- API helpers -----

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

// Cache: `${season}:${category}` -> raw leaders array from ESPN
const leadersCache = new Map<string, any[]>();
// Cache: athleteId -> displayName
const athleteCache = new Map<number, string>();

async function getSeasonLeaders(
  season: number,
  category: string,
  limit = 50
): Promise<any[]> {
  const key = `${season}:${category}`;
  const cached = leadersCache.get(key);
  if (cached) return cached;

  const url = `${ESPN_CORE}/seasons/${season}/types/2/leaders?limit=${limit}`;
  const data = await fetchJson(url);
  const categories: any[] = data.categories ?? [];

  // Cache every category returned so we don't refetch the same season endpoint.
  for (const c of categories) {
    leadersCache.set(`${season}:${c.name}`, c.leaders ?? []);
  }

  return leadersCache.get(key) ?? [];
}

function athleteIdFromRef(ref: string): number {
  const match = ref.match(/athletes\/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

async function resolveAthleteName(id: number): Promise<string | null> {
  if (id <= 0) return null;
  const cached = athleteCache.get(id);
  if (cached) return cached;
  try {
    const data = await fetchJson(
      `${ESPN_CORE}/athletes/${id}?lang=en&region=us`
    );
    const name: string =
      data.displayName || data.fullName || data.shortName || '';
    if (!name) return null;
    athleteCache.set(id, name);
    return name;
  } catch {
    return null;
  }
}

// Resolve a batch of athlete IDs to names with limited concurrency.
async function resolveAthletes(ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  const unique = Array.from(new Set(ids)).filter((id) => id > 0);
  const CONCURRENCY = 6;

  let i = 0;
  async function worker() {
    while (i < unique.length) {
      const id = unique[i++];
      const name = await resolveAthleteName(id);
      if (name) out.set(id, name);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return out;
}

// Convert filtered leaders into PlayerStat[], resolving names via cache.
async function leadersToStats(
  leaders: any[],
  valueSuffix: string
): Promise<PlayerStat[]> {
  const withIds = leaders
    .map((l: any) => {
      const ref: string = l.athlete?.$ref ?? l.athlete?.ref ?? '';
      const id = athleteIdFromRef(ref);
      const rawNum =
        typeof l.value === 'number' ? l.value : parseFloat(l.value);
      const displayValue = l.displayValue ?? String(l.value ?? '');
      return { id, rawNum, displayValue };
    })
    .filter((x) => x.id > 0);

  const nameMap = await resolveAthletes(withIds.map((x) => x.id));

  return withIds
    .map((x) => {
      const name = nameMap.get(x.id);
      if (!name) return null;
      return {
        name,
        playerId: x.id,
        value: `${x.displayValue}${valueSuffix}`,
        numValue: x.rawNum,
      } as PlayerStat;
    })
    .filter((p): p is PlayerStat => p !== null);
}

// Fetch a stat category, filter by numeric threshold, and return
// resolved PlayerStat[] with a value suffix.
async function statCategory(
  season: number,
  category: string,
  predicate: (numValue: number) => boolean,
  suffix: string
): Promise<PlayerStat[]> {
  const leaders = await getSeasonLeaders(season, category);
  const filtered = leaders.filter((l: any) => {
    const v = typeof l.value === 'number' ? l.value : parseFloat(l.value);
    return Number.isFinite(v) && predicate(v);
  });
  return leadersToStats(filtered, suffix);
}

// ----- Utility helpers (mirror MLB generator) -----

function displayName(fullName: string): string {
  return fullName.trim().toUpperCase();
}

function playerKey(player: PlayerStat): string {
  return player.playerId > 0
    ? `id:${player.playerId}`
    : `name:${displayName(player.name)}`;
}

function dedupePlayers(players: PlayerStat[]): PlayerStat[] {
  const seen = new Set<string>();
  const unique: PlayerStat[] = [];
  for (const p of players) {
    const key = playerKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return unique;
}

function randomSeason(min = 2005, max = new Date().getFullYear() - 1): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ----- Category templates (all data-driven, threshold-based) -----

function buildTemplates(season: number): CategoryTemplate[] {
  return [
    // ===== EASY — broadly known season milestones =====
    {
      name: `3,500+ Passing Yards in ${season}`,
      difficulty: 'easy',
      fetch: () =>
        statCategory(season, 'passingYards', (v) => v >= 3500, ' YDS'),
    },
    {
      name: `1,000+ Rushing Yards in ${season}`,
      difficulty: 'easy',
      fetch: () =>
        statCategory(season, 'rushingYards', (v) => v >= 1000, ' YDS'),
    },
    {
      name: `1,000+ Receiving Yards in ${season}`,
      difficulty: 'easy',
      fetch: () =>
        statCategory(season, 'receivingYards', (v) => v >= 1000, ' YDS'),
    },
    {
      name: `80+ Receptions in ${season}`,
      difficulty: 'easy',
      fetch: () => statCategory(season, 'receptions', (v) => v >= 80, ' REC'),
    },
    {
      name: `20+ Passing TDs in ${season}`,
      difficulty: 'easy',
      fetch: () =>
        statCategory(season, 'passingTouchdowns', (v) => v >= 20, ' TD'),
    },

    // ===== MEDIUM — top-tier season production =====
    {
      name: `4,000+ Passing Yards in ${season}`,
      difficulty: 'medium',
      fetch: () =>
        statCategory(season, 'passingYards', (v) => v >= 4000, ' YDS'),
    },
    {
      name: `1,200+ Rushing Yards in ${season}`,
      difficulty: 'medium',
      fetch: () =>
        statCategory(season, 'rushingYards', (v) => v >= 1200, ' YDS'),
    },
    {
      name: `1,200+ Receiving Yards in ${season}`,
      difficulty: 'medium',
      fetch: () =>
        statCategory(season, 'receivingYards', (v) => v >= 1200, ' YDS'),
    },
    {
      name: `100+ Total Tackles in ${season}`,
      difficulty: 'medium',
      fetch: () =>
        statCategory(season, 'totalTackles', (v) => v >= 100, ' TCK'),
    },
    {
      name: `8+ Rushing TDs in ${season}`,
      difficulty: 'medium',
      fetch: () =>
        statCategory(season, 'rushingTouchdowns', (v) => v >= 8, ' TD'),
    },
    {
      name: `8+ Receiving TDs in ${season}`,
      difficulty: 'medium',
      fetch: () =>
        statCategory(season, 'receivingTouchdowns', (v) => v >= 8, ' TD'),
    },

    // ===== HARD — elite marks, narrower pools =====
    {
      name: `30+ Passing TDs in ${season}`,
      difficulty: 'hard',
      fetch: () =>
        statCategory(season, 'passingTouchdowns', (v) => v >= 30, ' TD'),
    },
    {
      name: `10+ Sacks in ${season}`,
      difficulty: 'hard',
      fetch: () => statCategory(season, 'sacks', (v) => v >= 10, ' SACK'),
    },
    {
      name: `5+ Interceptions in ${season}`,
      difficulty: 'hard',
      fetch: () =>
        statCategory(season, 'interceptions', (v) => v >= 5, ' INT'),
    },
    {
      name: `12+ Rushing TDs in ${season}`,
      difficulty: 'hard',
      fetch: () =>
        statCategory(season, 'rushingTouchdowns', (v) => v >= 12, ' TD'),
    },
    {
      name: `12+ Receiving TDs in ${season}`,
      difficulty: 'hard',
      fetch: () =>
        statCategory(season, 'receivingTouchdowns', (v) => v >= 12, ' TD'),
    },
    {
      name: `4,500+ Passing Yards in ${season}`,
      difficulty: 'hard',
      fetch: () =>
        statCategory(season, 'passingYards', (v) => v >= 4500, ' YDS'),
    },
    {
      name: `1,400+ Rushing Yards in ${season}`,
      difficulty: 'hard',
      fetch: () =>
        statCategory(season, 'rushingYards', (v) => v >= 1400, ' YDS'),
    },
    {
      name: `1,400+ Receiving Yards in ${season}`,
      difficulty: 'hard',
      fetch: () =>
        statCategory(season, 'receivingYards', (v) => v >= 1400, ' YDS'),
    },
    {
      name: `100+ Receptions in ${season}`,
      difficulty: 'hard',
      fetch: () =>
        statCategory(season, 'receptions', (v) => v >= 100, ' REC'),
    },

    // ===== TRICKY — rare / elite achievements =====
    {
      name: `5,000+ Passing Yards in ${season}`,
      difficulty: 'tricky',
      fetch: () =>
        statCategory(season, 'passingYards', (v) => v >= 5000, ' YDS'),
    },
    {
      name: `1,600+ Rushing Yards in ${season}`,
      difficulty: 'tricky',
      fetch: () =>
        statCategory(season, 'rushingYards', (v) => v >= 1600, ' YDS'),
    },
    {
      name: `1,600+ Receiving Yards in ${season}`,
      difficulty: 'tricky',
      fetch: () =>
        statCategory(season, 'receivingYards', (v) => v >= 1600, ' YDS'),
    },
    {
      name: `15+ Sacks in ${season}`,
      difficulty: 'tricky',
      fetch: () => statCategory(season, 'sacks', (v) => v >= 15, ' SACK'),
    },
    {
      name: `40+ Passing TDs in ${season}`,
      difficulty: 'tricky',
      fetch: () =>
        statCategory(season, 'passingTouchdowns', (v) => v >= 40, ' TD'),
    },
    {
      name: `15+ Rushing TDs in ${season}`,
      difficulty: 'tricky',
      fetch: () =>
        statCategory(season, 'rushingTouchdowns', (v) => v >= 15, ' TD'),
    },
    {
      name: `120+ Receptions in ${season}`,
      difficulty: 'tricky',
      fetch: () =>
        statCategory(season, 'receptions', (v) => v >= 120, ' REC'),
    },
    {
      name: `130+ Total Tackles in ${season}`,
      difficulty: 'tricky',
      fetch: () =>
        statCategory(season, 'totalTackles', (v) => v >= 130, ' TCK'),
    },
  ];
}

// ----- Puzzle generation (mirrors MLB generator) -----

async function tryBuildCategory(
  template: CategoryTemplate,
  usedNames: Set<string>,
  existing: BuiltCategory[]
): Promise<BuiltCategory | null> {
  try {
    const players = dedupePlayers(await template.fetch());
    const available = players.filter(
      (p) => !usedNames.has(displayName(p.name))
    );

    if (available.length < (template.minPlayers ?? 4)) return null;

    const eligibleKeys = new Set(players.map((p) => playerKey(p)));
    const attempts = Math.min(12, Math.max(4, available.length * 2));

    for (let attempt = 0; attempt < attempts; attempt++) {
      const picked = shuffle(available).slice(0, 4);
      const pickedKeys = new Set(picked.map((p) => playerKey(p)));

      if (pickedKeys.size < 4) continue;

      const isConfusingOverlap = existing.some((other) => {
        const pickedFitsOther = picked.filter((p) =>
          other.eligibleKeys.has(playerKey(p))
        ).length;
        const otherFitsPicked = other.players.filter((p) =>
          eligibleKeys.has(playerKey(p))
        ).length;
        return pickedFitsOther === 4 || otherFitsPicked === 4;
      });

      if (isConfusingOverlap) continue;

      return {
        cat: {
          name: template.name,
          difficulty: template.difficulty,
          words: picked.map((p) => displayName(p.name)),
        },
        players: picked,
        eligibleKeys,
        pickedKeys,
      };
    }

    return null;
  } catch (err) {
    console.warn(`  ⚠ Skipping "${template.name}": ${(err as Error).message}`);
    return null;
  }
}

async function generatePuzzle(
  id: number,
  dateStr: string
): Promise<Puzzle | null> {
  const season = randomSeason();
  console.log(`  Featured season: ${season}`);
  const templates = buildTemplates(season);
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'tricky'];

  const usedNames = new Set<string>();
  const builtCategories: BuiltCategory[] = [];
  const categories: PuzzleCategory[] = [];

  for (const diff of difficulties) {
    const candidates = shuffle(templates.filter((t) => t.difficulty === diff));
    let found = false;

    for (const template of candidates) {
      const result = await tryBuildCategory(
        template,
        usedNames,
        builtCategories
      );
      if (result) {
        result.players.forEach((p) => usedNames.add(displayName(p.name)));
        builtCategories.push(result);
        categories.push(result.cat);
        console.log(
          `  [${diff}] ${template.name}: ${result.players
            .map((p) => p.name)
            .join(', ')}`
        );
        found = true;
        break;
      }
    }

    if (!found) {
      console.warn(
        `  ✗ Could not find a valid ${diff} category. Puzzle incomplete.`
      );
      return null;
    }
  }

  return { id, date: dateStr, sport: 'nfl', season, categories };
}

// ----- File I/O -----

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
  puzzles.sort((a, b) => a.date.localeCompare(b.date));
  fs.writeFileSync(OUT_PATH, JSON.stringify(puzzles, null, 2));
}

// ----- Main -----

async function main(): Promise<void> {
  const isAppend = process.argv.includes('--append');
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (isAppend) {
    console.log('=== NFL Connections Puzzle Generator (append) ===\n');
    const catalog = readCatalog();

    if (catalog.some((p) => p.date === todayStr)) {
      console.log(`Puzzle for ${todayStr} already exists. Nothing to do.`);
      return;
    }

    const nextId =
      catalog.reduce((max, p) => Math.max(max, p.id ?? 0), 0) + 1;
    console.log(`Generating puzzle #${nextId} for ${todayStr}...`);

    // Retry across a few different seasons if the first attempt can't
    // assemble four non-overlapping categories.
    let puzzle: Puzzle | null = null;
    for (let attempt = 0; attempt < 5 && !puzzle; attempt++) {
      puzzle = await generatePuzzle(nextId, todayStr);
    }

    if (puzzle) {
      catalog.push(puzzle);
      writeCatalog(catalog);
      console.log(
        `\n✓ Appended puzzle #${nextId} (${todayStr}) → ${OUT_PATH}`
      );
      console.log(`  Catalog now has ${catalog.length} puzzles.`);
    } else {
      console.error('✗ Failed to generate a valid puzzle for today.');
      process.exit(1);
    }
  } else {
    console.log('=== NFL Connections Puzzle Generator (batch) ===\n');
    const numPuzzles = parseInt(process.argv[2] || '7', 10);
    const puzzles: Puzzle[] = [];
    const today = new Date();

    for (let i = 0; i < numPuzzles; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (numPuzzles - 1 - i));
      const dateStr = date.toISOString().slice(0, 10);

      console.log(`\nGenerating puzzle #${i + 1} for ${dateStr}...`);
      let puzzle: Puzzle | null = null;
      for (let attempt = 0; attempt < 5 && !puzzle; attempt++) {
        puzzle = await generatePuzzle(i + 1, dateStr);
      }
      if (puzzle) puzzles.push(puzzle);
    }

    writeCatalog(puzzles);
    console.log(`\n✓ Generated ${puzzles.length} puzzles → ${OUT_PATH}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
