import { handleBooking } from './src/booking-endpoint.js';

// Mock request and response objects for testing
function createMockRequest(betObject) {
  return {
    body: {
      BetObject: JSON.stringify(betObject)  // This is how your frontend sends it
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

// This is the EXACT data structure your frontend is sending
// Based on the captured frontend data
const frontendRequestData = {
  "SessionGuid": "chbera",
  "BetslipTypeValue": 1,
  "SingleBets": [
    {
      "_id": 1,
      "TypeValue": 1,
      "FeedEventId": "90-19-1631885",
      "DisplayDescription": "47,57",
      "SelectionId": "47,57",
      "EventNumber": "63394",
      "Event": {
        "Id": "90-19-1631885",
        "Number": "63394",
        "StartTime": "18:19",
        "StartDateTime": "2025/08/28 18:19:00",
        "type": {
          "allowMultiBet": "False",
          "display": "Keno",
          "displaySingleEvent": "True",
          "eventTypeCategoryEnum": "SmartPlayKeno",
          "isNew": "False",
          "isOnDemand": "False",
          "maxNumberOfPicks": "10",
          "minNumberOfPicks": "1",
          "name": "SmartPlayKeno",
          "value": 19
        }
      },
      "MarketClass": {
        "value": 119,
        "name": "KenoWin",
        "display": "Win"
      },
      "ExtraDescription": "",
      "BetTypeValue": 1,
      "EventStartDateTime": "2025/08/28 18:19:00",
      "EventStartTime": "18:19",
      "EventTypeValue": 19,
      "MarketClassValue": 119,
      "SelectionIds": [
        "47,57"
      ],
      "Stake": 10,
      "Odds": 15,
      "NumberOfCombinations": 1,
      "MinOdds": 15,
      "MaxOdds": 15,
      "MinNotation": "",
      "MaxNotation": "",
      "Notation": "",
      "PickSet": {
        "Picks": [
          {
            "TypeValue": 1,
            "MarketClass": {
              "value": 119,
              "name": "KenoWin",
              "display": "Win"
            },
            "SelectionId": "47",
            "Copied": false
          },
          {
            "TypeValue": 1,
            "MarketClass": {
              "value": 119,
              "name": "KenoWin",
              "display": "Win"
            },
            "SelectionId": "57",
            "Copied": false
          }
        ],
        "DrawNumber": 0,
        "DrawFirstEventId": 0,
        "FeedEventId": "90-19-1631885",
        "Copied": false
      },
      "BettingLayoutValue": "1",
      "ElementId": "SmartPlayKeno_90-19-1631885_AddToSlipBtn",
      "ComboSelections": [],
      "DrawCount": 1,
      "ExecutingFeedId": "1631885"
    }
  ],
  "MultiGroups": [],
  "FromPendingBet": false,
  "RedeemCode": "",
  "RetailerGuid": "",
  "IsSSBTRetailer": false,
  "GlobalSingleStake": "10"
};

async function debugFrontendData() {
  console.log('🔍 Debugging frontend data...\n');

  try {
    console.log('📋 Frontend request data structure:');
    console.log(JSON.stringify(frontendRequestData, null, 2));
    console.log('\n' + '='.repeat(60));
    
    const req = createMockRequest(frontendRequestData);
    const res = createMockResponse();
    
    console.log('🎯 Testing with frontend data...');
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
debugFrontendData();
