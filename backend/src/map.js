// Utility functions for parsing and mapping API responses

// Parse .NET date format "/Date(ms)/" to JavaScript Date
export const parseDotNetDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }
  
  // Handle .NET date format "/Date(1234567890)/"
  const match = dateString.match(/\/Date\((\d+)\)\//);
  if (match) {
    return new Date(parseInt(match[1]));
  }
  
  // Try parsing as ISO string
  try {
    return new Date(dateString);
  } catch (error) {
    return null;
  }
};

// Extract event ID from various possible formats
export const extractEventId = (event) => {
  if (!event) return null;
  
  // Try different possible fields for the user's API structure
  if (event.ID) return event.ID;
  if (event.id) return event.id;
  if (event.eventId) return event.eventId;
  if (event.EventId) return event.EventId;
  if (event.compositeId) return event.compositeId;
  
  // Try to construct from feed and event IDs
  if (event.FeedId && event.EventId) {
    return `${event.FeedId}-${event.EventId}`;
  }
  
  return null;
};

// Extract game name from event
export const extractGameName = (event) => {
  if (!event) return null;
  
  // Try different possible fields for the user's API structure
  if (event.TypeName) return event.TypeName;
  if (event.gameName) return event.gameName;
  if (event.name) return event.name;
  if (event.title) return event.title;
  if (event.game) return event.game;
  
  return null;
};

// Extract game number from event
export const extractGameNumber = (event) => {
  if (!event) return null;
  
  // Try different possible fields for the user's API structure
  if (event.Number !== undefined) return event.Number;
  if (event.number !== undefined) return event.number;
  if (event.gameNumber !== undefined) return event.gameNumber;
  if (event.GameNumber !== undefined) return event.GameNumber;
  if (event.eventNumber !== undefined) return event.eventNumber;
  if (event.EventNumber !== undefined) return event.EventNumber;
  
  return null;
};

// Determine if event is finished based on status
export const isEventFinished = (event) => {
  if (!event) return false;
  
  // Check status fields for the user's API structure
  if (event.IsFinished !== undefined) {
    return event.IsFinished;
  }
  
  if (event.StatusValue !== undefined) {
    return event.StatusValue === 3; // Assuming 3 means finished
  }
  
  if (event.status !== undefined) {
    return event.status === 3 || event.status === 'Finished' || event.status === 'Settled';
  }
  
  if (event.statusValue !== undefined) {
    return event.statusValue === 3;
  }
  
  if (event.isFinished !== undefined) {
    return event.isFinished;
  }
  
  // Check if finish time is in the past
  if (event.AdjustedFinishTime) {
    const finishTime = parseDotNetDate(event.AdjustedFinishTime);
    if (finishTime) {
      return finishTime < new Date();
    }
  }
  
  return false;
};

// Extract status value from event
export const extractStatusValue = (event) => {
  if (!event) return null;
  
  if (event.StatusValue !== undefined) return event.StatusValue;
  if (event.statusValue !== undefined) return event.statusValue;
  if (event.status !== undefined) {
    // Convert string status to numeric if needed
    if (typeof event.status === 'string') {
      const statusMap = {
        'Upcoming': 1,
        'InProgress': 2,
        'Finished': 3,
        'Settled': 3,
        'Cancelled': 4
      };
      return statusMap[event.status] || null;
    }
    return event.status;
  }
  
  return null;
};

// Parse start time from various formats
export const parseStartTime = (event) => {
  if (!event) return null;
  
  // Try different date fields for the user's API structure
  if (event.AdjustedStartTime) {
    return parseDotNetDate(event.AdjustedStartTime);
  }
  
  if (event.StartDateTimeAsWords) {
    // Parse "2025/08/25 11:03:00" format
    try {
      return new Date(event.StartDateTimeAsWords.replace(/(\d{4})\/(\d{2})\/(\d{2})/, '$1-$2-$3'));
    } catch (error) {
      return null;
    }
  }
  
  if (event.startTime) return parseDotNetDate(event.startTime);
  if (event.start) return parseDotNetDate(event.start);
  
  return null;
};

// Parse finish time from various formats
export const parseFinishTime = (event) => {
  if (!event) return null;
  
  // Try different date fields for the user's API structure
  if (event.AdjustedFinishTime) {
    return parseDotNetDate(event.AdjustedFinishTime);
  }
  
  if (event.EstimatedFinishTime) {
    return parseDotNetDate(event.EstimatedFinishTime);
  }
  
  if (event.finishTime) return parseDotNetDate(event.finishTime);
  if (event.finish) return parseDotNetDate(event.finish);
  
  return null;
};

