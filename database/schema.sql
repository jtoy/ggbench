-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE
);

-- LLM models table
CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    api_type TEXT NOT NULL, -- OpenAI, Anthropic, Google, etc.
    api_endpoint TEXT NOT NULL,
    api_key TEXT NOT NULL,
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    additional_headers JSONB DEFAULT '{}',
    elo_score INTEGER NOT NULL DEFAULT 1000,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    ties INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Prompts table
CREATE TABLE prompts (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL UNIQUE,
    tags TEXT[] NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Animations table
CREATE TABLE animations (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL,
    prompt_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (model_id) REFERENCES models(id),
    FOREIGN KEY (prompt_id) REFERENCES prompts(id)
);

-- Votes table
CREATE TABLE votes (
    id SERIAL PRIMARY KEY,
    animation_a_id INTEGER NOT NULL,
    animation_b_id INTEGER NOT NULL,
    winner TEXT NOT NULL, -- "A", "B", or "TIE"
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (animation_a_id) REFERENCES animations(id),
    FOREIGN KEY (animation_b_id) REFERENCES animations(id)
);

-- Optional: Add indexes for better performance
CREATE INDEX idx_animations_model_id ON animations(model_id);
CREATE INDEX idx_animations_prompt_id ON animations(prompt_id);
CREATE INDEX idx_votes_animation_a_id ON votes(animation_a_id);
CREATE INDEX idx_votes_animation_b_id ON votes(animation_b_id);
CREATE INDEX idx_votes_created_at ON votes(created_at);
CREATE INDEX idx_models_enabled ON models(enabled);
CREATE INDEX idx_models_elo_score ON models(elo_score); 