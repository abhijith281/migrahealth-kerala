import React from 'react';

const StatsCard = ({ title, value, color = 'default', icon }) => {
  return (
    <div className={`stats-card color-${color}`}>
      <div className="stats-icon">{icon}</div>
      <div className="stats-info">
        <h3>{value}</h3>
        <p>{title}</p>
      </div>
    </div>
  );
};

export default StatsCard;
