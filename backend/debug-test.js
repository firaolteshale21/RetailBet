console.log('🚀 Starting debug test...');

try {
  console.log('📦 Testing imports...');
  const { pool, query } = await import('./src/db.js');
  console.log('✅ Database imports successful');
  
  console.log('🔍 Testing database connection...');
  const result = await query('SELECT COUNT(*) as count FROM events');
  console.log(`✅ Database query successful: ${result.rows[0].count} events found`);
  
  console.log('🎉 Debug test completed successfully!');
  
} catch (error) {
  console.error('❌ Debug test failed:', error.message);
  console.error('Full error:', error);
}