// Map API response to our event structure
export const mapApiEventToEvent = (apiEvent) => {
  // Handle the case where the response has an "Event" wrapper
  const event = apiEvent.Event || apiEvent;
  
  const eventId = extractEventId(event);
  const gameName = extractGameName(event);
  const gameNumber = extractGameNumber(event);
  const startTime = parseStartTime(event);
  const finishTime = parseFinishTime(event);
  const isFinished = isEventFinished(event);
  const statusValue = extractStatusValue(event);
  
  return {
    eventId,
    gameName,
    gameNumber,
    startTime,
    finishTime,
    isFinished,
    statusValue,
    rawPayload: apiEvent
  };
};

// Map list response to events array
export const mapListResponseToEvents = (response) => {
  if (!response) return [];
  
  // Handle different response structures
  if (response.Data && Array.isArray(response.Data)) {
    // If response has a Data array
    return response.Data.map(mapApiEventToEvent).filter(event => event.eventId);
  }
  
  if (Array.isArray(response)) {
    // If response is directly an array
    return response.map(mapApiEventToEvent).filter(event => event.eventId);
  }
  
  // If response has an Event wrapper (single event)
  if (response.Event) {
    const event = mapApiEventToEvent(response);
    return event.eventId ? [event] : [];
  }
  
  return [];
};

// ===== GAME RESULTS PROCESSING =====

