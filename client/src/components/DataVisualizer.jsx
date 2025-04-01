import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { datasetService } from '../services/api';
import { Chart, registerables } from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';

// Register Chart.js components
Chart.register(...registerables);

const DataVisualizer = () => {
  const { id } = useParams();
  const [dataset, setDataset] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const chartContainerRef = useRef(null);

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
        
        // Set filtered data to all data initially
        setFilteredData(datasetData.sampleData || []);
        
        // Select first recommended chart if any
        if (analysisData.analysis.chartRecommendations.length > 0) {
          setSelectedChart(analysisData.analysis.chartRecommendations[0]);
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
    if (selectedChart && dataset) {
      generateChartData();
    }
  }, [selectedChart, filteredData]);

  useEffect(() => {
    if (dataset) {
      applyFilter();
    }
  }, [filterColumn, filterValue, dataset]);

  const applyFilter = () => {
    if (!filterColumn || !filterValue) {
      setFilteredData(dataset.sampleData || []);
      return;
    }

    const filtered = dataset.sampleData.filter(item => {
      const value = String(item[filterColumn]).toLowerCase();
      return value.includes(filterValue.toLowerCase());
    });

    setFilteredData(filtered);
  };

  const generateChartData = () => {
    if (!selectedChart || !filteredData.length) return;

    const chartType = selectedChart.type;
    const columns = selectedChart.columns;

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
        filteredData.forEach(item => {
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
        const sortedData = [...filteredData].sort((a, b) => {
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
        filteredData.forEach(item => {
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
            plugins: {
              legend: {
                position: 'right',
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
        const data = [];
        
        // Extract data points
        filteredData.forEach(item => {
          if (item[xColumn] !== undefined && item[yColumn] !== undefined) {
            data.push({
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
                data,
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                pointRadius: 6,
                pointHoverRadius: 8
              }
            ]
          },
          options: {
            responsive: true,
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
      
      case 'histogram': {
        const column = columns[0];
        const values = filteredData
          .map(item => Number(item[column]))
          .filter(val => !isNaN(val));
        
        if (values.length === 0) return;
        
        // Calculate bins for histogram
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
        const binWidth = (max - min) / binCount;
        
        const bins = Array(binCount).fill(0);
        const binLabels = [];
        
        // Create bin labels
        for (let i = 0; i < binCount; i++) {
          const start = min + i * binWidth;
          const end = min + (i + 1) * binWidth;
          binLabels.push(`${start.toFixed(2)} - ${end.toFixed(2)}`);
        }
        
        // Count values in each bin
        values.forEach(val => {
          const binIndex = Math.min(binCount - 1, Math.floor((val - min) / binWidth));
          bins[binIndex]++;
        });
        
        setChartData({
          type: 'bar',
          data: {
            labels: binLabels,
            datasets: [
              {
                label: `Frequency of ${column}`,
                data: bins,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: `Distribution of ${column}`
              }
            },
            scales: {
              x: {
                title: {
                  display: true,
                  text: column
                }
              },
              y: {
                title: {
                  display: true,
                  text: 'Frequency'
                },
                beginAtZero: true
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
    if (!chartData) return <p>Select a chart type to visualize data.</p>;

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

  if (loading) {
    return <div className="loading">Loading visualization data...</div>;
  }

  if (error) {
    return <div className="error-container">{error}</div>;
  }

  if (!dataset || !analysis) {
    return <div className="error-container">Data not found or could not be analyzed.</div>;
  }

  return (
    <div className="visualizer-container">
      <div className="visualizer-header">
        <div>
          <h1>Data Visualization</h1>
          <h2>{dataset.name}</h2>
        </div>
        <Link to={`/datasets/${id}`} className="btn btn-secondary">
          Back to Dataset
        </Link>
      </div>

      <div className="visualizer-content">
        <div className="chart-controls card">
          <h3>Chart Recommendations</h3>
          <div className="chart-selector">
            {analysis.chartRecommendations.map((chart, index) => (
              <button
                key={index}
                className={`chart-type ${selectedChart === chart ? 'active' : ''}`}
                onClick={() => setSelectedChart(chart)}
              >
                {chart.type}
                <span className="chart-tooltip">{chart.reason}</span>
              </button>
            ))}
          </div>

          <div className="filter-controls">
            <h3>Filter Data</h3>
            <div className="filter-form">
              <div className="form-group">
                <label htmlFor="filterColumn">Select Column:</label>
                <select
                  id="filterColumn"
                  className="form-control"
                  value={filterColumn}
                  onChange={(e) => setFilterColumn(e.target.value)}
                >
                  <option value="">-- None --</option>
                  {dataset.columns.map((column, index) => (
                    <option key={index} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>
              {filterColumn && (
                <div className="form-group">
                  <label htmlFor="filterValue">Filter Value:</label>
                  <input
                    type="text"
                    id="filterValue"
                    className="form-control"
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Enter filter value"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="data-insights">
            <h3>Data Insights</h3>
            {analysis.correlations.length > 0 ? (
              <div className="correlation-list">
                <h4>Detected Correlations:</h4>
                <ul>
                  {analysis.correlations.slice(0, 3).map((corr, index) => (
                    <li key={index}>
                      <strong>{corr.strength} {corr.direction}</strong> correlation 
                      between <em>{corr.column1}</em> and <em>{corr.column2}</em> 
                      ({corr.coefficient.toFixed(2)})
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>No significant correlations detected in the data.</p>
            )}
          </div>
        </div>

        <div className="chart-container card">
          <div className="chart-header">
            <h3>
              {selectedChart
                ? `${selectedChart.type} Chart: ${selectedChart.reason}`
                : 'Select a chart type'}
            </h3>
          </div>
          <div className="chart-area" ref={chartContainerRef}>
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataVisualizer; 