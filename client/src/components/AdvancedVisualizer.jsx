import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { datasetService } from '../api';
import { Chart, registerables } from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import '../styles/DataVisualizer.css';

// Register Chart.js components
Chart.register(...registerables);

const AdvancedVisualizer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [dataset, setDataset] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableCharts, setAvailableCharts] = useState([]);
  const [selectedChartIds, setSelectedChartIds] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [activeTab, setActiveTab] = useState('ai-insights');
  const [chartLayout, setChartLayout] = useState('grid');
  const [chartSizeIndex, setChartSizeIndex] = useState(1);
  const chartSizes = ['400px', '500px', '600px'];
  const chartContainerRef = useRef(null);
  const chartsRef = useRef({});
  const [exportLoading, setExportLoading] = useState(false);
  const [insightsGenerated, setInsightsGenerated] = useState(false);
  const [aiInsights, setAiInsights] = useState([]);
  
  // AI page specific states
  const [insightGenerationProgress, setInsightGenerationProgress] = useState(0);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [selectedInsightIndex, setSelectedInsightIndex] = useState(null);

  useEffect(() => {
    // Function to fetch dataset and analysis data
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch dataset details
        const datasetData = await datasetService.getDatasetById(id);
        setDataset(datasetData);
        setOriginalData(datasetData.sampleData || []);
        
        // Try to fetch analysis data
        try {
          console.log('Fetching analysis data for dataset:', id);
          const analysisData = await datasetService.analyzeDataset(id);
          console.log('Analysis data received:', analysisData);
          
          if (analysisData && analysisData.analysis) {
            setAnalysis(analysisData.analysis);
            // Set filtered data to all data initially
            setFilteredData(datasetData.sampleData || []);
          } else {
            console.log('No analysis data available, starting analysis process');
            // If no analysis data, we don't show an error anymore - just start the generation process
            setFilteredData(datasetData.sampleData || []);
          }
        } catch (analysisErr) {
          console.error('Error fetching analysis:', analysisErr);
          console.log('Starting AI insights without analysis data');
          // We'll still proceed with what data we have
          setFilteredData(datasetData.sampleData || []);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load visualization data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if ((analysis || dataset) && filteredData.length > 0 && !insightsGenerated) {
      generateAIInsights();
    }
  }, [analysis, dataset, filteredData, insightsGenerated]);

  // Simulated AI insight generation
  const generateAIInsights = () => {
    setGeneratingInsights(true);
    setInsightGenerationProgress(0);
    
    const insights = [];
    
    // Create an interval to simulate progress
    const progressInterval = setInterval(() => {
      setInsightGenerationProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => {
            setInsightsGenerated(true);
            setGeneratingInsights(false);
          }, 500);
        }
        return newProgress;
      });
    }, 150);
    
    // Check if we have analysis data
    if (!analysis) {
      // Generate simple insights based on data structure when no analysis available
      if (dataset && dataset.columns && dataset.sampleData) {
        // Find numerical columns by simple type detection
        const numericalColumns = dataset.columns.filter(col => {
          const sampleValue = dataset.sampleData[0]?.[col];
          return typeof sampleValue === 'number' || !isNaN(Number(sampleValue));
        });
        
        // Find categorical columns
        const categoricalColumns = dataset.columns.filter(col => {
          const sampleValue = dataset.sampleData[0]?.[col];
          return typeof sampleValue === 'string' && isNaN(Number(sampleValue));
        });
        
        // Find possible date columns
        const possibleDateColumns = dataset.columns.filter(col => {
          const sampleValue = dataset.sampleData[0]?.[col];
          return !isNaN(Date.parse(sampleValue));
        });
        
        // Add insights for categorical data if available
        if (categoricalColumns.length > 0) {
          const selectedColumn = categoricalColumns[0];
          insights.push({
            title: `Category distribution for ${selectedColumn}`,
            description: `Analyzing the distribution of categories in ${selectedColumn} can reveal important patterns in your data.`,
            chartType: 'pie',
            chartConfig: {
              type: 'pie',
              title: `Categories in ${selectedColumn}`,
              category: selectedColumn
            },
            actionRecommendation: "Use a pie chart to visualize the proportion of each category in your data."
          });
        }
        
        // Add insights for numerical data if available
        if (numericalColumns.length > 0) {
          insights.push({
            title: `Distribution analysis for ${numericalColumns[0]}`,
            description: `Examining the distribution of ${numericalColumns[0]} can help you identify patterns and outliers.`,
            chartType: 'histogram',
            chartConfig: {
              type: 'bar',
              title: `Distribution of ${numericalColumns[0]}`,
              xAxis: numericalColumns[0],
              yAxis: 'count'
            },
            actionRecommendation: "Use a histogram to visualize the distribution of values."
          });
          
          // If we have 2+ numerical columns, suggest a scatter plot
          if (numericalColumns.length >= 2) {
            insights.push({
              title: `Relationship between ${numericalColumns[0]} and ${numericalColumns[1]}`,
              description: `Explore the relationship between ${numericalColumns[0]} and ${numericalColumns[1]} to identify patterns.`,
              chartType: 'scatter',
              chartConfig: {
                type: 'scatter',
                title: `${numericalColumns[0]} vs ${numericalColumns[1]}`,
                xAxis: numericalColumns[0],
                yAxis: numericalColumns[1]
              },
              actionRecommendation: "A scatter plot can help you identify correlations between variables."
            });
          }
        }
        
        // Add time series suggestions if we found date columns
        if (possibleDateColumns.length > 0 && numericalColumns.length > 0) {
          insights.push({
            title: `Time series analysis opportunity`,
            description: `Your data contains date information (${possibleDateColumns[0]}) and numerical metrics that can be tracked over time.`,
            chartType: 'line',
            chartConfig: {
              type: 'line',
              title: `${numericalColumns[0]} over time`,
              xAxis: possibleDateColumns[0],
              yAxis: numericalColumns[0]
            },
            actionRecommendation: "Use a line chart to track changes in metrics over time and identify trends."
          });
        }
      }
      
      // Set the generated insights after progress completes
      setTimeout(() => {
        setAiInsights(insights);
      }, 2000);
      
      return; // Exit early
    }
    
    // If we have analysis data, proceed with the original insight generation
    // Add AI-generated insights based on analysis data
    if (analysis.correlations) {
      // Find the strongest correlation
      let strongestCorrelation = { variables: [], value: 0 };
      
      Object.entries(analysis.correlations).forEach(([key, correlations]) => {
        Object.entries(correlations).forEach(([otherKey, value]) => {
          if (Math.abs(value) > Math.abs(strongestCorrelation.value) && key !== otherKey) {
            strongestCorrelation = {
              variables: [key, otherKey],
              value: value
            };
          }
        });
      });
      
      if (strongestCorrelation.value !== 0) {
        const correlationType = strongestCorrelation.value > 0 ? 'positive' : 'negative';
        const correlationStrength = Math.abs(strongestCorrelation.value) > 0.7 ? 'strong' : 
                                   (Math.abs(strongestCorrelation.value) > 0.4 ? 'moderate' : 'weak');
        
        insights.push({
          title: `${correlationStrength.charAt(0).toUpperCase() + correlationStrength.slice(1)} ${correlationType} correlation detected`,
          description: `There is a ${correlationStrength} ${correlationType} correlation (${strongestCorrelation.value.toFixed(2)}) between ${strongestCorrelation.variables[0]} and ${strongestCorrelation.variables[1]}.`,
          chartType: 'scatter',
          chartConfig: {
            type: 'scatter',
            title: `Correlation: ${strongestCorrelation.variables[0]} vs ${strongestCorrelation.variables[1]}`,
            xAxis: strongestCorrelation.variables[0],
            yAxis: strongestCorrelation.variables[1]
          },
          actionRecommendation: "Visualize this relationship with a scatter plot to see the pattern clearly."
        });
      }
    }
    
    // Add distribution insights for numerical columns
    if (analysis.statistics) {
      const numericalColumns = Object.keys(analysis.statistics).filter(
        col => analysis.columnTypes[col] === 'number'
      );
      
      if (numericalColumns.length > 0) {
        // Find a column with interesting distribution (e.g., has outliers)
        const interestingColumn = numericalColumns.find(col => 
          analysis.statistics[col].max - analysis.statistics[col].min > 
          5 * analysis.statistics[col].std
        ) || numericalColumns[0];
        
        insights.push({
          title: `Distribution analysis for ${interestingColumn}`,
          description: `The ${interestingColumn} has a range from ${analysis.statistics[interestingColumn].min.toFixed(2)} to ${analysis.statistics[interestingColumn].max.toFixed(2)} with an average of ${analysis.statistics[interestingColumn].mean.toFixed(2)}.`,
          chartType: 'histogram',
          chartConfig: {
            type: 'bar',
            title: `Distribution of ${interestingColumn}`,
            xAxis: interestingColumn,
            yAxis: 'count'
          },
          actionRecommendation: "Visualize this distribution with a histogram to identify patterns and outliers."
        });
      }
    }
    
    // Add categorical data insights
    if (analysis.columnTypes) {
      const categoricalColumns = Object.keys(analysis.columnTypes).filter(
        col => analysis.columnTypes[col] === 'string' || analysis.columnTypes[col] === 'boolean'
      );
      
      if (categoricalColumns.length > 0) {
        const selectedColumn = categoricalColumns[0];
        
        insights.push({
          title: `Category distribution for ${selectedColumn}`,
          description: `Analyzing the distribution of categories in ${selectedColumn} can reveal important patterns in your data.`,
          chartType: 'pie',
          chartConfig: {
            type: 'pie',
            title: `Categories in ${selectedColumn}`,
            category: selectedColumn
          },
          actionRecommendation: "Use a pie chart to visualize the proportion of each category in your data."
        });
      }
    }
    
    // Add time series insight if date columns exist
    if (analysis.columnTypes) {
      const dateColumns = Object.keys(analysis.columnTypes).filter(
        col => analysis.columnTypes[col] === 'date'
      );
      
      const numericalColumns = Object.keys(analysis.columnTypes).filter(
        col => analysis.columnTypes[col] === 'number'
      );
      
      if (dateColumns.length > 0 && numericalColumns.length > 0) {
        insights.push({
          title: `Time series analysis opportunity`,
          description: `Your data contains date information (${dateColumns[0]}) and numerical metrics that can be tracked over time.`,
          chartType: 'line',
          chartConfig: {
            type: 'line',
            title: `${numericalColumns[0]} over time`,
            xAxis: dateColumns[0],
            yAxis: numericalColumns[0]
          },
          actionRecommendation: "Use a line chart to track changes in metrics over time and identify trends."
        });
      }
    }
    
    // Add recommended chart types based on data structure
    if (analysis.chartRecommendations && analysis.chartRecommendations.length > 0) {
      analysis.chartRecommendations.forEach(recommendation => {
        insights.push({
          title: `AI Recommended Chart: ${recommendation.type}`,
          description: recommendation.reason,
          chartType: recommendation.type,
          chartConfig: {
            type: recommendation.type,
            title: recommendation.title,
            xAxis: recommendation.xAxis,
            yAxis: recommendation.yAxis,
            category: recommendation.category
          },
          actionRecommendation: `This ${recommendation.type} chart could help you identify valuable insights.`
        });
      });
    }
    
    // Set the generated insights after progress completes
    setTimeout(() => {
      setAiInsights(insights);
    }, 2000);
  };
  
  const renderInsight = (insight, index) => {
    const isSelected = selectedInsightIndex === index;
    
    return (
      <div 
        key={index} 
        className={`ai-insight-card ${isSelected ? 'selected' : ''}`}
        onClick={() => setSelectedInsightIndex(index)}
      >
        <div className="insight-header">
          <h3>{insight.title}</h3>
          <span className={`chart-badge ${insight.chartType}`}>{insight.chartType}</span>
        </div>
        <p className="insight-description">{insight.description}</p>
        <div className="insight-action">
          <p>{insight.actionRecommendation}</p>
          <button 
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation(); 
              // Add this chart to the visualization dashboard
              if (navigate) {
                // Navigate to standard visualization with this chart config
                navigate(`/visualize/${id}`, { 
                  state: { 
                    createChart: true,
                    chartConfig: insight.chartConfig
                  } 
                });
              }
            }}
          >
            Create Chart
          </button>
        </div>
      </div>
    );
  };
  
  const renderProgressBar = () => {
    return (
      <div className="ai-progress-container">
        <div className="ai-progress-bar">
          <div 
            className="ai-progress-fill" 
            style={{ width: `${insightGenerationProgress}%` }}
          ></div>
        </div>
        <div className="ai-progress-text">
          {insightGenerationProgress < 30 && "Analyzing data patterns..."}
          {insightGenerationProgress >= 30 && insightGenerationProgress < 60 && "Identifying correlations..."}
          {insightGenerationProgress >= 60 && insightGenerationProgress < 90 && "Generating visualization insights..."}
          {insightGenerationProgress >= 90 && "Finalizing recommendations..."}
        </div>
      </div>
    );
  };
  
  // Add a function to render the actual chart
  const renderChart = (chartConfig) => {
    if (!chartConfig) return null;
    
    const { type, title, xAxis, yAxis, category } = chartConfig;
    
    // Generate chart data based on the insight type
    let chartData = {};
    let chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 16 }
        },
        legend: {
          position: 'top',
        },
      }
    };
    
    switch (type) {
      case 'bar':
      case 'histogram': {
        // For histogram, group data into bins
        const values = filteredData.map(item => Number(item[xAxis])).filter(val => !isNaN(val));
        
        // Simple binning for histogram
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = 10;
        const binWidth = (max - min) / binCount;
        
        const bins = Array(binCount).fill(0);
        values.forEach(val => {
          const binIndex = Math.min(Math.floor((val - min) / binWidth), binCount - 1);
          bins[binIndex]++;
        });
        
        const labels = Array(binCount).fill(0).map((_, i) => 
          `${(min + i * binWidth).toFixed(1)} - ${(min + (i + 1) * binWidth).toFixed(1)}`
        );
        
        chartData = {
          labels,
          datasets: [{
            label: 'Frequency',
            data: bins,
            backgroundColor: 'rgba(75, 192, 192, 0.6)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        };
        
        chartOptions.scales = {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Count'
            }
          },
          x: {
            title: {
              display: true,
              text: xAxis
            }
          }
        };
        break;
      }
      
      case 'line': {
        // For line chart, assuming xAxis is a date/time
        const sortedData = [...filteredData].sort((a, b) => {
          return new Date(a[xAxis]) - new Date(b[xAxis]);
        });
        
        const labels = sortedData.map(item => {
          const date = new Date(item[xAxis]);
          return date.toLocaleDateString();
        });
        
        const data = sortedData.map(item => Number(item[yAxis]));
        
        chartData = {
          labels,
          datasets: [{
            label: yAxis,
            data,
            fill: false,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            tension: 0.1
          }]
        };
        
        chartOptions.scales = {
          y: {
            title: {
              display: true,
              text: yAxis
            }
          },
          x: {
            title: {
              display: true,
              text: xAxis
            }
          }
        };
        break;
      }
      
      case 'pie': {
        // Count occurrences of each category
        const counts = {};
        filteredData.forEach(item => {
          const value = item[category];
          if (value !== undefined && value !== null) {
            counts[value] = (counts[value] || 0) + 1;
          }
        });
        
        const labels = Object.keys(counts);
        const data = Object.values(counts);
        
        // Generate colors
        const colors = labels.map((_, i) => {
          const hue = (i * 137) % 360; // Golden angle for good color distribution
          return `hsla(${hue}, 70%, 60%, 0.7)`;
        });
        
        chartData = {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderColor: colors.map(color => color.replace('0.7', '1')),
            borderWidth: 1
          }]
        };
        
        chartOptions.plugins.legend.position = 'right';
        break;
      }
      
      case 'scatter': {
        // For scatter plot
        const data = filteredData.map(item => ({
          x: Number(item[xAxis]),
          y: Number(item[yAxis])
        })).filter(point => !isNaN(point.x) && !isNaN(point.y));
        
        chartData = {
          datasets: [{
            label: `${yAxis} vs ${xAxis}`,
            data,
            backgroundColor: 'rgba(153, 102, 255, 0.6)',
            borderColor: 'rgba(153, 102, 255, 1)',
            pointRadius: 6,
            pointHoverRadius: 8
          }]
        };
        
        chartOptions.scales = {
          y: {
            title: {
              display: true,
              text: yAxis
            }
          },
          x: {
            title: {
              display: true,
              text: xAxis
            }
          }
        };
        break;
      }
      
      default:
        return <div>Unsupported chart type</div>;
    }
    
    const ChartComponent = type === 'scatter' ? Scatter : 
                           type === 'pie' ? Pie : 
                           type === 'line' ? Line : Bar;
    
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <ChartComponent data={chartData} options={chartOptions} />
      </div>
    );
  };
  
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dataset information...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Unable to generate AI insights</h3>
          <p>{error}</p>
          <div className="error-actions">
            <Link to={`/datasets/${id}`} className="btn btn-secondary">
              Return to Dataset
            </Link>
            {!analysis && (
              <button 
                className="btn btn-primary"
                onClick={() => navigate(`/datasets/${id}`, { replace: true })}
              >
                Analyze Dataset First
              </button>
            )}
          </div>
        </div>
      );
    }
    
    if (generatingInsights) {
      return (
        <div className="ai-generation-container">
          <h2>Generating AI Insights</h2>
          <p>Our AI is analyzing your data to provide visualization recommendations and insights.</p>
          {renderProgressBar()}
        </div>
      );
    }
    
    return (
      <div className="ai-dashboard">
        <div className="ai-dashboard-header">
          <h1>AI-Powered Visualization</h1>
          <p>Discover deeper insights with our AI-generated visualization recommendations</p>
        </div>
        
        <div className="ai-dashboard-content">
          <div className="ai-insights-list">
            <h2>AI Insights</h2>
            {aiInsights.length > 0 ? (
              <div className="insights-container">
                {aiInsights.map((insight, index) => renderInsight(insight, index))}
              </div>
            ) : (
              <div className="no-insights">
                <p>No insights could be generated from the current dataset.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => generateAIInsights()}
                >
                  Regenerate Insights
                </button>
              </div>
            )}
          </div>
          
          <div className="ai-visualization-panel">
            <h2>Visualization Preview</h2>
            {selectedInsightIndex !== null ? (
              <div className="chart-preview">
                <h3>{aiInsights[selectedInsightIndex].chartConfig.title}</h3>
                <div className="chart-container">
                  {renderChart(aiInsights[selectedInsightIndex].chartConfig)}
                </div>
                <div className="chart-actions">
                  <button className="btn btn-primary">
                    Add to Dashboard
                  </button>
                  <button className="btn btn-secondary">
                    Edit Chart
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-chart-selected">
                <p>Select an insight from the left panel to preview a visualization</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const getChartIcon = (chartType) => {
    switch (chartType) {
      case 'bar':
        return '📊';
      case 'line':
        return '📈';
      case 'pie':
        return '🍩';
      case 'scatter':
        return '⚬';
      case 'histogram':
        return '📶';
      default:
        return '📊';
    }
  };
  
  return (
    <div className="visualizer-container">
      <div className="tab-navigation">
        <div className="tabs">
          <Link 
            to={`/visualize/${id}`} 
            className="tab-link standard"
          >
            Standard Visualization
          </Link>
          <div 
            className={`tab ai-insights active`}
          >
            AI-Powered Insights
          </div>
        </div>
        
        <div className="dataset-info">
          {dataset && (
            <>
              <h2 className="dataset-title">{dataset.name}</h2>
              <p className="dataset-meta">
                {dataset.sampleData?.length || 0} rows • {dataset.columns?.length || 0} columns
              </p>
            </>
          )}
        </div>
      </div>
      
      <div className="main-content-container">
        {renderMainContent()}
      </div>
    </div>
  );
};

export default AdvancedVisualizer; 