const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ggbench',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
})

async function setupDatabase() {
  const client = await pool.connect()
  try {
    console.log('Setting up database...')
    
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT FALSE
      )
    `)
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS models (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        api_type TEXT NOT NULL,
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
      )
    `)
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL UNIQUE,
        tags TEXT[] NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS animations (
        id SERIAL PRIMARY KEY,
        model_id INTEGER NOT NULL,
        prompt_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (model_id) REFERENCES models(id),
        FOREIGN KEY (prompt_id) REFERENCES prompts(id)
      )
    `)
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        animation_a_id INTEGER NOT NULL,
        animation_b_id INTEGER NOT NULL,
        winner TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (animation_a_id) REFERENCES animations(id),
        FOREIGN KEY (animation_b_id) REFERENCES animations(id)
      )
    `)
    
    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_animations_model_id ON animations(model_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_animations_prompt_id ON animations(prompt_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_votes_animation_a_id ON votes(animation_a_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_votes_animation_b_id ON votes(animation_b_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_models_enabled ON models(enabled)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_models_elo_score ON models(elo_score)')
    
    console.log('Tables created successfully')
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12)
    await client.query(`
      INSERT INTO users (username, password, is_admin) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (username) DO NOTHING
    `, ['admin', adminPassword, true])
    
    console.log('Admin user created:')
    console.log('Username: admin')
    console.log('Password: admin123')
    
    // Add some sample prompts
    await client.query(`
      INSERT INTO prompts (text, tags) VALUES 
      ('Create a futuristic cityscape with flying cars and neon lights', ARRAY['cityscape', 'futuristic', 'neon']),
      ('Generate a peaceful forest scene with animated trees and wildlife', ARRAY['nature', 'forest', 'wildlife']),
      ('Design an abstract geometric pattern with flowing colors', ARRAY['abstract', 'geometric', 'colorful']),
      ('Create a sci-fi robot character with glowing eyes', ARRAY['character', 'robot', 'scifi']),
      ('Generate a cosmic space scene with stars and planets', ARRAY['space', 'cosmic', 'stars'])
      ON CONFLICT (text) DO NOTHING
    `)
    
    console.log('Sample prompts added')
    
    console.log('Database setup completed successfully!')
    
  } catch (error) {
    console.error('Error setting up database:', error)
    throw error
  } finally {
    client.release()
  }
}

setupDatabase()
  .then(() => {
    console.log('Setup completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Setup failed:', error)
    process.exit(1)
  }) 