import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import '../styles/Profile.css';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('chessmaster_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Helper to create chart data structure
  const createChartData = (stats) => {
    if (!stats) return null;
    const totalDraws = stats.whiteDraws + stats.blackDraws;
    return {
      labels: ['Wins as White', 'Wins as Black', 'Draws'],
      datasets: [
        {
          data: [stats.whiteWins, stats.blackWins, totalDraws],
          backgroundColor: [
            'rgba(212, 175, 55, 0.8)',  // Gold
            'rgba(169, 140, 44, 0.8)',  // Darker Gold
            'rgba(127, 105, 33, 0.8)',  // Bronzeish
          ],
          borderColor: 'rgba(0, 0, 0, 0.2)',
          borderWidth: 1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#e0e0e0',
          font: {
            family: 'Playfair Display',
          },
        },
      },
    },
  };

  if (!user) {
    return (
      <div className="profile-page-wrapper">
        <div className="profile-container">
          <button className="back-btn" onClick={() => navigate('/')}>← Home</button>
          <div className="profile-header">
            <h1 className="username">Please Log In</h1>
            <button className="back-btn" onClick={() => navigate('/signin')}>
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper">
      <div className="profile-container">
        <button className="back-btn" onClick={() => navigate('/')}>← Home</button>
        
        <div className="profile-header">
          <h1 className="username">{user.username}</h1>
          <div className="overall-stats">
            Total Games: <span>{user.totalGames || 0}</span>
          </div>
        </div>

        <div className="stats-grid">
          {/* Bullet Stats */}
          <div className="stats-card">
            <h2>Bullet Chess</h2>
            <div className="rating-display">
              <div className="rating-value">{user.bulletRating || 1200}</div>
              <div className="rating-label">Current Rating</div>
            </div>
            <div className="chart-container">
              {user.bulletStats ? (
                <Doughnut data={createChartData(user.bulletStats)} options={chartOptions} />
              ) : <p>No data yet</p>}
            </div>
          </div>

          {/* Blitz Stats */}
          <div className="stats-card">
            <h2>Blitz Chess</h2>
            <div className="rating-display">
              <div className="rating-value">{user.blitzRating || 1200}</div>
              <div className="rating-label">Current Rating</div>
            </div>
            <div className="chart-container">
              {user.blitzStats ? (
                <Doughnut data={createChartData(user.blitzStats)} options={chartOptions} />
              ) : <p>No data yet</p>}
            </div>
          </div>

          {/* Rapid Stats */}
          <div className="stats-card">
            <h2>Rapid Chess</h2>
            <div className="rating-display">
              <div className="rating-value">{user.rapidRating || 1200}</div>
              <div className="rating-label">Current Rating</div>
            </div>
            <div className="chart-container">
              {user.rapidStats ? (
                <Doughnut data={createChartData(user.rapidStats)} options={chartOptions} />
              ) : <p>No data yet</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;