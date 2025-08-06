require('dotenv').config({ path: '.env' })

const { Pool } = require('pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

async function resetAdminPassword() {
  const client = await pool.connect()
  try {
    console.log('Resetting admin password...')
    
    const newPassword = 'admin123'
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update the admin user password
    await client.query(`
      UPDATE users 
      SET password = $1 
      WHERE username = 'admin'
    `, [hashedPassword])
    
    console.log('Admin password reset successfully!')
    console.log('Username: admin')
    console.log('Password: admin123')
    
  } catch (error) {
    console.error('Error resetting admin password:', error)
  } finally {
    client.release()
  }
}

resetAdminPassword()
  .then(() => {
    console.log('Password reset completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Password reset failed:', error)
    process.exit(1)
  }) 