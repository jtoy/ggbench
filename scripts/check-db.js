require('dotenv').config({ path: '.env' })

const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function checkDatabase() {
  const client = await pool.connect()
  try {
    console.log('Checking database...')
    
    // Check if users table exists and has admin user
    const usersResult = await client.query('SELECT id, username, is_admin FROM users')
    console.log('Users in database:', usersResult.rows)
    
    // Check if models table exists and has models
    const modelsResult = await client.query('SELECT id, name, api_type FROM models')
    console.log('Models in database:', modelsResult.rows)
    
    // Check if prompts table exists and has prompts
    const promptsResult = await client.query('SELECT id, text FROM prompts')
    console.log('Prompts in database:', promptsResult.rows)
    
    // If no admin user exists, create one
    const adminUser = usersResult.rows.find(user => user.username === 'admin')
    if (!adminUser) {
      console.log('Creating admin user...')
      const adminPassword = await bcrypt.hash('admin123', 12)
      await client.query(`
        INSERT INTO users (username, password, is_admin) 
        VALUES ($1, $2, $3)
      `, ['admin', adminPassword, true])
      console.log('Admin user created: admin/admin123')
    } else {
      console.log('Admin user already exists')
    }
    
  } catch (error) {
    console.error('Error checking database:', error)
  } finally {
    client.release()
  }
}

checkDatabase()
  .then(() => {
    console.log('Database check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Database check failed:', error)
    process.exit(1)
  }) 