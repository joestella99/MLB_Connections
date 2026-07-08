import fs from 'fs';
import path from 'path';

type Difficulty = 'easy' | 'medium' | 'hard' | 'tricky';

interface PlayerStat {
  name: string;
  playerId: number;
  value: string;
  numValue: number;
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

interface CategoryTemplate {
  name: string;
  difficulty: Difficulty;
  fetch: (season: number) => PlayerStat[];
  minPlayers?: number;
}

interface BuiltCategory {
  cat: PuzzleCategory;
  players: PlayerStat[];
  eligibleKeys: Set<string>;
}

interface CategoryDataset {
  label: string;
  players: string[];
  season?: number;
}

const OUT_DIR = path.resolve(__dirname, '../../public/data');
const OUT_PATH = path.join(OUT_DIR, 'nfl-puzzles.json');

const AP_MVP_WINNERS = [
  'AARON RODGERS', 'CAM NEWTON', 'LAMAR JACKSON', 'MATT RYAN', 'PATRICK MAHOMES', 'TOM BRADY', 'PEYTON MANNING', 'ADRIAN PETERSON',
];

const HALL_OF_FAME_QBS = [
  'PEYTON MANNING', 'JOHN ELWAY', 'DAN MARINO', 'TROY AIKMAN', 'STEVE YOUNG', 'BRETT FAVRE', 'WARREN MOON', 'JOE MONTANA',
];

const DPOY_WINNERS = [
  'T.J. WATT', 'LUKE KUECHLY', 'AARON DONALD', 'STEPHON GILMORE', 'MICHAEL STRAHAN', 'J.J. WATT', 'CHARLES WOODSON', 'SHAQ LEONARD',
];

const COMEBACK_PLAYERS = [
  'GENO SMITH', 'ALEX SMITH', 'JOE FLACCO', 'CHAD PENNINGTON', 'RYAN TANNEHILL', 'PHILIP RIVERS', 'MATTHEW STAFFORD', 'RANDALL CUNNINGHAM',
];

const SUPER_BOWL_MVPS = [
  'PATRICK MAHOMES', 'COOPER KUPP', 'JULIAN EDELMAN', 'JOE FLACCO', 'VON MILLER', 'DREW BREES', 'AARON RODGERS', 'SANTONIO HOLMES',
];

const OROY_WINNERS = [
  'C.J. STROUD', 'JA\'MARR CHASE', 'DAK PRESCOTT', 'PERCY HARVIN', 'SAQUON BARKLEY', 'ODELL BECKHAM JR.', 'ANQUAN BOLDIN', 'CAM NEWTON',
];

const ROOKIE_QBS = [
  'C.J. STROUD', 'JUSTIN HERBERT', 'ANDREW LUCK', 'DAK PRESCOTT', 'CAM NEWTON', 'RUSSELL WILSON', 'ROBERT GRIFFIN III', 'MATT RYAN',
];

const TWO_THOUSAND_RUSHERS = [
  'ERIC DICKERSON', 'BARRY SANDERS', 'ADRIAN PETERSON', 'DERRICK HENRY', 'JAMAL LEWIS', 'CHRIS JOHNSON', 'TERRELL DAVIS', 'O.J. SIMPSON',
];

const PASS_5000_SEASON = [
  'PEYTON MANNING', 'DREW BREES', 'TOM BRADY', 'PATRICK MAHOMES', 'JAMEIS WINSTON', 'JUSTIN HERBERT', 'DAN MARINO', 'BEN ROETHLISBERGER',
];

const CATEGORY_DATASETS: Record<string, CategoryDataset[]> = {
  rushing1500: [
    { label: '1,500+ Rushing Yards in 2013', season: 2013, players: ['LESEAN MCCOY', 'MATT FORTE', 'JAMAAL CHARLES', 'MARSHAWN LYNCH', 'ADRIAN PETERSON'] },
    { label: '1,500+ Rushing Yards in 2012', season: 2012, players: ['ADRIAN PETERSON', 'AARIAN FOSTER', 'ALFRED MORRIS', 'DOUG MARTIN', 'MARSHAWN LYNCH'] },
    { label: '1,500+ Rushing Yards in 2022', season: 2022, players: ['JOSH JACOBS', 'DERRICK HENRY', 'NICK CHUBB', 'SAQUON BARKLEY', 'MILES SANDERS'] },
  ],
  receiving1200: [
    { label: '1,200+ Receiving Yards in 2021', season: 2021, players: ['COOPER KUPP', 'JUSTIN JEFFERSON', 'JA\'MARR CHASE', 'DEEBO SAMUEL', 'DAVANTE ADAMS'] },
    { label: '1,200+ Receiving Yards in 2018', season: 2018, players: ['JULIO JONES', 'DEANDRE HOPKINS', 'MICHAEL THOMAS', 'TYREEK HILL', 'DAVANTE ADAMS'] },
    { label: '1,200+ Receiving Yards in 2015', season: 2015, players: ['JULIO JONES', 'ANTONIO BROWN', 'DEANDRE HOPKINS', 'ALLEN ROBINSON', 'ODELL BECKHAM JR.'] },
  ],
  sacks15: [
    { label: '15+ Sacks in 2021', season: 2021, players: ['T.J. WATT', 'ROBERT QUINN', 'MYLES GARRETT', 'TREY HENDRICKSON', 'NICK BOSA'] },
    { label: '15+ Sacks in 2018', season: 2018, players: ['AARON DONALD', 'J.J. WATT', 'DEE FORD', 'CHANDLER JONES', 'DANIELLE HUNTER'] },
    { label: '15+ Sacks in 2014', season: 2014, players: ['J.J. WATT', 'JUSTIN HOUSTON', 'ELVIS DUMERVIL', 'MUHAMMAD WILKERSON', 'CAMERON WAKE'] },
  ],
  tdReceptions10: [
    { label: '10+ Receiving TDs in 2007', season: 2007, players: ['RANDY MOSS', 'TERRELL OWENS', 'T.J. HOUSHMANDZADEH', 'PLAXICO BURRESS', 'GREG JENNINGS'] },
    { label: '10+ Receiving TDs in 2020', season: 2020, players: ['DAVANTE ADAMS', 'TYREEK HILL', 'ADAM THIELEN', 'MIKE EVANS', 'TRAVIS KELCE'] },
    { label: '10+ Receiving TDs in 2014', season: 2014, players: ['DEZ BRYANT', 'JORDY NELSON', 'ANTONIO BROWN', 'DEMARYIUS THOMAS', 'ROBB GRONKOWSKI'] },
  ],
};

function displayName(fullName: string): string {
  return fullName.trim().toUpperCase();
}

function playerKey(player: PlayerStat): string {
  return player.playerId > 0 ? `id:${player.playerId}` : `name:${displayName(player.name)}`;
}

function toPlayerStats(players: string[], value: string): PlayerStat[] {
  return players.map((name) => ({ name, playerId: 0, value, numValue: 0 }));
}

function randomSeason(min = 2007, max = 2023): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function findSeasonDataset(key: keyof typeof CATEGORY_DATASETS, season: number): CategoryDataset {
  const exact = CATEGORY_DATASETS[key].find((dataset) => dataset.season === season);
  return exact ?? CATEGORY_DATASETS[key][season % CATEGORY_DATASETS[key].length];
}

function buildTemplates(season: number): CategoryTemplate[] {
  const rushing = findSeasonDataset('rushing1500', season);
  const receiving = findSeasonDataset('receiving1200', season);
  const sacks = findSeasonDataset('sacks15', season);
  const touchdowns = findSeasonDataset('tdReceptions10', season);

  return [
    {
      name: 'AP NFL MVP Winners',
      difficulty: 'easy',
      fetch: () => toPlayerStats(AP_MVP_WINNERS, 'MVP'),
    },
    {
      name: 'Hall of Fame Quarterbacks',
      difficulty: 'easy',
      fetch: () => toPlayerStats(HALL_OF_FAME_QBS, 'HOF'),
    },
    {
      name: 'Defensive Player of the Year Winners',
      difficulty: 'easy',
      fetch: () => toPlayerStats(DPOY_WINNERS, 'DPOY'),
    },
    {
      name: rushing.label,
      difficulty: 'medium',
      fetch: () => toPlayerStats(rushing.players, `${season}`),
    },
    {
      name: receiving.label,
      difficulty: 'medium',
      fetch: () => toPlayerStats(receiving.players, `${season}`),
    },
    {
      name: 'Offensive Rookie of the Year Winners',
      difficulty: 'medium',
      fetch: () => toPlayerStats(OROY_WINNERS, 'OROY'),
    },
    {
      name: '5,000+ Passing Yards in a Season',
      difficulty: 'hard',
      fetch: () => toPlayerStats(PASS_5000_SEASON, '5000+ pass yds'),
    },
    {
      name: '2,000-Yard Rush Seasons',
      difficulty: 'hard',
      fetch: () => toPlayerStats(TWO_THOUSAND_RUSHERS, '2000 rush yds'),
    },
    {
      name: 'Comeback Player of the Year Winners',
      difficulty: 'hard',
      fetch: () => toPlayerStats(COMEBACK_PLAYERS, 'CPOY'),
    },
    {
      name: sacks.label,
      difficulty: 'tricky',
      fetch: () => toPlayerStats(sacks.players, `${season}`),
    },
    {
      name: touchdowns.label,
      difficulty: 'tricky',
      fetch: () => toPlayerStats(touchdowns.players, `${season}`),
    },
    {
      name: 'Notable Rookie Quarterbacks',
      difficulty: 'tricky',
      fetch: () => toPlayerStats(ROOKIE_QBS, 'rookie QB'),
    },
    {
      name: 'Super Bowl MVP Winners',
      difficulty: 'tricky',
      fetch: () => toPlayerStats(SUPER_BOWL_MVPS, 'SB MVP'),
    },
  ];
}

async function tryBuildCategory(
  template: CategoryTemplate,
  usedNames: Set<string>,
  existing: BuiltCategory[]
): Promise<BuiltCategory | null> {
  const players = template.fetch(0).filter((player, index, all) =>
    all.findIndex((candidate) => displayName(candidate.name) === displayName(player.name)) === index
  );
  const available = players.filter((player) => !usedNames.has(displayName(player.name)));

  if (available.length < (template.minPlayers ?? 4)) return null;

  const eligibleKeys = new Set(players.map((player) => playerKey(player)));
  const attempts = Math.min(10, Math.max(4, available.length * 2));

  for (let attempt = 0; attempt < attempts; attempt++) {
    const picked = shuffle(available).slice(0, 4);

    const isConfusingOverlap = existing.some((other) => {
      const pickedFitsOther = picked.filter((player) => other.eligibleKeys.has(playerKey(player))).length;
      const otherFitsPicked = other.players.filter((player) => eligibleKeys.has(playerKey(player))).length;
      return pickedFitsOther === 4 || otherFitsPicked === 4;
    });

    if (isConfusingOverlap) continue;

    return {
      cat: {
        name: template.name,
        difficulty: template.difficulty,
        words: picked.map((player) => displayName(player.name)),
      },
      players: picked,
      eligibleKeys,
    };
  }

  return null;
}

async function generatePuzzle(id: number, dateStr: string): Promise<Puzzle | null> {
  const season = randomSeason();
  const templates = buildTemplates(season).map((template) => ({
    ...template,
    fetch: () => template.fetch(season),
  }));
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'tricky'];

