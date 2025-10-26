import { createClient } from '@libsql/client';

// Create Turso client
let client = null;

export function getTursoClient() {
  if (!client) {
    try {
      client = createClient({
        url: process.env.TURSO_DATABASE_URL || '',
        authToken: process.env.TURSO_AUTH_TOKEN || '',
      });
    } catch (error) {
      return null;
    }
  }
  return client;
}

// Initialize database tables (migration only - add profilePhoto column)
export async function initDatabase() {
  const db = getTursoClient();
  if (!db) return false;

  try {
    // Add profilePhoto column to users table (migration)
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN profilePhoto TEXT`);
    } catch (error) {
      // Column already exists, ignore the error
      if (!error.message.includes('duplicate column') && !error.message.includes('already exists')) {
        throw error;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

// Users operations
export async function getUsers() {
  const db = getTursoClient();
  if (!db) return [];

  try {
    const result = await db.execute('SELECT * FROM users');
    return result.rows.map(row => ({
      id: row.id,
      username: row.username,
      password: row.password,
      name: row.name,
      role: row.role,
      createdAt: row.createdAt,
      profilePhoto: row.profilePhoto || null
    }));
  } catch (error) {
    return [];
  }
}

export async function saveUsers(users) {
  const db = getTursoClient();
  if (!db) {
    return false;
  }

  try {
    // Clear existing users
    await db.execute('DELETE FROM users');
    
    // Insert all users
    for (const user of users) {
      // Ensure all values are primitive types (strings, numbers, etc.)
      const safeUser = {
        id: String(user.id || ''),
        username: String(user.username || ''),
        password: String(user.password || ''),
        name: String(user.name || ''),
        role: String(user.role || 'player'),
        createdAt: String(user.createdAt || new Date().toISOString()),
        profilePhoto: user.profilePhoto ? String(user.profilePhoto) : null
      };
      
      await db.execute({
        sql: `INSERT INTO users (id, username, password, name, role, createdAt, profilePhoto) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          safeUser.id,
          safeUser.username,
          safeUser.password,
          safeUser.name,
          safeUser.role,
          safeUser.createdAt,
          safeUser.profilePhoto
        ]
      });
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Players operations
export async function getPlayers() {
  const db = getTursoClient();
  if (!db) return [];

  try {
    const result = await db.execute('SELECT * FROM players');
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      wins: row.wins || 0,
      gamesPlayed: row.gamesPlayed || 0,
      totalGames: row.totalGames || 0,
      winPercentage: row.winPercentage || 0,
      rank: row.rank || 0
    }));
  } catch (error) {
    return [];
  }
}

