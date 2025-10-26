'use client';

import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import styles from './page.module.css';

export default function HistoryPage() {
  const router = useRouter();
  const { games, players } = useGame();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown';
  };

  const getPlayerAvatar = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.avatar : '👤';
  };

  const sortedGames = [...games].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <div className={styles.historyPage}>
      <div className="container">
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🕒 Game History</h1>
            <p className={styles.subtitle}>View all your past games and their details</p>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="card">
            <div className={styles.empty}>
              <p>No games played yet. Start a new game to see it here!</p>
              <button 
                className="btn btn-primary" 
                onClick={() => router.push('/')}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.gamesGrid}>
            {sortedGames.map((game) => (
              <div 
                key={game.id} 
                className={styles.gameCard}
                onClick={() => router.push(`/game/${game.id}`)}
              >
                <div className={styles.gameCardHeader}>
                  <div>
                    <h3 className={styles.gameTitle}>{game.title}</h3>
                    <p className={styles.gameDate}>{formatDate(game.createdAt)}</p>
                  </div>
                  <span className={`badge ${
                    game.status === 'completed' ? 'badge-success' : 'badge-warning'
                  }`}>
                    {game.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                </div>

                <div className={styles.gameInfo}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Type:</span>
                    <span className={styles.infoValue}>{game.type}</span>
                  </div>
                  {game.type.toLowerCase() !== 'chess' && (
                    <>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Players:</span>
                        <span className={styles.infoValue}>{game.players.length}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Rounds:</span>
                        <span className={styles.infoValue}>{game.rounds.length}</span>
                      </div>
                      {game.type.toLowerCase() === 'rummy' && game.maxPoints && (
                        <div className={styles.infoItem}>
                          <span className={styles.infoLabel}>Max Points:</span>
                          <span className={styles.infoValue}>{game.maxPoints}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {game.status === 'completed' && (game.winner || (game.winners && game.winners.length > 0)) && (
                  <div className={styles.winner}>
                    <span className={styles.winnerLabel}>
                      🏆 {game.winners && game.winners.length > 1 ? 'Winners:' : 'Winner:'}
                    </span>
                    {game.winners && game.winners.length > 1 ? (
                      <div className={styles.winnerInfo} style={{ flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                        {game.winners.map(winnerId => (
                          <div key={winnerId} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="avatar" style={{ fontSize: '18px' }}>
                              {getPlayerAvatar(winnerId)}
                            </span>
                            <span className={styles.winnerName}>
                              {getPlayerName(winnerId)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.winnerInfo}>
                        <span className="avatar" style={{ fontSize: '20px' }}>
                          {getPlayerAvatar(game.winner)}
                        </span>
                        <span className={styles.winnerName}>
                          {getPlayerName(game.winner)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className={styles.playersList}>
                  <p className={styles.playersLabel}>Players:</p>
                  <div className={styles.players}>
                    {game.players.map(player => (
                      <div key={player.id} className={styles.playerChip}>
                        <span className="avatar" style={{ fontSize: '16px' }}>
                          {player.avatar}
                        </span>
                        <span className={styles.playerChipName}>{player.name}</span>
                        {game.type.toLowerCase() !== 'chess' && (
                          <span className={styles.playerPoints}>
                            {player.totalPoints} pts
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {game.type.toLowerCase() !== 'chess' && game.rounds.length > 0 && (
                  <div className={styles.roundsSummary}>
                    <p className={styles.roundsLabel}>Latest Rounds:</p>
                    <div className={styles.roundsList}>
                      {game.rounds.slice(-3).reverse().map((round) => (
                        <div key={round.id} className={styles.roundItem}>
                          <span className={styles.roundNumber}>R{round.roundNumber}</span>
                          <div className={styles.roundScores}>
                            {Object.entries(round.scores).slice(0, 3).map(([playerId, score]) => (
                              <span key={playerId} className={styles.miniScore}>
                                {getPlayerAvatar(playerId)} {score}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={styles.viewGame}>
                  View Details →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

