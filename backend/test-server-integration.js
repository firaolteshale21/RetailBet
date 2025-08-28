import axios from 'axios';

const SERVER_URL = 'http://localhost:4000'; // Your server port

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

async function testServerIntegration() {
  console.log('🧪 Testing server integration...\n');

  try {
    // Test 1: Check if server is running
    console.log('🔍 Test 1: Checking server health...');
    const healthResponse = await axios.get(`${SERVER_URL}/healthz`);
    console.log('✅ Server is running:', healthResponse.data);

    // Test 2: Test booking endpoint
    console.log('\n🎯 Test 2: Testing booking endpoint...');
    const bookingResponse = await axios.post(`${SERVER_URL}/booking`, {
      BetObject: JSON.stringify(sampleKenoBet)
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Booking response:', JSON.stringify(bookingResponse.data, null, 2));

    // Extract bet slip ID from response
    const betSlipId = bookingResponse.data.Content.ID;
    console.log(`📝 Bet slip ID: ${betSlipId}`);

    // Test 3: Get bet slip details
    console.log('\n📊 Test 3: Getting bet slip details...');
    const betSlipResponse = await axios.get(`${SERVER_URL}/api/betslips/${betSlipId}`);
    console.log('✅ Bet slip details:', JSON.stringify(betSlipResponse.data, null, 2));

    // Test 4: Get all bet slips
    console.log('\n📋 Test 4: Getting all bet slips...');
    const allBetSlipsResponse = await axios.get(`${SERVER_URL}/api/betslips?limit=5`);
    console.log('✅ All bet slips:', JSON.stringify(allBetSlipsResponse.data, null, 2));

    // Test 5: Update bet slip status
    console.log('\n🔄 Test 5: Updating bet slip status...');
    const updateResponse = await axios.put(`${SERVER_URL}/api/betslips/${betSlipId}/status`, {
      status: 'placed',
      changedBy: 'test_user',
      reason: 'Test status update'
    });
    console.log('✅ Status update response:', JSON.stringify(updateResponse.data, null, 2));

    console.log('\n🎉 All server integration tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testServerIntegration();
