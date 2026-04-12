const MiniBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="empty-msg">No data available to display chart.</p>;
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="mini-chart-container">
      {data.map((item, index) => {
        const heightPercent = `${(item.count / maxCount) * 100}%`;
        
        return (
          <div key={index} className="mini-bar-group">
            <span className="mini-bar-count">{item.count}</span>
            <div className="mini-bar-wrapper">
              <div 
                className="mini-bar-fill" 
                style={{ height: heightPercent }}
              ></div>
            </div>
            <span className="mini-bar-label">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default MiniBarChart;
