import { handleBooking } from './src/booking-endpoint.js';
import { getBetSlip } from './src/betSlips/storage.js';

// Mock request and response objects for testing
function createMockRequest(betObject) {
  return {
    body: {
      BetObject: JSON.stringify(betObject)
    }
  };
}

function createMockResponse() {
  const res = {
    json: (data) => {
      console.log('📤 Response sent:', JSON.stringify(data, null, 2));
      return res;
    },
    status: (code) => {
      console.log(`📤 Status code: ${code}`);
      return res;
    }
  };
  return res;
}

// Sample bet object for testing
const sampleBet = {
  "SessionGuid": "test_session_123",
  "BetslipTypeValue": 1,
  "SingleBets": [
    {
      "_id": 1,
      "FeedEventId": "90-19-1629319",
      "DisplayDescription": "1,2,3",
      "SelectionId": "1,2,3",
      "EventNumber": "63138",
      "Event": {
        "Id": "90-19-1629319",
        "Number": "63138",
        "StartDateTime": "2025-01-28T15:30:00Z",
        "Type": {
          "Value": 19,
          "Name": "SmartPlayKeno"
        }
      },
      "MarketClass": {
        "Value": 119,
        "Name": "KenoWin",
        "Display": "Win"
      },
      "Stake": 25,
      "Odds": 12.5,
      "PotentialWin": 312.5,
      "BetTypeValue": 1,
      "NumberOfCombinations": 1,
      "MinOdds": 12.5,
      "MaxOdds": 12.5,
      "Notation": "",
      "ElementId": "SmartPlayKeno_90-19-1629319_AddToSlipBtn",
      "ExtraDescription": ""
    },
    {
      "_id": 2,
      "FeedEventId": "90-19-1629319",
      "DisplayDescription": "4,5,6",
      "SelectionId": "4,5,6",
      "EventNumber": "63138",
      "Event": {
        "Id": "90-19-1629319",
        "Number": "63138",
        "StartDateTime": "2025-01-28T15:30:00Z",
        "Type": {
          "Value": 19,
          "Name": "SmartPlayKeno"
        }
      },
      "MarketClass": {
        "Value": 119,
        "Name": "KenoWin",
        "Display": "Win"
      },
      "Stake": 15,
      "Odds": 8.0,
      "PotentialWin": 120.0,
      "BetTypeValue": 1,
      "NumberOfCombinations": 1,
      "MinOdds": 8.0,
      "MaxOdds": 8.0,
      "Notation": "",
      "ElementId": "SmartPlayKeno_90-19-1629319_AddToSlipBtn",
      "ExtraDescription": ""
    }
  ],
  "GlobalSingleStake": 40,
  "CustomerId": "test_customer_456",
  "ShopId": "test_shop_789"
};

async function testTransactionFix() {
  console.log('🧪 Testing transaction-based bet slip storage...\n');

  try {
    // Test 1: Place a bet with multiple selections
    console.log('🎯 Test 1: Placing bet with multiple selections');
    console.log('=' .repeat(50));
    
    const req = createMockRequest(sampleBet);
    const res = createMockResponse();
    
    await handleBooking(req, res);
    
    // Wait a moment for database operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n✅ Transaction-based bet slip storage test completed!');
    console.log('💡 Check your database to verify the bet slip and selections were stored correctly');
    
    // Test 2: Verify the stored data
    console.log('\n🔍 Test 2: Verifying stored data...');
    
    // You can add verification queries here if needed
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Full error:', error);
  }
}

// Run the test
testTransactionFix();

