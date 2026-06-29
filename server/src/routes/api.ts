import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// GET /api/puzzles — list all puzzles
router.get('/puzzles', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT puzzle_id, puzzle_date, title, created_at
       FROM puzzles WHERE is_active = true
       ORDER BY puzzle_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching puzzles:', err);
    res.status(500).json({ error: 'Failed to fetch puzzles' });
  }
});

// GET /api/puzzles/today — get today's puzzle
router.get('/puzzles/today', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const puzzleResult = await query(
      `SELECT puzzle_id, puzzle_date, title
       FROM puzzles
       WHERE puzzle_date <= $1 AND is_active = true
       ORDER BY puzzle_date DESC LIMIT 1`,
      [today]
    );

    if (puzzleResult.rows.length === 0) {
      res.status(404).json({ error: 'No puzzle available for today' });
      return;
    }

    const puzzle = puzzleResult.rows[0];
    const categories = await getPuzzleCategories(puzzle.puzzle_id);

    res.json({
      id: puzzle.puzzle_id,
      date: puzzle.puzzle_date,
      title: puzzle.title,
      categories,
    });
  } catch (err) {
    console.error('Error fetching today puzzle:', err);
    res.status(500).json({ error: 'Failed to fetch puzzle' });
  }
});

// GET /api/puzzles/:id — get a specific puzzle
router.get('/puzzles/:id', async (req: Request, res: Response) => {
  try {
    const puzzleId = parseInt(req.params.id, 10);
    if (isNaN(puzzleId)) {
      res.status(400).json({ error: 'Invalid puzzle ID' });
      return;
    }

    const puzzleResult = await query(
      `SELECT puzzle_id, puzzle_date, title
       FROM puzzles WHERE puzzle_id = $1 AND is_active = true`,
      [puzzleId]
    );

    if (puzzleResult.rows.length === 0) {
      res.status(404).json({ error: 'Puzzle not found' });
      return;
    }

    const puzzle = puzzleResult.rows[0];
    const categories = await getPuzzleCategories(puzzle.puzzle_id);

    res.json({
      id: puzzle.puzzle_id,
      date: puzzle.puzzle_date,
      title: puzzle.title,
      categories,
    });
  } catch (err) {
    console.error('Error fetching puzzle:', err);
    res.status(500).json({ error: 'Failed to fetch puzzle' });
  }
});

// GET /api/stats/leaders — get stat leaders for display
router.get('/stats/leaders', async (req: Request, res: Response) => {
  try {
    const stat = req.query.stat as string || 'home_runs';
    const year = req.query.year as string;
    const limit = Math.min(parseInt(req.query.limit as string || '10', 10), 50);

    const allowedStats = [
      'home_runs', 'stolen_bases', 'hits', 'rbi', 'batting_avg',
      'walks', 'runs', 'doubles', 'triples', 'strikeouts',
    ];

    if (!allowedStats.includes(stat)) {
      res.status(400).json({ error: 'Invalid stat parameter' });
      return;
    }

    let sql: string;
    let params: unknown[];

    if (year) {
      sql = `SELECT p.full_name, b.${stat} as value, b.year, b.team
             FROM batting_seasons b JOIN players p ON p.player_id = b.player_id
             WHERE b.year = $1 AND b.at_bats >= 100
             ORDER BY b.${stat} DESC NULLS LAST LIMIT $2`;
      params = [parseInt(year, 10), limit];
    } else {
      sql = `SELECT p.full_name, cs.total_${stat.replace('batting_', '')} as value
             FROM career_stats cs JOIN players p ON p.player_id = cs.player_id
             ORDER BY cs.total_${stat.replace('batting_', '')} DESC NULLS LAST LIMIT $1`;
      params = [limit];
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leaders:', err);
    res.status(500).json({ error: 'Failed to fetch leaders' });
  }
});

async function getPuzzleCategories(puzzleId: number) {
  const catResult = await query(
    `SELECT category_id, name, difficulty, sort_order
     FROM puzzle_categories
     WHERE puzzle_id = $1
     ORDER BY sort_order`,
    [puzzleId]
  );

  const categories = [];
  for (const cat of catResult.rows) {
    const wordsResult = await query(
      `SELECT word, stat_value
       FROM puzzle_words
       WHERE category_id = $1`,
      [cat.category_id]
    );

    categories.push({
      name: cat.name,
      difficulty: cat.difficulty,
      words: wordsResult.rows.map((w: { word: string }) => w.word),
      stats: wordsResult.rows.map((w: { word: string; stat_value: string }) => ({
        word: w.word,
        value: w.stat_value,
      })),
    });
  }

  return categories;
}

export default router;
