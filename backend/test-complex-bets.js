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

// Test data for different complex bet types
const complexBetTests = [
  {
    name: "ReverseForecast (Quinella)",
    data: {
      "SessionGuid": "chbera",
      "BetslipTypeValue": 1,
      "SingleBets": [{
        "_id": 19,
        "TypeValue": 3,
        "FeedEventId": "12-2-8283445",
        "EventNumber": "2108",
        "Event": {
          "Id": "12-2-8283445",
          "Number": "2108",
          "StartTime": "20:41",
          "StartDateTime": "2025/08/28 20:41:00",
          "type": {
            "allowMultiBet": "True",
            "display": "Greyhound Racing ",
            "displaySingleEvent": "False",
            "eventTypeCategoryEnum": "Race",
            "isNew": "False",
            "isOnDemand": "False",
            "maxNumberOfPicks": "",
            "minNumberOfPicks": "",
            "name": "PlatinumHounds",
            "value": 2
          }
        },
        "MarketClass": {
          "value": 4,
          "name": "ReverseForecast",
          "display": "1st Two Any Order"
        },
        "ExtraDescription": "",
        "BetTypeValue": 3,
        "EventStartDateTime": "2025/08/28 20:41:00",
        "EventStartTime": "20:41",
        "EventTypeValue": 2,
        "MarketClassValue": 4,
        "SelectionIds": ["1,2", "", ""],
        "Stake": 10,
        "Odds": 32,
        "NumberOfCombinations": 1,
        "MinOdds": 32,
        "MaxOdds": 32,
        "MinNotation": "[1-2]",
        "MaxNotation": "[1-2]",
        "Notation": "[1-2]",
        "BettingLayoutValue": "1",
        "ComboSelections": [{
          "Selections": ["1", "2"],
          "Bankers": [],
          "FeedEventId": "12-2-8283445",
          "EventNumber": "2108",
          "EventStartDateTime": "2025/08/28 20:41:00",
          "EventStartTime": "20:41",
          "EventTypeName": "PlatinumHounds",
          "NumberOf2InOrderCombinations": 1,
          "NumberOf2AnyOrderCombinations": 1,
          "NumberOf3InOrderCombinations": 0,
          "NumberOf3AnyOrderCombinations": 0,
          "NumberOfSwingerCombinations": 1,
          "MaxNoOfCombinations": 60
        }],
        "BetCombination": [{
          "Selections": ["1", "2"],
          "Bankers": [],
          "FeedEventId": "12-2-8283445",
          "EventNumber": "2108",
          "EventStartDateTime": "2025/08/28 20:41:00",
          "EventStartTime": "20:41",
          "EventTypeName": "PlatinumHounds",
          "NumberOf2InOrderCombinations": 1,
          "NumberOf2AnyOrderCombinations": 1,
          "NumberOf3InOrderCombinations": 0,
          "NumberOf3AnyOrderCombinations": 0,
          "NumberOfSwingerCombinations": 1,
          "MaxNoOfCombinations": 60
        }],
        "DrawCount": null,
        "ExecutingFeedId": "8283445"
      }],
      "MultiGroups": [],
      "FromPendingBet": false,
      "RedeemCode": "",
      "RetailerGuid": "",
      "IsSSBTRetailer": false,
      "GlobalSingleStake": "10"
    }
  },
  {
    name: "Forecast (Exacta)",
    data: {
      "SessionGuid": "chbera",
      "BetslipTypeValue": 1,
      "SingleBets": [{
        "_id": 20,
        "TypeValue": 3,
        "FeedEventId": "12-2-8283445",
        "EventNumber": "2108",
        "Event": {
          "Id": "12-2-8283445",
          "Number": "2108",
          "StartTime": "20:41",
          "StartDateTime": "2025/08/28 20:41:00",
          "type": {
            "allowMultiBet": "True",
            "display": "Greyhound Racing ",
            "displaySingleEvent": "False",
            "eventTypeCategoryEnum": "Race",
            "isNew": "False",
            "isOnDemand": "False",
            "maxNumberOfPicks": "",
            "minNumberOfPicks": "",
            "name": "PlatinumHounds",
            "value": 2
          }
        },
        "MarketClass": {
          "value": 3,
          "name": "Forecast",
          "display": "1st Two In Order"
        },
        "ExtraDescription": "",
        "BetTypeValue": 3,
        "EventStartDateTime": "2025/08/28 20:41:00",
        "EventStartTime": "20:41",
        "EventTypeValue": 2,
        "MarketClassValue": 3,
        "SelectionIds": ["2", "1", ""],
        "Stake": 10,
        "Odds": 76,
        "NumberOfCombinations": 1,
        "MinOdds": 76,
        "MaxOdds": 76,
        "MinNotation": "[2/1]",
        "MaxNotation": "[2/1]",
        "Notation": "[2/1]",
        "BettingLayoutValue": "1",
        "ComboSelections": [{
          "Selections": ["2", "1"],
          "Bankers": [],
          "FeedEventId": "12-2-8283445",
          "EventNumber": "2108",
          "EventStartDateTime": "2025/08/28 20:41:00",
          "EventStartTime": "20:41",
          "EventTypeName": "PlatinumHounds",
          "NumberOf2InOrderCombinations": 1,
          "NumberOf2AnyOrderCombinations": 1,
          "NumberOf3InOrderCombinations": 0,
          "NumberOf3AnyOrderCombinations": 0,
          "NumberOfSwingerCombinations": 1,
          "MaxNoOfCombinations": 60
        }],
        "BetCombination": [{
          "Selections": ["2", "1"],
          "Bankers": [],
          "FeedEventId": "12-2-8283445",
          "EventNumber": "2108",
          "EventStartDateTime": "2025/08/28 20:41:00",
          "EventStartTime": "20:41",
          "EventTypeName": "PlatinumHounds",
          "NumberOf2InOrderCombinations": 1,
          "NumberOf2AnyOrderCombinations": 1,
          "NumberOf3InOrderCombinations": 0,
          "NumberOf3AnyOrderCombinations": 0,
          "NumberOfSwingerCombinations": 1,
          "MaxNoOfCombinations": 60
        }],
        "DrawCount": null,
        "ExecutingFeedId": "8283445"
      }],
      "MultiGroups": [],
      "FromPendingBet": false,
      "RedeemCode": "",
      "RetailerGuid": "",
      "IsSSBTRetailer": false,
      "GlobalSingleStake": "10"
    }
  }
];

async function testComplexBets() {
  console.log('🧪 Testing Complex Bet Storage...\n');

  for (const test of complexBetTests) {
    console.log(`🎯 Testing: ${test.name}`);
    console.log('='.repeat(50));
    
    try {
      const req = createMockRequest(test.data);
      const res = createMockResponse();
      
      await handleBooking(req, res);
      console.log('✅ Test passed!\n');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.error('Error details:', error);
      console.log('');
    }
  }
  
  console.log('🏁 All complex bet tests completed!');
}

// Run the tests
testComplexBets();
