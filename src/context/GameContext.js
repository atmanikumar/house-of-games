'use client';

import { createContext, useContext, useState, useEffect } from 'react';

/**
 * GameContext - Manages all game and player state
 * 
 * Data Persistence:
 * - Uses Vercel KV (Redis) for PERMANENT server-side storage
 * - Data persists across all devices and sessions
 * - Works on Vercel deployment with KV storage
 * - Falls back to localStorage for local development
 */

const GameContext = createContext();

// Helper function to save data to server
const saveToServer = async (key, data) => {
  try {
    const response = await fetch(`/api/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      return false;
    }
    
    return true;
  } catch (error) {
    // Fallback to localStorage if API fails (local development)
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
    return false;
  }
};

// Helper function to create a new game on server
const createGameOnServer = async (game) => {
  try {
    const response = await fetch(`/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game),
    });
    
    if (!response.ok) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Helper function to update a single game
const updateGameOnServer = async (game) => {
  try {
    const response = await fetch(`/api/games`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(game),
    });
    
    if (!response.ok) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Helper function to load data from server
const loadFromServer = async (key) => {
  try {
    const response = await fetch(`/api/${key}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    // Silent fail
  }
  return [];
};

export function GameProvider({ children }) {
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load data from server on mount - ONLY ONCE
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      // Load players and games from API
      const loadedPlayers = await loadFromServer('players');
      const loadedGames = await loadFromServer('games');
      
      setPlayers(loadedPlayers);
      setGames(loadedGames);
      setInitialized(true);
      setLoading(false);
    };
    
    loadData();
  }, []); // Empty dependency array = run once on mount

  // Refresh players from server
  const refreshPlayers = async () => {
    const loadedPlayers = await loadFromServer('players');
    setPlayers(loadedPlayers);
  };

  const addPlayer = (name) => {
    const avatars = ['🦸‍♂️', '🦹‍♂️', '🕷️', '🦇', '⚡', '💪', '🔥', '⭐', '🎯', '🏆', '👊', '🛡️', '⚔️', '🎪', '🎭', '🎬'];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    
    const newPlayer = {
      id: Date.now().toString(),
      name,
      avatar: randomAvatar,
      wins: 0,
      totalGames: 0,
      winPercentage: 0,
      createdAt: new Date().toISOString()
    };
    
    setPlayers(prev => [...prev, newPlayer]);
    return newPlayer;
  };

  const updatePlayer = (id, updates) => {
    setPlayers(prev => prev.map(player => 
      player.id === id ? { ...player, ...updates } : player
    ));
  };


  const createGame = async (gameType, selectedPlayerIds, maxPoints = 120) => {
    const now = new Date();
    const gameNumber = games.filter(g => 
      new Date(g.createdAt).toDateString() === now.toDateString()
    ).length + 1;

    // Capitalize first letter of game type
    const capitalizedGameType = gameType.charAt(0).toUpperCase() + gameType.slice(1);

    const newGame = {
      id: Date.now().toString(),
      type: capitalizedGameType,
      title: `${capitalizedGameType} Game ${gameNumber}`,
      createdAt: now.toISOString(),
      players: selectedPlayerIds.map(playerId => {
        const player = players.find(p => p.id === playerId);
        return {
          id: playerId,
          name: player.name,
          avatar: player.avatar,
          totalPoints: 0,
          isLost: false
        };
      }),
      rounds: [],
      history: [], // Track all events (rounds and player additions)
      status: 'in_progress', // 'in_progress', 'completed'
      winner: null,
      maxPoints: maxPoints // null for chess/ace, number for rummy
    };

    const updatedGames = [...games, newGame];
    setGames(updatedGames);
    
    // Create new game on server (await to ensure it completes)
    await createGameOnServer(newGame);
    
    return newGame;
  };

  const addPlayerToGame = (gameId, playerId) => {
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }
    
    const isAce = game.type.toLowerCase() === 'ace';
    
    // For Rummy only: Check if any player has lost (reached max points)
    if (!isAce) {
      const hasLostPlayers = game.players.some(p => p.isLost);
      if (hasLostPlayers) {
        return { 
          success: false, 
          error: 'Cannot add players after someone has reached max points!' 
        };
      }
    }
    
    // Check if player already in game
    if (game.players.find(p => p.id === playerId)) {
      return { success: false, error: 'Player already in game' };
    }
    
    const player = players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    
    // Determine starting points based on game type
    let newPlayerPoints;
    if (isAce) {
      // For Ace games: new players start with 0 points
      newPlayerPoints = 0;
    } else {
      // For Rummy: Get maximum points among existing players and add 1
      const maxPoints = Math.max(...game.players.map(p => p.totalPoints), 0);
      newPlayerPoints = maxPoints + 1;
    }
    
    // Create player addition event
    const playerAddEvent = {
      id: Date.now().toString(),
      type: 'player_added',
      timestamp: new Date().toISOString(),
      playerId: playerId,
      playerName: player.name,
      playerAvatar: player.avatar,
      startingPoints: newPlayerPoints
    };
    
    // If history doesn't exist, initialize it with existing rounds
    let gameHistory = game.history || [];
    if (!game.history && game.rounds && game.rounds.length > 0) {
      // Convert old rounds to history format with type field
      gameHistory = game.rounds.map(round => ({
        ...round,
        type: 'round'
      }));
    }
    
    const updatedGame = {
      ...game,
      players: [...game.players, {
        id: playerId,
        name: player.name,
        avatar: player.avatar,
        totalPoints: newPlayerPoints,
        isLost: false
      }],
      history: [...gameHistory, playerAddEvent]
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
    
    return { success: true };
  };

  const addRound = (gameId, roundScores, dropInfo = {}, winnerInfo = {}) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    const isAce = game.type.toLowerCase() === 'ace';
    
    const newRound = {
      id: Date.now().toString(),
      type: 'round',
      roundNumber: game.rounds.length + 1,
      scores: roundScores,
      drops: dropInfo, // Track which players dropped in this round
      winners: winnerInfo, // Track which players won (got 0 points) in this round
      timestamp: new Date().toISOString()
    };

    let updatedGame;

    // For Ace: no elimination, just track points
    if (isAce) {
      const updatedPlayers = game.players.map(player => {
        const score = roundScores[player.id] || 0;
        const newTotal = player.totalPoints + score;
        return {
          ...player,
          totalPoints: newTotal,
          isLost: false // No elimination in Ace
        };
      });

      updatedGame = {
        ...game,
        rounds: [...game.rounds, newRound],
        history: [...(game.history || []), newRound],
        players: updatedPlayers,
        status: game.status, // Admin manually ends game
        winner: game.winner,
        winners: game.winners
      };
    } else {
      // For Rummy: original logic with elimination + drop status
      const updatedPlayers = game.players.map(player => {
        const score = roundScores[player.id] || 0;
        const newTotal = player.totalPoints + score;
        const hasDropped = dropInfo[player.id] === true;
        
        return {
          ...player,
          totalPoints: newTotal,
          isLost: newTotal >= game.maxPoints,
          isDropped: hasDropped || player.isDropped // Once dropped, stays dropped
        };
      });

      // Check if game is over
      const playersNotLost = updatedPlayers.filter(p => !p.isLost);
      let status = game.status;
      let winner = game.winner;

      if (playersNotLost.length === 1) {
        status = 'completed';
        winner = playersNotLost[0].id;
        
        const updatedPlayerStats = players.map(player => {
          const gamePlayer = updatedPlayers.find(gp => gp.id === player.id);
          if (gamePlayer) {
            const newTotalGames = player.totalGames + 1;
            const newWins = player.wins + (player.id === winner ? 1 : 0);
            const winPercentage = newTotalGames > 0 ? Math.round((newWins / newTotalGames) * 100) : 0;
            return {
              ...player,
              totalGames: newTotalGames,
              wins: newWins,
              winPercentage
            };
          }
          return player;
        });
        
        setPlayers(updatedPlayerStats);
        saveToServer('players', updatedPlayerStats);
      } else if (playersNotLost.length === 0) {
        status = 'completed';
        // If all lost, the one with lowest score wins
        const sortedPlayers = [...updatedPlayers].sort((a, b) => a.totalPoints - b.totalPoints);
        winner = sortedPlayers[0].id;

        updatedPlayers.forEach(player => {
          updatePlayer(player.id, {
            totalGames: players.find(p => p.id === player.id).totalGames + 1,
            wins: player.id === winner 
              ? players.find(p => p.id === player.id).wins + 1 
              : players.find(p => p.id === player.id).wins
          });
        });

        setTimeout(() => {
          setPlayers(prev => prev.map(p => ({
            ...p,
            winPercentage: p.totalGames > 0 ? Math.round((p.wins / p.totalGames) * 100) : 0
          })));
        }, 100);
      }

      updatedGame = {
        ...game,
        rounds: [...game.rounds, newRound],
        history: [...(game.history || []), newRound],
        players: updatedPlayers,
        status,
        winner
      };
    }
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
  };

  const declareWinner = (gameId, winnerId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // Update player statistics
    const updatedPlayerStats = players.map(player => {
      const isInGame = game.players.find(p => p.id === player.id);
      if (isInGame) {
        const newTotalGames = player.totalGames + 1;
        const newWins = player.wins + (player.id === winnerId ? 1 : 0);
        const winPercentage = newTotalGames > 0 ? Math.round((newWins / newTotalGames) * 100) : 0;
        return {
          ...player,
          totalGames: newTotalGames,
          wins: newWins,
          winPercentage
        };
      }
      return player;
    });
    
    setPlayers(updatedPlayerStats);
    saveToServer('players', updatedPlayerStats);
    
    const updatedGame = {
      ...game,
      status: 'completed',
      winner: winnerId
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
  };

  const declareDraw = (gameId) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // Update player statistics - totalGames increases but wins don't
    const updatedPlayerStats = players.map(player => {
      const isInGame = game.players.find(p => p.id === player.id);
      if (isInGame) {
        const newTotalGames = player.totalGames + 1;
        const winPercentage = newTotalGames > 0 ? Math.round((player.wins / newTotalGames) * 100) : 0;
        return {
          ...player,
          totalGames: newTotalGames,
          winPercentage
        };
      }
      return player;
    });
    
    setPlayers(updatedPlayerStats);
    saveToServer('players', updatedPlayerStats);
    
    const updatedGame = {
      ...game,
      status: 'completed',
      isDraw: true,
      winner: null
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
  };

  const updateMaxPoints = (gameId, newMaxPoints) => {
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
      return { success: false, error: 'Game not found' };
    }
    
    // Validate max points
    if (!newMaxPoints || newMaxPoints < 1) {
      return { 
        success: false, 
        error: 'Max points must be greater than 0' 
      };
    }
    
    // Update max points and recalculate who is lost based on new max
    const updatedPlayers = game.players.map(player => ({
      ...player,
      isLost: player.totalPoints >= newMaxPoints
    }));
    
    const updatedGame = {
      ...game,
      maxPoints: newMaxPoints,
      players: updatedPlayers
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
    
    return { success: true };
  };

  const declareAceWinners = (gameId, winnerIds) => {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // Update player statistics - all winners get +1 win
    const updatedPlayerStats = players.map(player => {
      const isInGame = game.players.find(p => p.id === player.id);
      if (isInGame) {
        const newTotalGames = player.totalGames + 1;
        const isWinner = winnerIds.includes(player.id);
        const newWins = player.wins + (isWinner ? 1 : 0);
        const winPercentage = newTotalGames > 0 ? Math.round((newWins / newTotalGames) * 100) : 0;
        return {
          ...player,
          totalGames: newTotalGames,
          wins: newWins,
          winPercentage
        };
      }
      return player;
    });
    
    setPlayers(updatedPlayerStats);
    saveToServer('players', updatedPlayerStats);
    
    const updatedGame = {
      ...game,
      status: 'completed',
      winners: winnerIds,
      winner: winnerIds[0] // Set first winner as primary (for compatibility)
    };
    
    const updatedGames = games.map(g => g.id === gameId ? updatedGame : g);
    setGames(updatedGames);
    
    // Update only this game on server
    updateGameOnServer(updatedGame);
  };

  const getGame = (gameId) => {
    return games.find(game => game.id === gameId);
  };

  const getPlayerStats = () => {
    return [...players].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
      return b.totalGames - a.totalGames;
    });
  };

  const value = {
    players,
    games,
    loading,
    addPlayer,
    updatePlayer,
    createGame,
    addPlayerToGame,
    addRound,
    declareWinner,
    declareDraw,
    updateMaxPoints,
    declareAceWinners,
    getGame,
    getPlayerStats,
    refreshPlayers
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}

