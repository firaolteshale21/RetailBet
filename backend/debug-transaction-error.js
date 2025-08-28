import { handleBooking } from './src/booking-endpoint.js';

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

// Sample bet object that might be causing the issue
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
    }
  ],
  "GlobalSingleStake": 25,
  "CustomerId": "test_customer_456",
  "ShopId": "test_shop_789"
};

async function debugTransactionError() {
  console.log('🔍 Debugging transaction error...\n');

  try {
    console.log('🎯 Testing bet placement with detailed error logging...');
    console.log('=' .repeat(60));
    
    const req = createMockRequest(sampleBet);
    const res = createMockResponse();
    
    await handleBooking(req, res);
    
  } catch (error) {
    console.error('❌ Full error details:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Check if it's a database error
    if (error.code) {
      console.error('Database error code:', error.code);
    }
    if (error.detail) {
      console.error('Database error detail:', error.detail);
    }
    if (error.hint) {
      console.error('Database error hint:', error.hint);
    }
    if (error.where) {
      console.error('Database error where:', error.where);
    }
  }
}

// Run the debug
debugTransactionError();

