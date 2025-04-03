import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { datasetService } from '../services/api';
import { Chart, registerables } from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';

// Register Chart.js components
Chart.register(...registerables);

const AdvancedVisualizer = () => {
  const { id } = useParams();
  const [dataset, setDataset] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [dataInsights, setDataInsights] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch dataset details
        const datasetData = await datasetService.getDatasetById(id);
        setDataset(datasetData);
        
        // Fetch analysis data
        const analysisData = await datasetService.analyzeDataset(id);
        setAnalysis(analysisData.analysis);
        
        // Find the best chart recommendation
        if (analysisData.analysis.chartRecommendations.length > 0) {
          const bestRecommendation = analysisData.analysis.chartRecommendations[0];
          setSelectedChart(bestRecommendation);
          
          // Generate insights based on data and correlations
          generateDataInsights(analysisData.analysis, datasetData.sampleData);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError('Failed to load visualization data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (selectedChart && dataset) {
      generateChartData(selectedChart);
    }
  }, [selectedChart, dataset]);

  const generateDataInsights = (analysis, data) => {
    const insights = [];
    
    // Add insights about correlations
    if (analysis.correlations.length > 0) {
      analysis.correlations.slice(0, 3).forEach(corr => {
        const isPositive = corr.coefficient > 0;
        const strengthWord = corr.strength === 'strong' ? 'strong' : 
                            corr.strength === 'moderate' ? 'moderate' : 'weak';
                            
        insights.push({
          type: 'correlation',
          title: `${corr.strength.charAt(0).toUpperCase() + corr.strength.slice(1)} ${corr.direction} correlation detected`,
          description: `There is a ${strengthWord} ${corr.direction} correlation (${corr.coefficient.toFixed(2)}) between ${corr.column1} and ${corr.column2}. This means that as ${corr.column1} ${isPositive ? 'increases' : 'decreases'}, ${corr.column2} tends to ${isPositive ? 'increase' : 'decrease'} as well.`,
          recommendation: `Consider exploring this relationship with a scatter plot or regression analysis.`
        });
      });
    }
    
    // Add insights about data distribution for numeric columns
    Object.keys(analysis.statistics || {}).forEach(column => {
      const stats = analysis.statistics[column];
      if (stats.min !== null && stats.max !== null) {
        // Check for outliers (very simple detection)
        const range = stats.max - stats.min;
        const threshold = range * 0.2; // 20% of the range
        
        if (stats.max - stats.median > threshold * 2) {
          insights.push({
            type: 'distribution',
            title: `Potential outliers in ${column}`,
            description: `The maximum value (${stats.max.toFixed(2)}) is significantly higher than the median (${stats.median.toFixed(2)}), which could indicate outliers.`,
            recommendation: `Consider using a box plot to visualize the distribution and identify outliers.`
          });
        }
        
        // Check for skewed distributions
        if (Math.abs(stats.mean - stats.median) > threshold) {
          const skewDirection = stats.mean > stats.median ? 'right' : 'left';
          insights.push({
            type: 'distribution',
            title: `Skewed distribution in ${column}`,
            description: `The distribution of ${column} appears to be skewed to the ${skewDirection} (mean: ${stats.mean.toFixed(2)}, median: ${stats.median.toFixed(2)}).`,
            recommendation: `A histogram would help visualize this skewed distribution.`
          });
        }
      }
    });
    
    // Add categorical distribution insights if applicable
    const categoricalColumns = Object.keys(analysis.columnTypes)
      .filter(col => analysis.columnTypes[col] === 'string' || analysis.columnTypes[col] === 'boolean');
      
    categoricalColumns.forEach(column => {
      // Count occurrences of each category
      const counts = {};
      data.forEach(item => {
        const value = item[column];
        if (value !== undefined && value !== null) {
          counts[value] = (counts[value] || 0) + 1;
        }
      });
      
      const categories = Object.keys(counts);
      
      if (categories.length <= 5 && categories.length > 1) {
        insights.push({
          type: 'categorical',
          title: `${column} has ${categories.length} distinct categories`,
          description: `This categorical column has a manageable number of categories, making it ideal for pie or bar charts.`,
          recommendation: `A pie chart would effectively show the proportion of each category.`
        });
      } else if (categories.length > 5 && categories.length <= 10) {
        insights.push({
          type: 'categorical',
          title: `${column} has ${categories.length} distinct categories`,
          description: `This categorical column has several categories, which might be better visualized with a bar chart.`,
          recommendation: `A horizontal bar chart would work well for this number of categories.`
        });
      } else if (categories.length > 10) {
        insights.push({
          type: 'categorical',
          title: `${column} has many distinct categories (${categories.length})`,
          description: `This categorical column has too many categories for effective visualization in a single chart.`,
          recommendation: `Consider grouping some categories or focusing on the top 5-10 most frequent categories.`
        });
      }
    });
    
    // Add time series insights if applicable
    const dateColumns = Object.keys(analysis.columnTypes)
      .filter(col => analysis.columnTypes[col] === 'date');
      
    if (dateColumns.length > 0) {
      const numericColumns = Object.keys(analysis.columnTypes)
        .filter(col => analysis.columnTypes[col] === 'numeric');
        
      if (numericColumns.length > 0) {
        insights.push({
          type: 'timeSeries',
          title: `Time series analysis possible`,
          description: `Your dataset contains date column(s) (${dateColumns.join(', ')}) and numeric columns, enabling time series analysis.`,
          recommendation: `Line charts are excellent for visualizing how metrics change over time.`
        });
      }
    }
    
    setDataInsights(insights);
  };

  const generateChartData = (chartInfo) => {
    if (!chartInfo || !dataset.sampleData.length) return;

    const chartType = chartInfo.type;
    const columns = chartInfo.columns;

    if (columns.length === 0) return;

    // Generate chart colors
    const generateColors = (count) => {
      const colors = [];
      for (let i = 0; i < count; i++) {
        const hue = (i * 137) % 360; // Golden angle approximation for nice distribution
        colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
      }
      return colors;
    };

    // Generate chart data based on chart type
    switch (chartType) {
      case 'bar':
      case 'groupedBar': {
        const labels = [];
        const data = [];
        const column = columns[0];
        
        // Count occurrences of each category
        const counts = {};
        dataset.sampleData.forEach(item => {
          const value = item[column];
          if (value !== undefined && value !== null) {
            counts[value] = (counts[value] || 0) + 1;
          }
        });
        
        // Convert to arrays for Chart.js
        Object.keys(counts).forEach(key => {
          labels.push(key);
          data.push(counts[key]);
        });
        
        const colors = generateColors(labels.length);
        
        setChartData({
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: `Count of ${column}`,
                data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: `Distribution of ${column}`
              }
            }
          }
        });
        break;
      }
      
      case 'line': {
        const labels = [];
        const data = [];
        const dateColumn = columns[0];
        const valueColumn = columns[1];
        
        // Sort by date
        const sortedData = [...dataset.sampleData].sort((a, b) => {
          return new Date(a[dateColumn]) - new Date(b[dateColumn]);
        });
        
        // Extract data for chart
        sortedData.forEach(item => {
          if (item[dateColumn] && item[valueColumn] !== undefined) {
            labels.push(new Date(item[dateColumn]).toLocaleDateString());
            data.push(Number(item[valueColumn]));
          }
        });
        
        setChartData({
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: valueColumn,
                data,
                fill: false,
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `${valueColumn} over Time`
              }
            }
          }
        });
        break;
      }
      
      case 'pie': {
        const labels = [];
        const data = [];
        const column = columns[0];
        
        // Count occurrences of each category
        const counts = {};
        dataset.sampleData.forEach(item => {
          const value = item[column];
          if (value !== undefined && value !== null) {
            counts[value] = (counts[value] || 0) + 1;
          }
        });
        
        // Convert to arrays for Chart.js
        Object.keys(counts).forEach(key => {
          labels.push(key);
          data.push(counts[key]);
        });
        
        const colors = generateColors(labels.length);
        
        setChartData({
          type: 'pie',
          data: {
            labels,
            datasets: [
              {
                data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                display: true
              },
              title: {
                display: true,
                text: `Distribution of ${column}`
              }
            }
          }
        });
        break;
      }
      
      case 'scatter': {
        const xColumn = columns[0];
        const yColumn = columns[1];
        const scatterData = [];
        
        // Extract data points
        dataset.sampleData.forEach(item => {
          if (item[xColumn] !== undefined && item[yColumn] !== undefined) {
            scatterData.push({
              x: Number(item[xColumn]),
              y: Number(item[yColumn])
            });
          }
        });
        
        setChartData({
          type: 'scatter',
          data: {
            datasets: [
              {
                label: `${yColumn} vs ${xColumn}`,
                data: scatterData,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                pointRadius: 6,
                pointHoverRadius: 8
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Correlation between ${xColumn} and ${yColumn}`
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: xColumn
                }
              },
              y: {
                title: {
                  display: true,
                  text: yColumn
                }
              }
            }
          }
        });
        break;
      }
      
      default:
        setChartData(null);
    }
  };

  const renderChart = () => {
    if (!chartData) return null;

    switch (chartData.type) {
      case 'bar':
        return <Bar data={chartData.data} options={chartData.options} />;
      case 'line':
        return <Line data={chartData.data} options={chartData.options} />;
      case 'pie':
        return <Pie data={chartData.data} options={chartData.options} />;
      case 'scatter':
        return <Scatter data={chartData.data} options={chartData.options} />;
      default:
        return <p>Unsupported chart type.</p>;
    }
  };

  const selectRecommendation = (index) => {
    if (analysis && analysis.chartRecommendations.length > index) {
      setSelectedChart(analysis.chartRecommendations[index]);
    }
  };

  if (loading) {
    return <div className="loading">Loading AI-powered visualization...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  if (!dataset || !analysis) {
    return <div className="error-container">Data not found or could not be analyzed.</div>;
  }

  return (
    <div className="advanced-visualizer-container">
      <div className="visualizer-header">
        <div>
          <h1>AI-Powered Data Visualization</h1>
          <h2>{dataset.name}</h2>
        </div>
        <Link to={`/datasets/${id}`} className="btn btn-secondary">
          Back to Dataset
        </Link>
      </div>

      <div className="visualization-content advanced">
        <div className="visualization-sidebar card">
          <div className="ai-recommendation-section">
            <h3>AI Recommended Charts</h3>
            <p className="recommendation-intro">
              Based on your data structure and patterns, here are the most effective visualizations:
            </p>
            
            <div className="recommendation-list">
              {analysis.chartRecommendations.slice(0, 5).map((chart, index) => (
                <div 
                  key={index}
                  className={`recommendation-item ${selectedChart && selectedChart.type === chart.type && 
                             selectedChart.columns.join() === chart.columns.join() ? 'selected' : ''}`}
                  onClick={() => selectRecommendation(index)}
                >
                  <div className="recommendation-rank">{index + 1}</div>
                  <div className="recommendation-details">
                    <div className="recommendation-type">
                      {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart
                    </div>
                    <div className="recommendation-columns">
                      using {chart.columns.join(', ')}
                    </div>
                    <div className="recommendation-reason">
                      {chart.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="data-insights-section">
            <div className="insights-header">
              <h3>Data Insights</h3>
              <button 
                className="btn btn-sm btn-info"
                onClick={() => setShowExplanation(!showExplanation)}
              >
                {showExplanation ? 'Hide Explanations' : 'Show Explanations'}
              </button>
            </div>
            
            {dataInsights.length > 0 ? (
              <div className="insights-list">
                {dataInsights.map((insight, index) => (
                  <div key={index} className={`insight-item ${insight.type}`}>
                    <div className="insight-icon">
                      {insight.type === 'correlation' ? '🔄' : 
                       insight.type === 'distribution' ? '📊' :
                       insight.type === 'categorical' ? '🔢' : '📅'}
                    </div>
                    <div className="insight-content">
                      <h4>{insight.title}</h4>
                      {showExplanation && (
                        <>
                          <p>{insight.description}</p>
                          <p className="insight-recommendation">
                            <strong>Recommendation:</strong> {insight.recommendation}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No significant insights detected in this dataset.</p>
            )}
          </div>
        </div>

        <div className="main-visualization-area card">
          {selectedChart ? (
            <>
              <div className="visualization-explanation">
                <h3>Why this visualization works best</h3>
                <p>{selectedChart.reason}</p>
                
                {selectedChart.type === 'scatter' && analysis.correlations.length > 0 && (
                  <div className="correlation-details">
                    <h4>Correlation Details</h4>
                    {analysis.correlations
                      .filter(c => 
                        c.column1 === selectedChart.columns[0] && 
                        c.column2 === selectedChart.columns[1] ||
                        c.column1 === selectedChart.columns[1] && 
                        c.column2 === selectedChart.columns[0]
                      )
                      .map((corr, i) => (
                        <p key={i}>
                          The correlation coefficient is <strong>{corr.coefficient.toFixed(2)}</strong>, 
                          indicating a <strong>{corr.strength} {corr.direction}</strong> relationship.
                          This means that as one variable {corr.direction === 'positive' ? 'increases' : 'decreases'}, 
                          the other tends to {corr.direction === 'positive' ? 'increase' : 'decrease'} as well.
                        </p>
                      ))
                    }
                  </div>
                )}
                
                {selectedChart.type === 'pie' && (
                  <div className="distribution-details">
                    <h4>Distribution Explanation</h4>
                    <p>
                      Pie charts are most effective for showing proportions of categorical data.
                      Each slice represents a category's percentage of the whole.
                      This visualization works best when there are fewer than 7 categories.
                    </p>
                  </div>
                )}
                
                {selectedChart.type === 'line' && (
                  <div className="time-series-details">
                    <h4>Time Series Explanation</h4>
                    <p>
                      Line charts excel at showing trends over time.
                      The connected points reveal patterns, trends, and fluctuations.
                      This is ideal for tracking metrics over time periods.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="chart-area-container">
                <div className="chart-area" style={{ height: '500px' }}>
                  {renderChart()}
                </div>
              </div>
            </>
          ) : (
            <div className="no-chart-message">
              <p>Select an AI-recommended chart from the sidebar to view the visualization.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedVisualizer; 