// Extract winning values from API response
export const extractWinningValues = (apiResponse) => {
  if (!apiResponse) return null;
  
  const event = apiResponse.Event || apiResponse;
  
  // SmartPlayKeno specific winning values
  if (event.TypeName === 'SmartPlayKeno') {
    // Extract winning numbers from Markets array
    let winningNumbers = [];
    
    console.log(`🎰 Processing SmartPlayKeno game: ${event.EventId || event.ID}`);
    console.log(`🎰 Game finished: ${event.IsFinished}`);
    
    // Look for KenoWin market which contains the winning numbers
    if (event.Markets && Array.isArray(event.Markets)) {
      console.log(`🎰 Found ${event.Markets.length} markets`);
      
      const kenoWinMarket = event.Markets.find(market => market.Name === 'KenoWin');
      if (kenoWinMarket) {
        console.log(`🎰 Found KenoWin market`);
        
        // PRIMARY METHOD: Extract winning numbers from KenoSelections where IsWinner is true
        if (kenoWinMarket.KenoSelections && Array.isArray(kenoWinMarket.KenoSelections)) {
          console.log(`🎰 KenoWin market has ${kenoWinMarket.KenoSelections.length} selections`);
          const winningSelections = kenoWinMarket.KenoSelections.filter(selection => selection.IsWinner === true);
          console.log(`🎰 Found ${winningSelections.length} winning selections`);
          if (winningSelections.length > 0) {
            winningNumbers = winningSelections.map(selection => selection.FeedId);
            console.log(`🎰 Extracted winning numbers from KenoSelections: ${winningNumbers.join(', ')}`);
          }
        }
        
        // FALLBACK METHOD: Extract winning numbers from WinningSelectionID field (if available)
        if (winningNumbers.length === 0 && kenoWinMarket.WinningSelectionID) {
          console.log(`🎰 WinningSelectionID: ${kenoWinMarket.WinningSelectionID}`);
          // Parse the comma-separated winning numbers
          winningNumbers = kenoWinMarket.WinningSelectionID.split(',').map(num => num.trim());
          console.log(`🎰 Extracted winning numbers from WinningSelectionID: ${winningNumbers.join(', ')}`);
        }
        

      } else {
        console.log(`🎰 No KenoWin market found`);
      }
    } else {
      console.log(`🎰 No markets found`);
    }
    
    return {
      winningNumbers,
      totalWinningNumbers: winningNumbers.length
    };
  }
  
  // Racing games (MotorRacing, DashingDerby, PlatinumHounds, HarnessRacing, CycleRacing, SteepleChase, SpeedSkating, SingleSeaterMotorRacing)
  const racingGames = ['MotorRacing', 'DashingDerby', 'PlatinumHounds', 'HarnessRacing', 'CycleRacing', 'SteepleChase', 'SpeedSkating', 'SingleSeaterMotorRacing'];
  if (racingGames.includes(event.TypeName)) {
    let winner = null;
    let winningTime = null;
    let positions = [];
    let raceResult = null;
    let raceName = null;
    let distance = null;
    
    console.log(`🏁 Processing ${event.TypeName} game: ${event.EventId || event.ID}`);
    console.log(`🏁 Game finished: ${event.IsFinished}`);
    
    // Extract from Race object if available
    if (event.Race) {
      raceResult = event.Race.Result; // This contains the finish order like "6,7,1,10,3,8,2,9,5,4,11"
      winner = event.Race.Winner || event.Race.winner || null;
      winningTime = event.Race.WinningTime || event.Race.winningTime || null;
      positions = event.Race.Positions || event.Race.positions || [];
      raceName = event.Race.Name || null;
      distance = event.Race.Distance || null;
      
      console.log(`🏁 Race result: ${raceResult}`);
      console.log(`🏁 Race winner: ${winner}`);
    }
    
    // Check Markets for racing results - this is where the actual winners are!
    if (event.Markets && Array.isArray(event.Markets)) {
      console.log(`🏁 Found ${event.Markets.length} markets`);
      
      // Look for Win market first
      const winMarket = event.Markets.find(market => market.Name === 'Win');
      if (winMarket && winMarket.RaceSelections) {
        console.log(`🏁 Win market has ${winMarket.RaceSelections.length} selections`);
        const winningSelections = winMarket.RaceSelections.filter(selection => selection.IsWinner === true);
        console.log(`🏁 Found ${winningSelections.length} winning selections in Win market`);
        if (winningSelections.length > 0) {
          winner = winningSelections[0].FeedId || winningSelections[0].DisplayDescription;
          console.log(`🏁 Found ${event.TypeName} winner: ${winner}`);
        }
      }
      
      // Look for Place market for top 3 positions
      const placeMarket = event.Markets.find(market => market.Name === 'Place');
      if (placeMarket && placeMarket.RaceSelections) {
        const placeSelections = placeMarket.RaceSelections.filter(selection => selection.IsWinner === true);
        console.log(`🏁 Found ${placeSelections.length} winning selections in Place market`);
        if (placeSelections.length > 0) {
          positions = placeSelections.map((selection, index) => ({
            position: index + 1,
            selection: selection.FeedId || selection.DisplayDescription,
            name: selection.DisplayDescription || selection.FeedDescription,
            odds: selection.Odds || null
          }));
          console.log(`🏁 Found ${event.TypeName} positions:`, positions);
        }
      }
    }
    
    // Also check PrimaryMarkets if Markets is empty
    if (event.PrimaryMarkets && Array.isArray(event.PrimaryMarkets)) {
      console.log(`🏁 Found ${event.PrimaryMarkets.length} primary markets`);
      
      const winPrimaryMarket = event.PrimaryMarkets.find(market => market.Name === 'Win');
      if (winPrimaryMarket && winPrimaryMarket.RaceSelections) {
        const winningSelections = winPrimaryMarket.RaceSelections.filter(selection => selection.IsWinner === true);
        console.log(`🏁 Found ${winningSelections.length} winning selections in Primary Win market`);
        if (winningSelections.length > 0 && !winner) {
          winner = winningSelections[0].FeedId || winningSelections[0].DisplayDescription;
          console.log(`🏁 Found ${event.TypeName} winner from PrimaryMarkets: ${winner}`);
        }
      }
      
      const placePrimaryMarket = event.PrimaryMarkets.find(market => market.Name === 'Place');
      if (placePrimaryMarket && placePrimaryMarket.RaceSelections && positions.length === 0) {
        const placeSelections = placePrimaryMarket.RaceSelections.filter(selection => selection.IsWinner === true);
        console.log(`🏁 Found ${placeSelections.length} winning selections in Primary Place market`);
        if (placeSelections.length > 0) {
          positions = placeSelections.map((selection, index) => ({
            position: index + 1,
            selection: selection.FeedId || selection.DisplayDescription,
            name: selection.DisplayDescription || selection.FeedDescription,
            odds: selection.Odds || null
          }));
          console.log(`🏁 Found ${event.TypeName} positions from PrimaryMarkets:`, positions);
        }
      }
    }
    
    // If no winner found but race result exists, try to extract from result string
    if (!winner && raceResult) {
      const resultParts = raceResult.split(',').map(num => num.trim());
      if (resultParts.length > 0) {
        winner = resultParts[0]; // First number in result is usually the winner
        console.log(`🏁 Extracted winner from race result: ${winner}`);
      }
    }
    
    return {
      winner,
      winningTime,
      positions,
      raceResult,
      totalPositions: positions.length,
      raceName,
      distance,
      gameType: event.TypeName
    };
  }
  
  // HorseRacingRouletteV2 specific winning values
  if (event.TypeName === 'HorseRacingRouletteV2') {
    let winner = null;
    let positions = [];
    let participants = [];
    let raceName = null;
    let distance = null;
    
    // Extract from RacingRouletteV2 object
    if (event.RacingRouletteV2) {
      raceName = event.RacingRouletteV2.Name;
      distance = event.RacingRouletteV2.Distance;
      
      // Extract participants and their finishing positions
      if (event.RacingRouletteV2.Participants && Array.isArray(event.RacingRouletteV2.Participants)) {
        participants = event.RacingRouletteV2.Participants.map(participant => ({
          name: participant.Name,
          colour: participant.Colour,
          feedId: participant.FeedId,
          finish: participant.Finish,
          winMarketColumn: participant.WinMarketColumn,
          winMarketOrder: participant.WinMarketOrder
        }));
        
        // Find the winner (participant with Finish = 1)
        const winningParticipant = participants.find(p => p.finish === 1);
        if (winningParticipant) {
          winner = winningParticipant.name;
          console.log(`🎰 Found HorseRacingRouletteV2 winner: ${winner} (${winningParticipant.colour})`);
        }
        
        // Get all finishing positions (sorted by finish position)
        const finishedParticipants = participants
          .filter(p => p.finish !== null && p.finish !== undefined)
          .sort((a, b) => a.finish - b.finish);
        
        if (finishedParticipants.length > 0) {
          positions = finishedParticipants.map(participant => ({
            position: participant.finish,
            name: participant.name,
            colour: participant.colour,
            feedId: participant.feedId
          }));
          console.log(`🎰 Found HorseRacingRouletteV2 positions:`, positions);
        }
      }
    }
    
    return {
      winner,
      positions,
      participants,
      totalParticipants: participants.length,
      totalPositions: positions.length,
      raceName,
      distance,
      gameType: 'HorseRacingRouletteV2'
    };
  }
  
  // Generic winning values for other games
  let winner = null;
  let winningValue = null;
  let result = null;
  let payout = null;
  
  // Check Markets for any winning selections
  if (event.Markets && Array.isArray(event.Markets)) {
    for (const market of event.Markets) {
      // Check different selection types for winners
      const selectionTypes = ['KenoSelections', 'RaceSelections', 'BoxingSelections', 'PlayerVsPlayerSelections'];
      
      for (const selectionType of selectionTypes) {
        if (market[selectionType] && Array.isArray(market[selectionType])) {
          const winningSelections = market[selectionType].filter(selection => selection.IsWinner === true);
          if (winningSelections.length > 0) {
            winner = winningSelections[0].FeedId || winningSelections[0].DisplayDescription;
            winningValue = market.WinningSelectionID || market.WinningSelectionDescription;
            break;
          }
        }
      }
      
      if (winner) break;
    }
  }
  
  return {
    winner,
    winningValue,
    result,
    payout,
    gameType: event.TypeName
  };
};

