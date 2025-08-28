import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Capture endpoint specifically for complex bets
app.post('/capture-complex', (req, res) => {
  console.log('🔍 CAPTURED COMPLEX BET DATA:');
  console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📋 Body:', JSON.stringify(req.body, null, 2));
  console.log('📋 Body type:', typeof req.body);
  console.log('📋 BetObject type:', typeof req.body.BetObject);
  console.log('📋 BetObject length:', req.body.BetObject ? req.body.BetObject.length : 'null');
  
  // Try to parse the BetObject
  try {
    const parsed = JSON.parse(req.body.BetObject);
    console.log('✅ Parsed successfully!');
    
    // Analyze the bet structure
    console.log('\n📊 BET STRUCTURE ANALYSIS:');
    console.log('📋 SessionGuid:', parsed.SessionGuid);
    console.log('📋 BetslipTypeValue:', parsed.BetslipTypeValue);
    console.log('📋 SingleBets count:', parsed.SingleBets?.length || 0);
    console.log('📋 MultiGroups count:', parsed.MultiGroups?.length || 0);
    
    // Analyze each single bet
    if (parsed.SingleBets && parsed.SingleBets.length > 0) {
      console.log('\n🎯 SINGLE BETS ANALYSIS:');
      parsed.SingleBets.forEach((bet, index) => {
        console.log(`\n--- Bet ${index + 1} ---`);
        console.log('📋 _id:', bet._id);
        console.log('📋 FeedEventId:', bet.FeedEventId);
        console.log('📋 DisplayDescription:', bet.DisplayDescription);
        console.log('📋 SelectionId:', bet.SelectionId);
        console.log('📋 SelectionIds:', bet.SelectionIds);
        console.log('📋 MarketClass:', bet.MarketClass);
        console.log('📋 Stake:', bet.Stake);
        console.log('📋 Odds:', bet.Odds);
        console.log('📋 PotentialWin:', bet.PotentialWin);
        console.log('📋 BetTypeValue:', bet.BetTypeValue);
        console.log('📋 NumberOfCombinations:', bet.NumberOfCombinations);
        console.log('📋 Notation:', bet.Notation);
        console.log('📋 PickSet:', bet.PickSet ? 'Present' : 'Not present');
        console.log('📋 ComboSelections:', bet.ComboSelections ? 'Present' : 'Not present');
        
        // Check for complex bet indicators
        if (bet.NumberOfCombinations > 1) {
          console.log('🎯 COMPLEX BET DETECTED!');
          console.log('📋 Combinations:', bet.NumberOfCombinations);
          console.log('📋 Notation:', bet.Notation);
        }
      });
    }
    
    // Analyze multi groups if present
    if (parsed.MultiGroups && parsed.MultiGroups.length > 0) {
      console.log('\n🎯 MULTI GROUPS ANALYSIS:');
      parsed.MultiGroups.forEach((group, index) => {
        console.log(`\n--- Multi Group ${index + 1} ---`);
        console.log('📋 Group structure:', JSON.stringify(group, null, 2));
      });
    }
    
    console.log('\n✅ Full parsed data:', JSON.stringify(parsed, null, 2));
    
  } catch (parseError) {
    console.log('❌ Parse failed:', parseError.message);
    console.log('❌ Raw BetObject:', req.body.BetObject);
  }
  
  res.json({ captured: true, message: 'Complex bet data captured successfully!' });
});

const PORT = 4002;
app.listen(PORT, () => {
  console.log(`🔍 Complex bet capture server running on port ${PORT}`);
  console.log(`📝 Send your complex bet requests to: http://localhost:${PORT}/capture-complex`);
  console.log(`🎯 Try placing a Quinella, Trio, Exacta, Trifecta, or Swinger bet!`);
});
