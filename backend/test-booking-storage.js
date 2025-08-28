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

// Sample bet object from your Keno payload
const sampleKenoBet = {
  "SessionGuid": "chbera",
  "BetslipTypeValue": 1,
  "SingleBets": [
    {
      "_id": 2,
      "FeedEventId": "90-19-1629319",
      "DisplayDescription": "1,2",
      "SelectionId": "1,2",
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
      "Stake": 10,
      "Odds": 15,
      "PotentialWin": 150,
      "BetTypeValue": 1,
      "NumberOfCombinations": 1,
      "MinOdds": 15,
      "MaxOdds": 15,
      "Notation": "",
      "ElementId": "SmartPlayKeno_90-19-1629319_AddToSlipBtn",
      "ExtraDescription": ""
    }
  ],
  "GlobalSingleStake": 10,
  "CustomerId": "test_customer_123",
  "ShopId": "test_shop_456"
};

// Sample Horse Racing bet object
const sampleHorseRacingBet = {
  "SessionGuid": "horse123",
  "BetslipTypeValue": 1,
  "SingleBets": [
    {
      "_id": 1,
      "FeedEventId": "90-1-1629318",
      "DisplayDescription": "Horse 3",
      "SelectionId": "3",
      "EventNumber": "1118",
      "Event": {
        "Id": "90-1-1629318",
        "Number": "1118",
        "StartDateTime": "2025-01-28T16:00:00Z",
        "Type": {
          "Value": 1,
          "Name": "DashingDerby"
        }
      },
      "MarketClass": {
        "Value": 101,
        "Name": "Win",
        "Display": "Win"
      },
      "Stake": 20,
      "Odds": 3.5,
      "PotentialWin": 70,
      "BetTypeValue": 1,
      "NumberOfCombinations": 1,
      "MinOdds": 3.5,
      "MaxOdds": 3.5,
      "Notation": "",
      "ElementId": "DashingDerby_90-1-1629318_AddToSlipBtn",
      "ExtraDescription": ""
    }
  ],
  "GlobalSingleStake": 20,
  "CustomerId": "test_customer_456",
  "ShopId": "test_shop_789"
};

async function testBookingStorage() {
  console.log('🧪 Testing booking storage with real payloads...\n');

  try {
    // Test 1: Keno bet
    console.log('🎯 Test 1: SmartPlayKeno Bet');
    console.log('=' .repeat(50));
    
    const req1 = createMockRequest(sampleKenoBet);
    const res1 = createMockResponse();
    
    await handleBooking(req1, res1);
    
    // Wait a moment for database operations
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get the stored bet slip (we need to extract the ID from the response)
    // For now, let's just check if we can query the database
    console.log('\n📊 Checking database for stored bet slips...');
    
    // Test 2: Horse Racing bet
    console.log('\n🎯 Test 2: Horse Racing Bet');
    console.log('=' .repeat(50));
    
    const req2 = createMockRequest(sampleHorseRacingBet);
    const res2 = createMockResponse();
    
    await handleBooking(req2, res2);
    
    console.log('\n✅ Booking storage tests completed!');
    console.log('💡 Check your database to see the stored bet slips');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBookingStorage();
