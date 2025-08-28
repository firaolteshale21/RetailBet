import { pool, query } from './src/db.js';
import { logger } from './src/logger.js';

console.log('🚀 Starting simple database test...');

async function simpleTest() {
  try {
    console.log('📊 Testing database connection...');
    
    // Test 1: Simple query
    const result = await query('SELECT COUNT(*) as count FROM events');
    console.log(`✅ Found ${result.rows[0].count} events in database`);
    
    // Test 2: Check bet slip tables
    const betSlipsCount = await query('SELECT COUNT(*) as count FROM bet_slips');
    console.log(`✅ Found ${betSlipsCount.rows[0].count} bet slips in database`);
    
    // Test 3: Check bet selections
    const betSelectionsCount = await query('SELECT COUNT(*) as count FROM bet_selections');
    console.log(`✅ Found ${betSelectionsCount.rows[0].count} bet selections in database`);
    
    // Test 4: Check game results
    const gameResultsCount = await query('SELECT COUNT(*) as count FROM game_results');
    console.log(`✅ Found ${gameResultsCount.rows[0].count} game results in database`);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

simpleTest();
