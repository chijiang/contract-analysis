import { initializeDatabase } from '../lib/init-db.js'

async function runInit() {
  try {
    await initializeDatabase()
    console.log('Database initialization completed successfully!')
  } catch (error) {
    console.error('Database initialization failed:', error)
    process.exit(1)
  }
}

runInit()
