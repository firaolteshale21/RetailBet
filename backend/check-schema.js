import { query } from './src/db.js';

async function checkSchema() {
  console.log('🔍 Checking Database Schema...\n');

  try {
    // Check bet_selections table structure
    console.log('📋 bet_selections table columns:');
    const betSelectionsColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bet_selections' 
      ORDER BY ordinal_position
    `);
    
    betSelectionsColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });

    console.log('\n📋 bet_slips table columns:');
    const betSlipsColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bet_slips' 
      ORDER BY ordinal_position
    `);
    
    betSlipsColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });

    console.log('\n✅ Schema check completed!');

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the check
checkSchema();