// Determine result type based on API response
export const determineResultType = (apiResponse) => {
  if (!apiResponse) return 'unknown';
  
  const event = apiResponse.Event || apiResponse;
  
  // Check if game is cancelled
  if (event.StatusValue === 4 || event.statusValue === 4) {
    return 'cancelled';
  }
  
  // Check if game is suspended
  if (event.StatusValue === 5 || event.statusValue === 5) {
    return 'suspended';
  }
  
  // Check if game is finished
  if (event.IsFinished === true || event.isFinished === true) {
    // Check if there are any winners in the markets
    if (event.Markets && Array.isArray(event.Markets)) {
      for (const market of event.Markets) {
        // Check different selection types for winners
        const selectionTypes = ['KenoSelections', 'RaceSelections', 'BoxingSelections', 'PlayerVsPlayerSelections'];
        
        for (const selectionType of selectionTypes) {
          if (market[selectionType] && Array.isArray(market[selectionType])) {
            const winningSelections = market[selectionType].filter(selection => selection.IsWinner === true);
            if (winningSelections.length > 0) {
              return 'winner';
            }
          }
        }
      }
    }
    
    // Check if there's a winner at the event level
    if (event.IsWinner === true || event.isWinner === true) {
      return 'winner';
    }
    
    // If finished but no clear winners found, return finished
    return 'finished';
  }
  
  return 'unknown';
};

// Process game result from API response
export const processGameResult = (apiResponse) => {
  if (!apiResponse) return null;
  
  const event = apiResponse.Event || apiResponse;
  const eventId = extractEventId(event);
  const gameName = extractGameName(event);
  
  if (!eventId || !gameName) {
    return null;
  }
  
  const resultType = determineResultType(apiResponse);
  const winningValues = extractWinningValues(apiResponse);
  
  // Extract the unique game number
  const gameNumber = extractGameNumber(event);
  
  // Add logging for debugging
  console.log(`🏆 Processing result for ${eventId} (${gameName}):`);
  console.log(`   - Result Type: ${resultType}`);
  console.log(`   - Game Number: ${gameNumber}`);
  console.log(`   - Winning Values:`, winningValues);
  
  return {
    eventId,
    gameName,
    resultType,
    winningValues,
    resultData: apiResponse,
    gameNumber
  };
};

export default {
  parseDotNetDate,
  extractEventId,
  extractGameName,
  isEventFinished,
  extractStatusValue,
  parseStartTime,
  parseFinishTime,
  mapApiEventToEvent,
  mapListResponseToEvents,
  extractWinningValues,
  determineResultType,
  processGameResult
};
