require('dotenv').config({ path: '.env' })

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function addApiEndpointColumn() {
  const client = await pool.connect()
  try {
    console.log('Adding api_endpoint column to models table...')
    
    // Check if the column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'models' AND column_name = 'api_endpoint'
    `)
    
    if (checkResult.rows.length === 0) {
      // Add the api_endpoint column
      await client.query(`
        ALTER TABLE models 
        ADD COLUMN api_endpoint TEXT
      `)
      console.log('api_endpoint column added successfully')
    } else {
      console.log('api_endpoint column already exists')
    }
    
    console.log('Migration completed successfully!')
    
  } catch (error) {
    console.error('Error adding api_endpoint column:', error)
    throw error
  } finally {
    client.release()
  }
}

addApiEndpointColumn()
  .then(() => {
    console.log('Migration completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  }) 