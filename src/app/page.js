'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();
  const { players, games, createGame, getPlayerStats, loading: gameLoading } = useGame();
  const { isAdmin, user, loading: authLoading } = useAuth();
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [gameType, setGameType] = useState('rummy');
  const [filterGameType, setFilterGameType] = useState('Rummy'); // Filter for top players
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [maxPoints, setMaxPoints] = useState(120);

  // Show loading state
  if (authLoading || gameLoading) {
    return (
      <div className={styles.home}>
        <div className="container">
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }

      // Calculate player stats filtered by game type
      const getTopPlayersByGameType = (gameTypeFilter) => {
        // Filter games by type (case-insensitive to handle both old and new games)
        const filteredGames = games.filter(game => 
          game.type.toLowerCase() === gameTypeFilter.toLowerCase() && 
          game.status === 'completed'
        );
        
        console.log('🔍 Filtering games:', { 
          gameTypeFilter, 
          totalGames: games.length, 
          filteredCount: filteredGames.length,
          allGameTypes: games.map(g => ({ type: g.type, status: g.status }))
        });
        
        // Calculate stats for each player in filtered games
        const playerStatsMap = {};
        
        filteredGames.forEach(game => {
          game.players.forEach(gamePlayer => {
            if (!playerStatsMap[gamePlayer.id]) {
              const player = players.find(p => p.id === gamePlayer.id);
              playerStatsMap[gamePlayer.id] = {
                id: gamePlayer.id,
                name: gamePlayer.name,
                avatar: gamePlayer.avatar,
                wins: 0,
                totalGames: 0,
                winPercentage: 0
              };
            }
            
            playerStatsMap[gamePlayer.id].totalGames += 1;
            
            // Check for multiple winners (Ace games) or single winner
            const isWinner = game.winners && game.winners.length > 0
              ? game.winners.includes(gamePlayer.id)
              : game.winner === gamePlayer.id;
            
            if (isWinner) {
              playerStatsMap[gamePlayer.id].wins += 1;
            }
          });
        });
    
    // Calculate win percentages and sort
    const statsArray = Object.values(playerStatsMap).map(player => ({
      ...player,
      winPercentage: player.totalGames > 0 
        ? Math.round((player.wins / player.totalGames) * 100)
        : 0
    }));
    
    // Sort by win percentage, then by wins, then by total games
    return statsArray
      .sort((a, b) => {
        if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.totalGames - a.totalGames;
      })
      .slice(0, 5); // Top 5 only
  };
  
  const topPlayers = getTopPlayersByGameType(filterGameType);
  
  // Get recent matches (last 10)
  const recentMatches = [...games]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  const handleNewGame = () => {
    if (players.length === 0) {
      alert('Please add users first!');
      router.push('/users');
      return;
    }
    setShowNewGameModal(true);
  };

  const handlePlayerToggle = (playerId) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleCreateGame = () => {
    // Chess requires exactly 2 players
    if (gameType === 'chess') {
      if (selectedPlayers.length !== 2) {
        alert('Chess requires exactly 2 players');
        return;
      }
    } else {
      if (selectedPlayers.length < 2) {
        alert('Please select at least 2 players');
        return;
      }
    }

    // Chess and Ace games don't have max points
    const points = (gameType === 'chess' || gameType === 'ace') ? null : parseInt(maxPoints);
    const game = createGame(gameType, selectedPlayers, points);
    setShowNewGameModal(false);
    router.push(`/game/${game.id}`);
  };

  return (
    <div className={styles.home}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🏆 Dashboard</h1>
            <p className={styles.subtitle}>Track your card game champions</p>
          </div>
          {isAdmin() && (
            <button className="btn btn-primary" onClick={handleNewGame} style={{ color: 'white' }}>
              <span style={{ filter: 'brightness(0) invert(1)' }}>➕</span> New Game
            </button>
          )}
        </div>

        <div className="card">
          <h2 className={styles.sectionTitle}>Top 5 Players</h2>
          
          {/* Game Type Tabs */}
          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tab} ${filterGameType === 'Rummy' ? styles.tabActive : ''}`}
              onClick={() => setFilterGameType('Rummy')}
            >
              Rummy
            </button>
            <button 
              className={`${styles.tab} ${filterGameType === 'Chess' ? styles.tabActive : ''}`}
              onClick={() => setFilterGameType('Chess')}
            >
              Chess
            </button>
            <button 
              className={`${styles.tab} ${filterGameType === 'Ace' ? styles.tabActive : ''}`}
              onClick={() => setFilterGameType('Ace')}
            >
              Ace
            </button>
          </div>
          {topPlayers.length === 0 ? (
            <div className={styles.empty}>
              <p>No {filterGameType} games played yet!</p>
              {isAdmin() && (
                <button 
                  className="btn btn-primary" 
                  onClick={handleNewGame}
                >
                  Start a Game
                </button>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Wins</th>
                    <th>Total Games</th>
                    <th>Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlayers.map((player, index) => (
                    <tr key={player.id}>
                      <td>
                        <span className={styles.rank}>
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index === 3 && '🏅'}
                          {index === 4 && '⭐'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.playerCell}>
                          <span className="avatar">{player.avatar}</span>
                          <span>{player.name}</span>
                        </div>
                      </td>
                      <td><strong>{player.wins}</strong></td>
                      <td>{player.totalGames}</td>
                      <td>
                        <span className={`badge ${
                          player.winPercentage >= 50 ? 'badge-success' : 
                          player.winPercentage >= 30 ? 'badge-warning' : 
                          'badge-danger'
                        }`}>
                          {player.winPercentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Matches Section */}
        {recentMatches.length > 0 && (
          <div className="card" style={{ marginTop: '24px' }}>
            <h2 className={styles.sectionTitle}>Recent Matches (Last 10)</h2>
            <div className="table-container">
              <table className={styles.recentMatchesTable}>
                <thead>
                  <tr>
                    <th>Game</th>
                    <th className={styles.hideOnMobile}>Type</th>
                    <th>Date</th>
                    <th className={styles.hideOnMobile}>Players</th>
                    <th className={styles.hideOnMobile}>Winner</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMatches.map((game) => (
                    <tr key={game.id}>
                      <td>
                        <strong>{game.title}</strong>
                        <div className={styles.mobileInfo}>
                          <span className={styles.mobileType}>{game.type}</span>
                        </div>
                      </td>
                      <td className={styles.hideOnMobile}>{game.type}</td>
                      <td className={styles.dateCell}>
                        {new Date(game.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className={styles.hideOnMobile}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {game.players.slice(0, 3).map(p => (
                            <span key={p.id} className="avatar" style={{ fontSize: '16px' }}>
                              {p.avatar}
                            </span>
                          ))}
                          {game.players.length > 3 && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              +{game.players.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={styles.hideOnMobile}>
                        {game.winner ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="avatar" style={{ fontSize: '20px' }}>
                              {game.players.find(p => p.id === game.winner)?.avatar}
                            </span>
                            <span>{game.players.find(p => p.id === game.winner)?.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>-</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          game.status === 'completed' ? 'badge-success' : 'badge-warning'
                        }`}>
                          {game.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '14px' }}
                          onClick={() => router.push(`/game/${game.id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNewGameModal && (
        <div className="modal-overlay" onClick={() => setShowNewGameModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Game</h2>
            
            <div className="form-group">
              <label>Game Type</label>
              <select value={gameType} onChange={(e) => setGameType(e.target.value)}>
                <option value="rummy">Rummy</option>
                <option value="ace">Ace</option>
                <option value="chess">Chess</option>
              </select>
            </div>

            {gameType !== 'chess' && gameType !== 'ace' && (
              <div className="form-group">
                <label>Max Points (Default: 120)</label>
                <input 
                  type="number" 
                  value={maxPoints}
                  onChange={(e) => setMaxPoints(e.target.value)}
                  min="50"
                  max="500"
                />
              </div>
            )}

            <div className="form-group">
              <label>
                Select Players {gameType === 'chess' ? '(exactly 2)' : '(minimum 2)'}
              </label>
              <div className={styles.playerList}>
                {players.map(player => (
                  <div 
                    key={player.id}
                    className={`${styles.playerItem} ${
                      selectedPlayers.includes(player.id) ? styles.selected : ''
                    } ${
                      gameType === 'chess' && selectedPlayers.length >= 2 && !selectedPlayers.includes(player.id) ? styles.disabled : ''
                    }`}
                    onClick={() => {
                      // For chess, prevent selecting more than 2 players
                      if (gameType === 'chess' && selectedPlayers.length >= 2 && !selectedPlayers.includes(player.id)) {
                        return;
                      }
                      handlePlayerToggle(player.id);
                    }}
                  >
                    <span className="avatar">{player.avatar}</span>
                    <span>{player.name}</span>
                    {selectedPlayers.includes(player.id) && <span>✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowNewGameModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleCreateGame}
                disabled={
                  gameType === 'chess' 
                    ? selectedPlayers.length !== 2 
                    : selectedPlayers.length < 2
                }
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

