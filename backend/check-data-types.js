import { query } from './src/db.js';

async function checkDataTypes() {
  console.log('🔍 Checking for data type issues...\n');

  try {
    // Check bet_slips table structure
    console.log('📋 bet_slips table columns:');
    const betSlipsColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bet_slips' 
      ORDER BY ordinal_position
    `);
    
    betSlipsColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });

    // Check bet_selections table structure
    console.log('\n📋 bet_selections table columns:');
    const betSelectionsColumns = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bet_selections' 
      ORDER BY ordinal_position
    `);
    
    betSelectionsColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });

    // Check for any existing data that might cause conflicts
    console.log('\n📈 Checking existing data...');
    
    const existingSlips = await query('SELECT slip_id, created_at FROM bet_slips ORDER BY created_at DESC LIMIT 5');
    console.log(`   - Recent bet slips: ${existingSlips.rows.length}`);
    existingSlips.rows.forEach(row => {
      console.log(`     * ${row.slip_id} (${row.created_at})`);
    });

    const existingSelections = await query('SELECT slip_id, COUNT(*) as count FROM bet_selections GROUP BY slip_id ORDER BY count DESC LIMIT 5');
    console.log(`   - Recent bet selections: ${existingSelections.rows.length} slip IDs`);
    existingSelections.rows.forEach(row => {
      console.log(`     * ${row.slip_id}: ${row.count} selections`);
    });

    console.log('\n✅ Data type check completed!');

  } catch (error) {
    console.error('❌ Data type check failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the check
checkDataTypes();

