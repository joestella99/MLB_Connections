-- MLB Connections Database Schema

-- Players table (merged from Lahman + MLB Stats API)
CREATE TABLE IF NOT EXISTS players (
    player_id SERIAL PRIMARY KEY,
    mlb_id INTEGER UNIQUE,           -- MLB Stats API person ID
    lahman_id VARCHAR(20) UNIQUE,    -- Lahman playerID
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    debut_year INTEGER,
    final_year INTEGER,
    birth_year INTEGER,
    birth_country VARCHAR(100),
    bats VARCHAR(1),                 -- R, L, S
    throws VARCHAR(1),               -- R, L
    primary_position VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Batting season stats
CREATE TABLE IF NOT EXISTS batting_seasons (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(player_id),
    year INTEGER NOT NULL,
    team VARCHAR(10),
    league VARCHAR(5),
    games INTEGER DEFAULT 0,
    at_bats INTEGER DEFAULT 0,
    runs INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    doubles INTEGER DEFAULT 0,
    triples INTEGER DEFAULT 0,
    home_runs INTEGER DEFAULT 0,
    rbi INTEGER DEFAULT 0,
    stolen_bases INTEGER DEFAULT 0,
    caught_stealing INTEGER DEFAULT 0,
    walks INTEGER DEFAULT 0,
    strikeouts INTEGER DEFAULT 0,
    batting_avg NUMERIC(4,3),
    on_base_pct NUMERIC(4,3),
    slugging_pct NUMERIC(4,3),
    ops NUMERIC(4,3),
    UNIQUE(player_id, year, team)
);

-- Pitching season stats
CREATE TABLE IF NOT EXISTS pitching_seasons (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(player_id),
    year INTEGER NOT NULL,
    team VARCHAR(10),
    league VARCHAR(5),
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    era NUMERIC(5,2),
    games INTEGER DEFAULT 0,
    games_started INTEGER DEFAULT 0,
    complete_games INTEGER DEFAULT 0,
    shutouts INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    innings_pitched NUMERIC(6,1),
    hits_allowed INTEGER DEFAULT 0,
    earned_runs INTEGER DEFAULT 0,
    home_runs_allowed INTEGER DEFAULT 0,
    walks INTEGER DEFAULT 0,
    strikeouts INTEGER DEFAULT 0,
    whip NUMERIC(4,2),
    UNIQUE(player_id, year, team)
);

-- Career totals (materialized for fast queries)
CREATE TABLE IF NOT EXISTS career_stats (
    player_id INTEGER PRIMARY KEY REFERENCES players(player_id),
    total_games INTEGER DEFAULT 0,
    total_hits INTEGER DEFAULT 0,
    total_home_runs INTEGER DEFAULT 0,
    total_rbi INTEGER DEFAULT 0,
    total_stolen_bases INTEGER DEFAULT 0,
    total_walks INTEGER DEFAULT 0,
    total_strikeouts_batting INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_saves INTEGER DEFAULT 0,
    total_strikeouts_pitching INTEGER DEFAULT 0,
    career_batting_avg NUMERIC(4,3),
    career_era NUMERIC(5,2),
    all_star_appearances INTEGER DEFAULT 0,
    mvp_awards INTEGER DEFAULT 0,
    cy_young_awards INTEGER DEFAULT 0,
    gold_glove_awards INTEGER DEFAULT 0,
    world_series_rings INTEGER DEFAULT 0
);

-- Awards and achievements
CREATE TABLE IF NOT EXISTS awards (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(player_id),
    year INTEGER NOT NULL,
    award_name VARCHAR(100) NOT NULL,
    league VARCHAR(5),
    UNIQUE(player_id, year, award_name)
);

-- Generated puzzles
CREATE TABLE IF NOT EXISTS puzzles (
    puzzle_id SERIAL PRIMARY KEY,
    puzzle_date DATE UNIQUE,
    title VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Puzzle categories
CREATE TABLE IF NOT EXISTS puzzle_categories (
    category_id SERIAL PRIMARY KEY,
    puzzle_id INTEGER REFERENCES puzzles(puzzle_id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'tricky')),
    stat_query TEXT,  -- the SQL/description used to generate this category
    sort_order INTEGER DEFAULT 0
);

-- Puzzle words (the 4 items in each category)
CREATE TABLE IF NOT EXISTS puzzle_words (
    word_id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES puzzle_categories(category_id) ON DELETE CASCADE,
    word VARCHAR(100) NOT NULL,
    player_id INTEGER REFERENCES players(player_id),
    stat_value TEXT  -- the stat value that qualifies this player (for display/verification)
);

-- Indexes for common queries
CREATE INDEX idx_batting_hr ON batting_seasons(home_runs DESC);
CREATE INDEX idx_batting_sb ON batting_seasons(stolen_bases DESC);
CREATE INDEX idx_batting_avg ON batting_seasons(batting_avg DESC);
CREATE INDEX idx_batting_hits ON batting_seasons(hits DESC);
CREATE INDEX idx_batting_year ON batting_seasons(year);
CREATE INDEX idx_pitching_wins ON pitching_seasons(wins DESC);
CREATE INDEX idx_pitching_ks ON pitching_seasons(strikeouts DESC);
CREATE INDEX idx_pitching_era ON pitching_seasons(era);
CREATE INDEX idx_pitching_saves ON pitching_seasons(saves DESC);
CREATE INDEX idx_awards_name ON awards(award_name);
CREATE INDEX idx_players_name ON players(last_name, first_name);
CREATE INDEX idx_career_hr ON career_stats(total_home_runs DESC);
CREATE INDEX idx_career_hits ON career_stats(total_hits DESC);
