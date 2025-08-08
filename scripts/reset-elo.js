require('dotenv').config({ path: '.env' })

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function resetEloScores() {
  const client = await pool.connect()
  try {
    console.log('Resetting all ELO scores and stats...')
    
    // Reset all models to default values
    await client.query(`
      UPDATE models 
      SET 
        elo_score = 1000,
        wins = 0,
        losses = 0,
        ties = 0
      WHERE enabled = true
    `)
    
    // Clear all votes to start fresh
    await client.query('DELETE FROM votes')
    
    console.log('✅ Reset complete!')
    console.log('- All models reset to ELO 1000')
    console.log('- All win/loss/tie counts reset to 0')
    console.log('- All votes cleared')
    console.log('')
    console.log('You can now test the ELO system with fresh data.')
    
  } catch (error) {
    console.error('Error resetting ELO scores:', error)
  } finally {
    client.release()
  }
}

resetEloScores()
  .then(() => {
    console.log('Script completed.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