  const usedNames = new Set<string>();
  const builtCategories: BuiltCategory[] = [];
  const categories: PuzzleCategory[] = [];

  for (const difficulty of difficulties) {
    const candidates = shuffle(templates.filter((template) => template.difficulty === difficulty));
    let found = false;

    for (const template of candidates) {
      const result = await tryBuildCategory(template, usedNames, builtCategories);
      if (!result) continue;

      result.players.forEach((player) => usedNames.add(displayName(player.name)));
      builtCategories.push(result);
      categories.push(result.cat);
      found = true;
      break;
    }

    if (!found) return null;
  }

  return {
    id,
    date: dateStr,
    sport: 'nfl',
    season,
    categories,
  };
}

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

async function main(): Promise<void> {
  const isAppend = process.argv.includes('--append');

  if (isAppend) {
    const catalog = readCatalog();
    const todayStr = new Date().toISOString().slice(0, 10);
    const existing = catalog.find((p) => p.date === todayStr);
    if (existing) return;

    const nextId = catalog.length > 0 ? Math.max(...catalog.map((p) => p.id)) + 1 : 1;
    const puzzle = await generatePuzzle(nextId, todayStr);

    if (!puzzle) {
      throw new Error('Failed to generate NFL puzzle');
    }

    catalog.push(puzzle);
    writeCatalog(catalog);
    return;
  }

  const numPuzzles = parseInt(process.argv[2] || '7', 10);
  const puzzles: Puzzle[] = [];
  const today = new Date();

  for (let i = 0; i < numPuzzles; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (numPuzzles - 1 - i));
    const dateStr = date.toISOString().slice(0, 10);
    const puzzle = await generatePuzzle(i + 1, dateStr);
    if (puzzle) puzzles.push(puzzle);
  }

  writeCatalog(puzzles);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