export async function savePlayers(players) {
  const db = getTursoClient();
  if (!db) return false;

  try {
    // Clear existing players
    await db.execute('DELETE FROM players');
    
    // Insert all players (avoid duplicates)
    const uniquePlayers = Array.from(
      new Map(players.map(p => [p.id, p])).values()
    );
    
    for (const player of uniquePlayers) {
      await db.execute({
        sql: `INSERT INTO players (id, name, avatar, wins, gamesPlayed, totalGames, winPercentage, rank) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          player.id || '',
          player.name || '',
          player.avatar || '👤',
          player.wins || 0,
          player.gamesPlayed || 0,
          player.totalGames || 0,
          player.winPercentage || 0,
          player.rank || 0
        ]
      });
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Games operations
export async function getGames() {
  const db = getTursoClient();
  if (!db) return [];

  try {
    // Get Rummy games
    const gamesResult = await db.execute('SELECT * FROM games');
    const rummyGames = gamesResult.rows.map(row => JSON.parse(row.data));
    
    // Get Chess games from separate table
    const chessResult = await db.execute('SELECT * FROM chess_games');
    const chessGames = chessResult.rows.map(row => ({
      id: row.id,
      type: 'Chess',
      title: row.title,
      createdAt: row.createdAt,
      status: row.status,
      winner: row.winner,
      isDraw: row.isDraw === 1 || row.isDraw === true,
      maxPoints: null,
      players: [
        {
          id: row.player1_id,
          name: row.player1_name,
          avatar: row.player1_avatar,
          totalPoints: 0,
          isLost: false
        },
        {
          id: row.player2_id,
          name: row.player2_name,
          avatar: row.player2_avatar,
          totalPoints: 0,
          isLost: false
        }
      ],
      rounds: [],
      history: []
    }));
    
    // Get Ace games from separate table
    const aceResult = await db.execute('SELECT * FROM ace_games');
    const aceGames = aceResult.rows.map(row => {
      const gameData = JSON.parse(row.data);
      // Add winners array if completed
      if (row.status === 'completed' && row.winners) {
        gameData.winners = row.winners.split(',');
      }
      return gameData;
    });
    
    // Combine all arrays
    return [...rummyGames, ...chessGames, ...aceGames];
  } catch (error) {
    return [];
  }
}

export async function saveGames(games) {
  const db = getTursoClient();
  if (!db) return false;

  try {
    // Separate games by type
    const chessGames = games.filter(g => g.type.toLowerCase() === 'chess');
    const aceGames = games.filter(g => g.type.toLowerCase() === 'ace');
    const rummyGames = games.filter(g => g.type.toLowerCase() === 'rummy');
    
    // Clear existing games
    await db.execute('DELETE FROM games');
    await db.execute('DELETE FROM chess_games');
    await db.execute('DELETE FROM ace_games');
    
    // Save Rummy games only
    for (const game of rummyGames) {
      await db.execute({
        sql: `INSERT INTO games (id, type, title, createdAt, status, winner, maxPoints, data) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          game.id,
          game.type,
          game.title,
          game.createdAt,
          game.status,
          game.winner || null,
          game.maxPoints,
          JSON.stringify(game)
        ]
      });
    }
    
    // Save Chess games to separate table
    for (const game of chessGames) {
      // Chess requires exactly 2 players
      if (game.players.length === 2) {
        await db.execute({
          sql: `INSERT INTO chess_games (id, title, createdAt, status, winner, isDraw,
                player1_id, player1_name, player1_avatar, 
                player2_id, player2_name, player2_avatar) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            game.id,
            game.title,
            game.createdAt,
            game.status,
            game.winner || null,
            game.isDraw ? 1 : 0,
            game.players[0].id,
            game.players[0].name,
            game.players[0].avatar,
            game.players[1].id,
            game.players[1].name,
            game.players[1].avatar
          ]
        });
      }
    }
    
    // Save Ace games to separate table
    for (const game of aceGames) {
      // winners is a comma-separated list of winner IDs
      const winners = game.status === 'completed' && game.winners 
        ? game.winners.join(',') 
        : null;
      
      await db.execute({
        sql: `INSERT INTO ace_games (id, title, createdAt, status, winners, data) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          game.id,
          game.title,
          game.createdAt,
          game.status,
          winners,
          JSON.stringify(game)
        ]
      });
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Update or Insert a specific game in database
export async function updateGameInDB(game) {
  const db = getTursoClient();
  if (!db) return false;

  try {
    const type = game.type.toLowerCase();
    
    if (type === 'chess') {
      // Chess requires exactly 2 players
      if (game.players.length !== 2) {
        return false;
      }
      
      // Try to insert, if exists then update
      const result = await db.execute({
        sql: `INSERT OR REPLACE INTO chess_games 
              (id, title, createdAt, status, winner, isDraw,
               player1_id, player1_name, player1_avatar,
               player2_id, player2_name, player2_avatar)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          game.id,
          game.title,
          game.createdAt,
          game.status,
          game.winner || null,
          game.isDraw ? 1 : 0,
          game.players[0].id,
          game.players[0].name,
          game.players[0].avatar,
          game.players[1].id,
          game.players[1].name,
          game.players[1].avatar
        ]
      });
    } else if (type === 'ace') {
      const winners = game.status === 'completed' && game.winners 
        ? game.winners.join(',') 
        : null;
      
      const result = await db.execute({
        sql: `INSERT OR REPLACE INTO ace_games (id, title, createdAt, status, winners, data)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          game.id,
          game.title,
          game.createdAt,
          game.status,
          winners,
          JSON.stringify(game)
        ]
      });
    } else if (type === 'rummy') {
      const result = await db.execute({
        sql: `INSERT OR REPLACE INTO games (id, type, title, createdAt, status, winner, maxPoints, data)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          game.id,
          game.type,
          game.title,
          game.createdAt,
          game.status,
          game.winner || null,
          game.maxPoints,
          JSON.stringify(game)
        ]
      });
    } else {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}


// Update user profile photo
export async function updateUserProfilePhoto(userId, photoUrl) {
  const db = getTursoClient();
  if (!db) return false;

  try {
    const result = await db.execute({
      sql: `UPDATE users SET profilePhoto = ? WHERE id = ?`,
      args: [photoUrl, userId]
    });
    
    return result.rowsAffected > 0;
  } catch (error) {
    return false;
  }
}

// Get user by ID
export async function getUserById(userId) {
  const db = getTursoClient();
  if (!db) return null;

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [userId]
    });
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      name: row.name,
      role: row.role,
      createdAt: row.createdAt,
      profilePhoto: row.profilePhoto || null
    };
  } catch (error) {
    return null;
  }
}

// Helper function for generic data operations
export async function getData(key) {
  switch (key) {
    case 'users':
      return getUsers();
    case 'players':
      return getPlayers();
    case 'games':
      return getGames();
    default:
      return [];
  }
}

export async function saveData(key, data) {
  switch (key) {
    case 'users':
      return saveUsers(data);
    case 'players':
      return savePlayers(data);
    case 'games':
      return saveGames(data);
    default:
      return false;
  }
}

