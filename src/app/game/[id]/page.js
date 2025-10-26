'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function GamePage({ params }) {
  const router = useRouter();
  const { getGame, addRound, addPlayerToGame, declareWinner, declareAceWinners, players, games, loading: gameLoading } = useGame();
  const { isAdmin, loading: authLoading } = useAuth();
  const [game, setGame] = useState(null);
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [showDeclareWinnerModal, setShowDeclareWinnerModal] = useState(false);
  const [showMarkAcePlayerModal, setShowMarkAcePlayerModal] = useState(false);
  const [showEndAceGameModal, setShowEndAceGameModal] = useState(false);
  const [roundScores, setRoundScores] = useState({});
  const [addPlayerError, setAddPlayerError] = useState('');
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState(null);
  const [selectedWinner, setSelectedWinner] = useState(null);
  const [selectedAcePlayer, setSelectedAcePlayer] = useState(null);
  const [selectedAceWinners, setSelectedAceWinners] = useState([]);

  // Update game whenever games context changes
  useEffect(() => {
    const gameData = getGame(params.id);
    if (gameData) {
      setGame(gameData);
      // Initialize round scores with empty strings only if not already set
      if (Object.keys(roundScores).length === 0) {
        const initialScores = {};
        gameData.players.forEach(player => {
          initialScores[player.id] = '';
        });
        setRoundScores(initialScores);
      }
    } else if (!gameLoading) {
      router.push('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, games, getGame, router, gameLoading]);

  // Reset round scores after adding a round
  const resetRoundScores = () => {
    if (game) {
      const newScores = {};
      game.players.forEach(player => {
        newScores[player.id] = '';
      });
      setRoundScores(newScores);
    }
  };

  const handleScoreChange = (playerId, score) => {
    setRoundScores(prev => ({
      ...prev,
      [playerId]: score === '' ? '' : score
    }));
  };

  const handleAddRound = () => {
    // Convert empty strings to 0 before saving
    const scoresWithDefaults = {};
    Object.keys(roundScores).forEach(playerId => {
      scoresWithDefaults[playerId] = parseInt(roundScores[playerId]) || 0;
    });
    
    addRound(params.id, scoresWithDefaults);
    
    // Reset scores for next round with empty strings
    resetRoundScores();
    setShowAddRoundModal(false);
    
    // Game will auto-update via useEffect watching 'games'
  };

  const handleConfirmAddPlayer = () => {
    if (!selectedPlayerToAdd) return;
    
    const result = addPlayerToGame(params.id, selectedPlayerToAdd);
    
    if (result && !result.success) {
      // Show error message
      setAddPlayerError(result.error);
      return;
    }
    
    // Success - close modal and clear state
    setAddPlayerError('');
    setSelectedPlayerToAdd(null);
    setShowAddPlayerModal(false);
    // Game will auto-update via useEffect watching 'games'
  };

  const handleDeclareWinner = () => {
    if (!selectedWinner) {
      alert('Please select a winner');
      return;
    }
    
    declareWinner(params.id, selectedWinner);
    setShowDeclareWinnerModal(false);
    setSelectedWinner(null);
    // Game will auto-update via useEffect watching 'games'
  };

  const handleMarkAcePlayer = () => {
    if (!selectedAcePlayer) {
      alert('Please select the loser');
      return;
    }
    
    // For Ace: Ace player (loser) gets 0 points, all others get 1 point
    const aceScores = {};
    game.players.forEach(player => {
      aceScores[player.id] = player.id === selectedAcePlayer ? 0 : 1;
    });
    
    addRound(params.id, aceScores);
    setShowMarkAcePlayerModal(false);
    setSelectedAcePlayer(null);
    // Game will auto-update via useEffect watching 'games'
  };

  const handleEndAceGame = () => {
    if (!game || game.players.length === 0) {
      alert('No players in game');
      return;
    }

    // Find the highest score
    const maxScore = Math.max(...game.players.map(p => p.totalPoints));
    
    // Get all players with the highest score
    const topPlayers = game.players.filter(p => p.totalPoints === maxScore);
    const winnerIds = topPlayers.map(p => p.id);
    
    // Pre-select the winners
    setSelectedAceWinners(winnerIds);
    setShowEndAceGameModal(true);
  };

  const handleConfirmAceWinners = () => {
    if (selectedAceWinners.length === 0) {
      alert('Please select at least one winner');
      return;
    }
    
    declareAceWinners(params.id, selectedAceWinners);
    setShowEndAceGameModal(false);
    setSelectedAceWinners([]);
    // Game will auto-update via useEffect watching 'games'
  };

  const toggleAceWinner = (playerId) => {
    setSelectedAceWinners(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const availablePlayers = players.filter(p => 
    !game?.players.find(gp => gp.id === p.id)
  );
  
  const isChess = game?.type.toLowerCase() === 'chess';
  const isAce = game?.type.toLowerCase() === 'ace';

  // Show loading state
  if (authLoading || gameLoading || !game) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Loading game...</p>
        </div>
      </div>
    );
  }

  const isRummy = game.type.toLowerCase() === 'rummy';
  const pageClass = isRummy ? `${styles.gamePage} rummy-background` : styles.gamePage;

  return (
      <div className={pageClass}>
        <div className="container">
          <div className={styles.gameHeader}>
            <div>
              <h1 className={styles.title}>{game.title}</h1>
              <p className={styles.subtitle}>
                {formatDate(game.createdAt)} • {game.type}
                {!isChess && !isAce && game.maxPoints && ` • Max Points: ${game.maxPoints}`}
              </p>
              {game.status === 'completed' && (
                <div className={styles.winnerBanner}>
                  {game.winners && game.winners.length > 1 ? (
                    <>
                      🎉 Winners: {game.winners.map(wId => game.players.find(p => p.id === wId)?.name).join(', ')} 🎉
                    </>
                  ) : (
                    <>
                      🎉 Winner: {game.players.find(p => p.id === game.winner)?.name} 🎉
                    </>
                  )}
                </div>
              )}
            </div>
            <div className={styles.headerActions}>
              {game.status === 'in_progress' && isAdmin() && (
                <>
                  {isChess ? (
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowDeclareWinnerModal(true)}
                    >
                      👑 Declare Winner
                    </button>
                  ) : isAce ? (
                    <>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowMarkAcePlayerModal(true)}
                      >
                        🎯 Mark Ace Player
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={handleEndAceGame}
                      >
                        🏁 End Game
                      </button>
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowAddPlayerModal(true);
                            setAddPlayerError('');
                            setSelectedPlayerToAdd(null);
                          }}
                          style={{ padding: '10px 16px' }}
                        >
                          ➕
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowAddRoundModal(true)}
                      >
                        📝 Add Round Points
                      </button>
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => {
                            setShowAddPlayerModal(true);
                            setAddPlayerError('');
                            setSelectedPlayerToAdd(null);
                          }}
                          style={{ padding: '10px 16px' }}
                        >
                          ➕
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
              {game.status === 'in_progress' && !isAdmin() && (
                <span className={styles.playerNote}>
                  {isChess ? 'Only admin can declare winner' : isAce ? 'Only admin can mark ace player, add players and end game' : 'Only admin can add rounds and players'}
                </span>
              )}
            </div>
          </div>

          {/* Current Standings */}
          <div className="card">
            <h2 className={styles.sectionTitle}>
              {isChess ? 'Players' : isAce ? 'Players (Points Won)' : 'Current Standings'}
            </h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    {!isChess && <th>{isAce ? 'Points Won' : 'Total Points'}</th>}
                    {!isChess && !isAce && <th>Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {/* For Ace: sort by points descending (highest first). For Rummy: sort ascending (lowest first) */}
                  {(isChess ? game.players : 
                    isAce ? [...game.players].sort((a, b) => b.totalPoints - a.totalPoints) :
                    [...game.players].sort((a, b) => a.totalPoints - b.totalPoints))
                    .map((player) => (
                    <tr key={player.id} className={player.isLost ? styles.lostPlayer : ''}>
                      <td>
                        <div className={styles.playerCell}>
                          <span className="avatar">{player.avatar}</span>
                          <span>{player.name}</span>
                        </div>
                      </td>
                      {!isChess && (
                        <td>
                          <strong className={styles.points}>{player.totalPoints}</strong>
                        </td>
                      )}
                      {!isChess && !isAce && (
                        <td>
                          {player.isLost ? (
                            <span className="badge badge-danger">Eliminated</span>
                          ) : (
                            <span className="badge badge-success">Active</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Game History - Only show for non-Chess games */}
          {!isChess && ((game.history && game.history.length > 0) || (game.rounds && game.rounds.length > 0)) && (
          <div className="card" style={{ marginTop: '24px' }}>
            <h2 className={styles.sectionTitle}>Game History</h2>
            <div className={styles.roundsContainer}>
              {/* Show history if available, otherwise fallback to rounds only */}
              {[...(game.history && game.history.length > 0 ? game.history : game.rounds || [])].reverse().map((event) => {
                // Player Added Event
                if (event.type === 'player_added') {
                  return (
                    <div key={event.id} className={styles.roundCard} style={{ 
                      background: 'rgba(16, 185, 129, 0.05)',
                      borderLeft: '4px solid var(--success)'
                    }}>
                      <div className={styles.roundHeader}>
                        <h3 style={{ color: 'var(--success)' }}>➕ Player Joined</h3>
                        <span className={styles.roundTime}>
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                      <div className={styles.roundScores}>
                        <div className={styles.scoreItem}>
                          <span className={styles.playerName}>
                            <span className="avatar" style={{ fontSize: '24px' }}>
                              {event.playerAvatar}
                            </span>
                            <strong>{event.playerName}</strong>
                          </span>
                      <span className={styles.scoreValue} style={{ color: 'var(--success)' }}>
                        {isAce ? `Joined with ${event.startingPoints} pts` : `Started with ${event.startingPoints} pts`}
                      </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Round Event (both new format with type='round' and old format without type)
                if (event.type === 'round' || !event.type) {
                  // Only show players who participated in this round (have scores)
                  const playersInRound = game.players.filter(player => 
                    event.scores && event.scores[player.id] !== undefined
                  );
                  
                  // For Ace games, find who got ace (0 points)
                  const acePlayer = isAce ? playersInRound.find(p => event.scores[p.id] === 0) : null;
                  
                  return (
                    <div key={event.id} className={styles.roundCard}>
                      <div className={styles.roundHeader}>
                        <h3>
                          Round {event.roundNumber}
                          {acePlayer && (
                            <span style={{ 
                              marginLeft: '12px', 
                              fontSize: '14px', 
                              color: 'var(--danger)',
                              fontWeight: 'normal'
                            }}>
                              🎯 Ace: {acePlayer.name}
                            </span>
                          )}
                        </h3>
                        <span className={styles.roundTime}>
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                      <div className={styles.roundScores}>
                        {/* Only show players who were in this round, sorted by their scores */}
                        {playersInRound
                          .sort((a, b) => {
                            // For Ace, sort by score descending (highest first), for Rummy ascending (lowest first)
                            return isAce 
                              ? (event.scores[b.id] || 0) - (event.scores[a.id] || 0)
                              : (event.scores[a.id] || 0) - (event.scores[b.id] || 0);
                          })
                          .map(player => {
                            const score = event.scores[player.id];
                            const isAceInRound = isAce && score === 0;
                            
                            return (
                              <div key={player.id} className={styles.scoreItem}>
                                <span className={styles.playerName}>
                                  <span className="avatar" style={{ fontSize: '20px' }}>
                                    {player.avatar}
                                  </span>
                                  {player.name}
                                  {isAceInRound && <span style={{ marginLeft: '8px', color: 'var(--danger)' }}>🎯</span>}
                                </span>
                                <span className={styles.scoreValue} style={isAceInRound ? { color: 'var(--danger)', fontWeight: '600' } : {}}>
                                  {isAce ? (score === 0 ? 'ACE' : `+${score} pt${score !== 1 ? 's' : ''}`) : `${score} pts`}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                }
                
                return null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Round Modal */}
      {showAddRoundModal && (
        <div className="modal-overlay" onClick={() => setShowAddRoundModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>📝 Add Round {game.rounds.length + 1} Points</h2>
            
            <div className={styles.scoreInputs}>
              {game.players.filter(p => !p.isLost).map(player => (
                <div key={player.id} className="form-group">
                  <label>
                    <span className="avatar" style={{ fontSize: '20px', marginRight: '8px' }}>
                      {player.avatar}
                    </span>
                    {player.name}
                  </label>
                  <input 
                    type="number" 
                    value={roundScores[player.id] || ''}
                    onChange={(e) => handleScoreChange(player.id, e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    min="0"
                    placeholder="Enter points"
                    autoFocus={player.id === game.players.filter(p => !p.isLost)[0]?.id}
                  />
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowAddRoundModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleAddRound}
              >
                Add Round Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddPlayerModal(false);
          setAddPlayerError('');
          setSelectedPlayerToAdd(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>➕ Add Player to Game</h2>
            
            {addPlayerError && (
              <div style={{ 
                padding: '12px', 
                marginBottom: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '2px solid var(--danger)',
                borderRadius: '8px',
                color: 'var(--danger)',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                ⚠️ {addPlayerError}
              </div>
            )}
            
            {availablePlayers.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                All players are already in this game
              </p>
            ) : (
              <div className={styles.playerList}>
                {availablePlayers.map(player => (
                  <div 
                    key={player.id}
                    className={`${styles.playerItem} ${
                      selectedPlayerToAdd === player.id ? styles.selected : ''
                    }`}
                    onClick={() => setSelectedPlayerToAdd(player.id)}
                  >
                    <span className="avatar">{player.avatar}</span>
                    <span>{player.name}</span>
                    {selectedPlayerToAdd === player.id && <span>✓</span>}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowAddPlayerModal(false);
                  setAddPlayerError('');
                  setSelectedPlayerToAdd(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleConfirmAddPlayer}
                disabled={!selectedPlayerToAdd}
              >
                Confirm Add Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Declare Winner Modal - For Chess Games */}
      {showDeclareWinnerModal && (
        <div className="modal-overlay" onClick={() => {
          setShowDeclareWinnerModal(false);
          setSelectedWinner(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>👑 Declare Winner</h2>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Select the player who won this chess game:
            </p>
            
            <div className={styles.playerList}>
              {game.players.map(player => (
                <div 
                  key={player.id}
                  className={`${styles.playerItem} ${
                    selectedWinner === player.id ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedWinner(player.id)}
                >
                  <span className="avatar" style={{ fontSize: '24px' }}>{player.avatar}</span>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{player.name}</span>
                  {selectedWinner === player.id && <span style={{ fontSize: '20px' }}>✓</span>}
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowDeclareWinnerModal(false);
                  setSelectedWinner(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleDeclareWinner}
                disabled={!selectedWinner}
              >
                Confirm Winner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Ace Player Modal - For Ace Games */}
      {showMarkAcePlayerModal && (
        <div className="modal-overlay" onClick={() => {
          setShowMarkAcePlayerModal(false);
          setSelectedAcePlayer(null);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🎯 Mark Ace Player (Loser)</h2>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Select the player who lost this round (gets 0 points, others get 1):
            </p>
            
            <div className={styles.playerList}>
              {game.players.map(player => (
                <div 
                  key={player.id}
                  className={`${styles.playerItem} ${
                    selectedAcePlayer === player.id ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedAcePlayer(player.id)}
                >
                  <span className="avatar" style={{ fontSize: '24px' }}>{player.avatar}</span>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{player.name}</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    ({player.totalPoints} pts)
                  </span>
                  {selectedAcePlayer === player.id && <span style={{ fontSize: '20px' }}>✓</span>}
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowMarkAcePlayerModal(false);
                  setSelectedAcePlayer(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleMarkAcePlayer}
                disabled={!selectedAcePlayer}
              >
                Mark as Ace (0 pts)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Ace Game Modal - Declare Winners */}
      {showEndAceGameModal && (
        <div className="modal-overlay" onClick={() => {
          setShowEndAceGameModal(false);
          setSelectedAceWinners([]);
        }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>🏁 End Game & Declare Winners</h2>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Players with highest points are pre-selected. Adjust if needed:
            </p>
            
            <div className={styles.playerList}>
              {[...game.players].sort((a, b) => b.totalPoints - a.totalPoints).map(player => (
                <div 
                  key={player.id}
                  className={`${styles.playerItem} ${
                    selectedAceWinners.includes(player.id) ? styles.selected : ''
                  }`}
                  onClick={() => toggleAceWinner(player.id)}
                >
                  <span className="avatar" style={{ fontSize: '24px' }}>{player.avatar}</span>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{player.name}</span>
                  <span style={{ fontSize: '14px', color: 'var(--success)', fontWeight: '600' }}>
                    {player.totalPoints} pts
                  </span>
                  {selectedAceWinners.includes(player.id) && <span style={{ fontSize: '20px' }}>✓</span>}
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowEndAceGameModal(false);
                  setSelectedAceWinners([]);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={handleConfirmAceWinners}
                disabled={selectedAceWinners.length === 0}
              >
                Declare Winner{selectedAceWinners.length > 1 ? 's' : ''} 🎉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

