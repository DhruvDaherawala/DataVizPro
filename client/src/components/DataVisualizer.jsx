import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { datasetService } from '../services/api';
import { Chart, registerables } from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import '../styles/DataVisualizer.css';

// Register Chart.js components
Chart.register(...registerables);

const DataVisualizer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [dataset, setDataset] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableCharts, setAvailableCharts] = useState([]);
  const [selectedChartIds, setSelectedChartIds] = useState([]);
  const [filterColumn, setFilterColumn] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [filterOperator, setFilterOperator] = useState('contains');
  const [filteredData, setFilteredData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [activeTab, setActiveTab] = useState('visualize');
  const [chartLayout, setChartLayout] = useState('grid');
  const [chartSizeIndex, setChartSizeIndex] = useState(1);
  const chartSizes = ['400px', '500px', '600px'];
  const chartContainerRef = useRef(null);
  const chartsRef = useRef({});
  const [activeCustomization, setActiveCustomization] = useState(null);
  const [customizations, setCustomizations] = useState({});
  const [exportLoading, setExportLoading] = useState(false);
  const [cleaningSteps, setCleaningSteps] = useState([]);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [filterBarOpen, setFilterBarOpen] = useState(false);
  const [multipleFilters, setMultipleFilters] = useState([]);
  const [chartCreator, setChartCreator] = useState({
    open: false,
    type: 'bar',
    columns: [],
    selectedColumns: [],
    xAxis: '',
    yAxis: '',
    aggregation: 'count',
    title: '',
    colorScheme: 'blue'
  });
  const [preprocessingOptions, setPreprocessingOptions] = useState({
    normalizeNumerical: false,
    fillMissingValues: false,
    removeOutliers: false,
    encodeCategories: false,
    splitData: false,
    trainSize: 80
  });
  // Add state for analysis metrics
  const [analysisMetrics, setAnalysisMetrics] = useState({
    correlations: [],
    dataQuality: null,
    outliers: {},
    distributions: {}
  });

  // Add this effect to check location state on mount
  useEffect(() => {
    // Check if we have state from navigation with an activeTab value
    if (location.state && location.state.activeTab) {
      const tabFromState = location.state.activeTab;
      console.log('Tab from navigation state:', tabFromState);
      
      if (['visualize', 'analyze', 'clean'].includes(tabFromState)) {
        setActiveTab(tabFromState);
        console.log(`Setting active tab to ${tabFromState} from navigation state`);
      }
    } else {
      // Also check URL params for tab value (for backwards compatibility)
      const queryParams = new URLSearchParams(window.location.search);
      const tabParam = queryParams.get('tab');
      
      if (tabParam && ['visualize', 'analyze', 'clean'].includes(tabParam)) {
        console.log('Tab from URL parameter:', tabParam);
        // If analysis tab is requested but analysis isn't loaded yet
        if (tabParam === 'analyze' && !analysis) {
          console.log('Analysis tab requested, waiting for data to load...');
        } else {
          setActiveTab(tabParam);
        }
      }
    }
  }, [location, analysis]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch dataset details
        const datasetData = await datasetService.getDatasetById(id);
        setDataset(datasetData);
        setOriginalData(datasetData.sampleData || []);
        
        // Try to fetch analysis data regardless of dataset.analyzed flag
        // This ensures we get analysis data if it exists
        try {
          console.log('Fetching analysis data for dataset:', id);
        const analysisData = await datasetService.analyzeDataset(id);
          console.log('Analysis data received:', analysisData);
          
          if (analysisData && analysisData.analysis) {
        setAnalysis(analysisData.analysis);
            
            // Check if we should switch to analysis tab based on URL
            const queryParams = new URLSearchParams(window.location.search);
            const tabParam = queryParams.get('tab');
            if (tabParam === 'analyze') {
              setActiveTab('analyze');
            }
          } else {
            console.log('No analysis data available');
          }
        } catch (analysisErr) {
          console.error('Error fetching analysis:', analysisErr);
          // Don't set the main error since dataset data loaded successfully
        }
        
        // Set filtered data to all data initially
        setFilteredData(datasetData.sampleData || []);
        
        // Add information about data loading to cleaning steps
        if (datasetData.sampleData && datasetData.sampleData.length > 0) {
          addCleaningStep(`Loaded ${datasetData.sampleData.length} rows from dataset`);
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
    if (analysis && dataset && filteredData.length > 0) {
      generateAllChartsData();
    }
  }, [analysis, filteredData]);

  useEffect(() => {
    if (dataset) {
      applyFilter();
    }
  }, [multipleFilters, dataset]);

  const applyFilter = () => {
    if (multipleFilters.length === 0) {
      setFilteredData(dataset.sampleData || []);
      return;
    }

    const filtered = dataset.sampleData.filter(item => {
      // All filters must pass (AND logic)
      return multipleFilters.every(filter => {
        const { column, operator, value } = filter;
        const itemValue = item[column];
        
        if (itemValue === undefined || itemValue === null) return false;
        
        const itemStr = String(itemValue).toLowerCase();
        const searchValue = String(value).toLowerCase();

        switch (operator) {
          case 'contains':
            return itemStr.includes(searchValue);
          case 'equals':
            return itemStr === searchValue;
          case 'startsWith':
            return itemStr.startsWith(searchValue);
          case 'endsWith':
            return itemStr.endsWith(searchValue);
          case 'greaterThan':
            return !isNaN(Number(itemValue)) && !isNaN(Number(value)) && 
                  Number(itemValue) > Number(value);
          case 'lessThan':
            return !isNaN(Number(itemValue)) && !isNaN(Number(value)) && 
                  Number(itemValue) < Number(value);
          case 'between':
            if (!value.includes(',')) return false;
            const [min, max] = value.split(',').map(v => parseFloat(v.trim()));
            return !isNaN(Number(itemValue)) && 
                   Number(itemValue) >= min && Number(itemValue) <= max;
          default:
            return itemStr.includes(searchValue);
        }
      });
    });

    setFilteredData(filtered);
    
    // Add as a cleaning step
    if (filtered.length !== dataset.sampleData.length) {
      const filterDescription = multipleFilters.map(f => 
        `${f.column} ${f.operator} "${f.value}"`
      ).join(' AND ');
      
      addCleaningStep(`Filtered data where ${filterDescription} (${filtered.length} of ${dataset.sampleData.length} records)`);
    }
  };

  const addFilter = () => {
    if (!filterColumn || !filterValue) return;
    
    const newFilter = {
      id: Date.now(),
      column: filterColumn,
      operator: filterOperator,
      value: filterValue
    };
    
    setMultipleFilters([...multipleFilters, newFilter]);
    
    // Reset form
    setFilterColumn('');
    setFilterValue('');
    setFilterOperator('contains');
    
    // Close filter bar after adding
    setFilterBarOpen(false);
  };

  const removeFilter = (filterId) => {
    setMultipleFilters(multipleFilters.filter(f => f.id !== filterId));
  };

  const clearAllFilters = () => {
    setMultipleFilters([]);
    setFilterColumn('');
    setFilterValue('');
    setFilterOperator('contains');
  };

  const addCleaningStep = (description) => {
    const newStep = {
      id: Date.now(),
      description,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setCleaningSteps(prev => [newStep, ...prev]);
  };

  // Enhanced version of cleanData function with more data cleaning capabilities
  const cleanData = () => {
    let cleaned = [...filteredData];
    let cleaningActions = [];
    
    // Check each column
    if (dataset && dataset.columns) {
      dataset.columns.forEach(column => {
        // Count missing values
        const missingCount = cleaned.filter(row => 
          row[column] === null || row[column] === undefined || row[column] === ""
        ).length;
        
        // Handle missing values if significant
        if (missingCount > 0) {
          // For numerical columns, replace with mean
          if (analysis.columnTypes[column] === 'numeric') {
            const values = cleaned
              .map(row => parseFloat(row[column]))
              .filter(val => !isNaN(val));
              
            if (values.length > 0) {
              const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
              
              cleaned = cleaned.map(row => {
                if (row[column] === null || row[column] === undefined || row[column] === "" || isNaN(parseFloat(row[column]))) {
                  return { ...row, [column]: mean };
                }
                return row;
              });
              
              cleaningActions.push(`Replaced ${missingCount} missing values in '${column}' with mean (${mean.toFixed(2)})`);
            }
          } 
          // For categorical, replace with most frequent
          else if (analysis.columnTypes[column] === 'string' || analysis.columnTypes[column] === 'boolean') {
            const valueCounts = {};
            cleaned.forEach(row => {
              if (row[column] !== null && row[column] !== undefined && row[column] !== "") {
                valueCounts[row[column]] = (valueCounts[row[column]] || 0) + 1;
              }
            });
            
            let mostFrequent = null;
            let highestCount = 0;
            
            Object.keys(valueCounts).forEach(value => {
              if (valueCounts[value] > highestCount) {
                mostFrequent = value;
                highestCount = valueCounts[value];
              }
            });
            
            if (mostFrequent !== null) {
              cleaned = cleaned.map(row => {
                if (row[column] === null || row[column] === undefined || row[column] === "") {
                  return { ...row, [column]: mostFrequent };
                }
                return row;
              });
              
              cleaningActions.push(`Replaced ${missingCount} missing values in '${column}' with most frequent value ('${mostFrequent}')`);
            }
          }
        }
        
        // Check for outliers in numeric columns
        if (analysis.columnTypes[column] === 'numeric') {
          const values = cleaned
            .map(row => parseFloat(row[column]))
            .filter(val => !isNaN(val));
            
          if (values.length > 4) {  // Need enough data points
            values.sort((a, b) => a - b);
            const q1Index = Math.floor(values.length * 0.25);
            const q3Index = Math.floor(values.length * 0.75);
            const q1 = values[q1Index];
            const q3 = values[q3Index];
            const iqr = q3 - q1;
            const lowerBound = q1 - (1.5 * iqr);
            const upperBound = q3 + (1.5 * iqr);
            
            const outliers = cleaned.filter(row => {
              const val = parseFloat(row[column]);
              return !isNaN(val) && (val < lowerBound || val > upperBound);
            });
            
            if (outliers.length > 0 && preprocessingOptions.removeOutliers) {
              // Replace outliers with boundary values
              cleaned = cleaned.map(row => {
                const val = parseFloat(row[column]);
                if (!isNaN(val) && val < lowerBound) {
                  return { ...row, [column]: lowerBound };
                }
                if (!isNaN(val) && val > upperBound) {
                  return { ...row, [column]: upperBound };
                }
                return row;
              });
              
              cleaningActions.push(`Capped ${outliers.length} outliers in '${column}' to range [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`);
            } else if (outliers.length > 0) {
              cleaningActions.push(`Detected ${outliers.length} outliers in '${column}' (values outside ${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)})`);
            }
          }
        }
        
        // Normalize numerical data if requested
        if (preprocessingOptions.normalizeNumerical && analysis.columnTypes[column] === 'numeric') {
          const values = cleaned
            .map(row => parseFloat(row[column]))
            .filter(val => !isNaN(val));
          
          if (values.length > 1) {
            const min = Math.min(...values);
            const max = Math.max(...values);
            
            if (max > min) {
              cleaned = cleaned.map(row => {
                const val = parseFloat(row[column]);
                if (!isNaN(val)) {
                  const normalized = (val - min) / (max - min);
                  return { ...row, [column]: normalized };
                }
                return row;
              });
              
              cleaningActions.push(`Normalized values in '${column}' to range [0,1]`);
            }
          }
        }
      });
      
      // Calculate correlations between columns
      const calculateCorrelations = () => {
        // Find numerical columns
        const numericColumns = dataset.columns.filter(col => 
          analysis.columnTypes[col] === 'numeric'
        );
        
        if (numericColumns.length < 2) return [];
        
        // Calculate correlations matrix
        const correlations = [];
        
        // Store significant correlations for reporting
        const significantCorrelations = [];
        
        for (let i = 0; i < numericColumns.length; i++) {
          const colX = numericColumns[i];
          correlations[i] = [];
          
          for (let j = 0; j < numericColumns.length; j++) {
            const colY = numericColumns[j];
            
            // If same column, correlation is 1
            if (i === j) {
              correlations[i][j] = 1;
              continue;
            }
            
            // Get values as numbers
            const values = cleaned
              .filter(row => 
                row[colX] !== null && row[colX] !== undefined && row[colX] !== "" &&
                row[colY] !== null && row[colY] !== undefined && row[colY] !== ""
              )
              .map(row => ({
                x: parseFloat(row[colX]),
                y: parseFloat(row[colY])
              }))
              .filter(val => !isNaN(val.x) && !isNaN(val.y));
            
            // Calculate correlation
            if (values.length > 5) { // Need enough data points
              // Calculate means
              const meanX = values.reduce((sum, val) => sum + val.x, 0) / values.length;
              const meanY = values.reduce((sum, val) => sum + val.y, 0) / values.length;
              
              // Calculate covariance and variances
              let covariance = 0;
              let varX = 0;
              let varY = 0;
              
              values.forEach(val => {
                const diffX = val.x - meanX;
                const diffY = val.y - meanY;
                covariance += diffX * diffY;
                varX += diffX * diffX;
                varY += diffY * diffY;
              });
              
              // Calculate correlation
              const correlation = covariance / (Math.sqrt(varX) * Math.sqrt(varY));
              correlations[i][j] = correlation;
              
              // Store significant correlations (absolute value > 0.7)
              if (Math.abs(correlation) > 0.7 && i < j) {
                significantCorrelations.push({
                  columns: [colX, colY],
                  correlation: correlation,
                  strength: Math.abs(correlation) > 0.9 ? 'very strong' : 'strong',
                  direction: correlation > 0 ? 'positive' : 'negative'
                });
              }
            } else {
              correlations[i][j] = 0;
            }
          }
        }
        
        return {
          matrix: correlations,
          columns: numericColumns,
          significant: significantCorrelations
        };
      };
      
      // Calculate and report correlations
      const correlationData = calculateCorrelations();
      
      // Report significant correlations found
      if (correlationData.significant.length > 0) {
        correlationData.significant.forEach(corr => {
          cleaningActions.push(`Found ${corr.strength} ${corr.direction} correlation (${corr.correlation.toFixed(2)}) between '${corr.columns[0]}' and '${corr.columns[1]}'`);
        });
        
        // Update analysis metrics with correlation data
        setAnalysisMetrics(prev => ({
          ...prev, 
          correlations: correlationData
        }));
      }
    }
    
    if (cleaningActions.length > 0) {
      setFilteredData(cleaned);
      cleaningActions.forEach(action => addCleaningStep(action));
    } else {
      addCleaningStep("No cleaning actions needed - data is already clean");
    }
  };
  
  const preprocessData = () => {
    // This would normally send data to the server for preprocessing
    // Here we'll just log what would happen and add it to cleaning steps
    
    const steps = [];
    
    if (preprocessingOptions.normalizeNumerical) {
      steps.push("Normalize all numerical features to range [0,1]");
    }
    
    if (preprocessingOptions.fillMissingValues) {
      steps.push("Fill missing values (mean for numerical, mode for categorical)");
    }
    
    if (preprocessingOptions.removeOutliers) {
      steps.push("Remove statistical outliers using IQR method");
    }
    
    if (preprocessingOptions.encodeCategories) {
      steps.push("One-hot encode categorical variables");
    }
    
    if (preprocessingOptions.splitData) {
      steps.push(`Split data into training (${preprocessingOptions.trainSize}%) and testing (${100-preprocessingOptions.trainSize}%) sets`);
    }
    
    // Log these steps
    steps.forEach(step => addCleaningStep(`[Preprocessing] ${step}`));
    
    // In a real implementation, we would call an API endpoint
    alert("Data preprocessing options applied! In a production environment, this would prepare your data for machine learning models.");
  };

  const generateAllChartsData = () => {
    // Initialize with empty charts - no automatic suggestions
    setAvailableCharts([]);
    
    // Initialize customizations with empty object
    setCustomizations({});
  };

  const generateSingleChartData = (chartInfo) => {
    if (!chartInfo || !filteredData.length) return null;

    const chartType = chartInfo.type;
    const columns = chartInfo.columns;

    if (columns.length === 0) return null;

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
        
        return {
          id: `${chartType}-${columns.join('-')}`,
          type: 'bar',
          title: chartInfo.reason,
          chartType: chartType,
          columns: columns,
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
        };
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
        
        return {
          id: `${chartType}-${columns.join('-')}`,
          type: 'line',
          title: chartInfo.reason,
          chartType: chartType,
          columns: columns,
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
        };
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
        
        return {
          id: `${chartType}-${columns.join('-')}`,
          type: 'pie',
          title: chartInfo.reason,
          chartType: chartType,
          columns: columns,
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
        };
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
        
        return {
          id: `${chartType}-${columns.join('-')}`,
          type: 'scatter',
          title: chartInfo.reason,
          chartType: chartType,
          columns: columns,
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
        };
      }
      
      case 'histogram': {
        const column = columns[0];
        const values = filteredData
          .map(item => Number(item[column]))
          .filter(val => !isNaN(val));
        
        if (values.length === 0) return null;
        
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
        
        return {
          id: `${chartType}-${columns.join('-')}`,
          type: 'bar',
          title: chartInfo.reason,
          chartType: chartType,
          columns: columns,
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
            maintainAspectRatio: false,
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
        };
      }
      
      default:
        return null;
    }
  };

  const renderChart = (chartData) => {
    if (!chartData) return null;
    
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3>{customizations[chartData.id]?.title || chartData.title || 'Chart'}</h3>
          <div className="chart-actions">
            <button 
              className="btn-icon" 
              onClick={() => openChartCustomization(chartData.id)}
              title="Customize Chart"
            >
              <span className="material-icons">edit</span>
            </button>
            <button 
              className="btn-icon" 
              onClick={() => exportChart(chartData.id)}
              title="Export Chart"
            >
              <span className="material-icons">download</span>
            </button>
          </div>
        </div>
        <div className="chart-body">
          {chartData.type === 'bar' && 
            <Bar data={chartData.data} options={chartData.options} />
          }
          {chartData.type === 'line' && 
            <Line data={chartData.data} options={chartData.options} />
          }
          {chartData.type === 'pie' && 
            <Pie data={chartData.data} options={chartData.options} />
          }
          {chartData.type === 'scatter' && 
            <Scatter data={chartData.data} options={chartData.options} />
          }
        </div>
        {chartData.description && (
          <div className="chart-description">
            <p>{chartData.description}</p>
          </div>
        )}
      </div>
    );
  };

  const toggleChartSelection = (chartId) => {
    if (selectedChartIds.includes(chartId)) {
      setSelectedChartIds(selectedChartIds.filter(id => id !== chartId));
    } else {
      setSelectedChartIds([...selectedChartIds, chartId]);
    }
    
    // Don't change the layout automatically when selecting/deselecting
    // This keeps the chart sizes consistent
  };

  const toggleAllCharts = () => {
    if (selectedChartIds.length === availableCharts.length) {
      setSelectedChartIds([]);
    } else {
      setSelectedChartIds(availableCharts.map(chart => chart.id));
    }
  };

  const toggleChartLayout = () => {
    // Toggle between grid and single layout
    const newLayout = chartLayout === 'grid' ? 'single' : 'grid';
    setChartLayout(newLayout);
    
    // For single layout, if multiple charts are selected, just keep the first one
    if (newLayout === 'single' && selectedChartIds.length > 1) {
      setSelectedChartIds([selectedChartIds[0]]);
    }
  };

  const changeChartSize = () => {
    setChartSizeIndex((chartSizeIndex + 1) % chartSizes.length);
  };

  const exportChart = async (chartId) => {
    try {
      setExportLoading(true);
      const chartRef = chartsRef.current[chartId];
      if (!chartRef) {
        console.error("Chart reference not found");
        return;
      }

      const chartContainer = chartRef.closest('.chart-item');
      
      if (chartContainer) {
        const canvas = await html2canvas(chartContainer);
        
        // Create download link
        const link = document.createElement('a');
        const chartData = availableCharts.find(c => c.id === chartId);
        const fileName = `chart-${chartData?.chartType || 'visualization'}-${new Date().getTime()}.png`;
        
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting chart:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const exportAllCharts = async () => {
    try {
      setExportLoading(true);
      if (chartContainerRef.current && selectedChartIds.length > 0) {
        const canvas = await html2canvas(chartContainerRef.current);
        
        // Create download link
        const link = document.createElement('a');
        const fileName = `dataviz-dashboard-${new Date().getTime()}.png`;
        
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting all charts:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const openChartCustomization = (chartId) => {
    setActiveCustomization(chartId);
  };

  const updateChartCustomization = (chartId, field, value) => {
    setCustomizations(prev => ({
      ...prev,
      [chartId]: {
        ...prev[chartId],
        [field]: value
      }
    }));
  };

  const applyChartCustomization = (chartId) => {
    const chartIdx = availableCharts.findIndex(c => c.id === chartId);
    if (chartIdx === -1) return;

    const chartCopy = JSON.parse(JSON.stringify(availableCharts[chartIdx]));
    const custom = customizations[chartId];

    // Apply customizations
    if (chartCopy.options.plugins.title) {
      chartCopy.options.plugins.title.text = custom.title;
    }
    
    if (chartCopy.options.plugins.legend) {
      chartCopy.options.plugins.legend.display = custom.showLegend;
    }

    // Apply colors based on chart type
    if (chartCopy.type === 'pie') {
      // For pie charts, we might want to customize the whole color array
      if (custom.colorScheme) {
        applyColorScheme(chartCopy, custom.colorScheme);
      }
    } else {
      // For non-pie charts
      if (custom.backgroundColor && chartCopy.data.datasets && chartCopy.data.datasets.length > 0) {
        // Check if backgroundColor is an array
        if (Array.isArray(chartCopy.data.datasets[0].backgroundColor)) {
          // For bar charts with multiple bars, fill all with the same color
          chartCopy.data.datasets[0].backgroundColor = chartCopy.data.datasets[0].backgroundColor.map(() => custom.backgroundColor);
        } else {
          // For line and scatter charts
          chartCopy.data.datasets[0].backgroundColor = custom.backgroundColor;
        }
      }
      
      if (custom.borderColor && chartCopy.data.datasets && chartCopy.data.datasets.length > 0) {
        // Check if borderColor is an array
        if (Array.isArray(chartCopy.data.datasets[0].borderColor)) {
          // For bar charts with multiple bars
          chartCopy.data.datasets[0].borderColor = chartCopy.data.datasets[0].borderColor.map(() => custom.borderColor);
        } else {
          // For line and scatter charts
          chartCopy.data.datasets[0].borderColor = custom.borderColor;
        }
      }
    }

    // Update the chart in the availableCharts array
    const newCharts = [...availableCharts];
    newCharts[chartIdx] = chartCopy;
    setAvailableCharts(newCharts);
    setActiveCustomization(null);
  };

  // Get currently visible charts
  const visibleCharts = availableCharts.filter(chart => 
    selectedChartIds.includes(chart.id)
  );

  // Function to create a custom chart
  const createCustomChart = () => {
    if (!chartCreator.type || !chartCreator.title || 
        (chartCreator.type !== 'pie' && !chartCreator.xAxis) || 
        (chartCreator.type !== 'pie' && !chartCreator.yAxis)) {
      alert('Please fill in all required fields for the chart');
      return;
    }
    
    // Create chart config
    let chartConfig = {
      type: chartCreator.type,
      columns: chartCreator.type === 'pie' ? 
              [chartCreator.xAxis] : 
              [chartCreator.xAxis, chartCreator.yAxis],
      reason: `Custom ${chartCreator.type} chart created by user`
    };
    
    // Generate and add the new chart
    const newChart = generateSingleChartData(chartConfig);
    
    if (newChart) {
      // Customize the title
      newChart.options.plugins.title.text = chartCreator.title;
      
      // Apply color scheme if specified
      applyColorScheme(newChart, chartCreator.colorScheme);
      
      // Add to available charts
      setAvailableCharts([...availableCharts, newChart]);
      
      // Select the new chart
      setSelectedChartIds([...selectedChartIds, newChart.id]);
      
      // Add to customizations
      setCustomizations({
        ...customizations,
        [newChart.id]: {
          title: newChart.options.plugins.title.text,
          backgroundColor: newChart.type === 'pie' ? null : newChart.data.datasets[0].backgroundColor,
          borderColor: newChart.type === 'pie' ? null : newChart.data.datasets[0].borderColor,
          showLegend: newChart.options.plugins.legend?.display ?? true,
          colorScheme: chartCreator.colorScheme
        }
      });
      
      // Reset the chart creator
      setChartCreator({
        open: false,
        type: 'bar',
        columns: [],
        selectedColumns: [],
        xAxis: '',
        yAxis: '',
        aggregation: 'count',
        title: '',
        colorScheme: 'blue'
      });
    }
  };

  // Preview chart before creating
  const previewChartConfig = () => {
    if (!chartCreator.type || !chartCreator.title || 
        (chartCreator.type !== 'pie' && !chartCreator.xAxis) || 
        (chartCreator.type !== 'pie' && !chartCreator.yAxis)) {
      return null;
    }
    
    // Create chart config
    let chartConfig = {
      type: chartCreator.type,
      columns: chartCreator.type === 'pie' ? 
              [chartCreator.xAxis] : 
              [chartCreator.xAxis, chartCreator.yAxis],
      reason: `Custom ${chartCreator.type} chart created by user`
    };
    
    // Generate chart preview
    const previewChart = generateSingleChartData(chartConfig);
    
    if (previewChart) {
      // Customize the title
      previewChart.options.plugins.title.text = chartCreator.title;
      
      // Apply color scheme if specified
      applyColorScheme(previewChart, chartCreator.colorScheme);
      
      return previewChart;
    }
    
    return null;
  };
  
  const applyColorScheme = (chart, scheme) => {
    let backgroundColor, borderColor;
    
    switch (scheme) {
      case 'blue':
        backgroundColor = 'rgba(54, 162, 235, 0.7)';
        borderColor = 'rgba(54, 162, 235, 1)';
        break;
      case 'green':
        backgroundColor = 'rgba(75, 192, 92, 0.7)';
        borderColor = 'rgba(75, 192, 92, 1)';
        break;
      case 'red':
        backgroundColor = 'rgba(255, 99, 132, 0.7)';
        borderColor = 'rgba(255, 99, 132, 1)';
        break;
      case 'purple':
        backgroundColor = 'rgba(153, 102, 255, 0.7)';
        borderColor = 'rgba(153, 102, 255, 1)';
        break;
      case 'orange':
        backgroundColor = 'rgba(255, 159, 64, 0.7)';
        borderColor = 'rgba(255, 159, 64, 1)';
        break;
      case 'gradient':
        backgroundColor = 'linear-gradient(to right, rgba(54, 162, 235, 0.7), rgba(153, 102, 255, 0.7))';
        borderColor = 'rgba(54, 162, 235, 1)';
        break;
      default:
        backgroundColor = 'rgba(54, 162, 235, 0.7)';
        borderColor = 'rgba(54, 162, 235, 1)';
    }
    
    // Apply colors based on chart type
    if (chart.type === 'pie') {
      // For pie charts, generate a color array based on the scheme
      const baseColor = borderColor.replace('1)', '');
      const colors = [];
      const count = chart.data.labels.length;
      
      for (let i = 0; i < count; i++) {
        const opacity = 0.6 + (i * 0.4 / count); // Vary opacity
        colors.push(`${baseColor}${opacity})`);
      }
      
      chart.data.datasets[0].backgroundColor = colors;
      chart.data.datasets[0].borderColor = colors.map(c => c.replace(/[\d.]+\)$/, '1)'));
    } else {
      // For other charts
      if (Array.isArray(chart.data.datasets[0].backgroundColor)) {
        // Handle array backgrounds (like in bar charts)
        const count = chart.data.datasets[0].backgroundColor.length;
        const colors = [];
        
        for (let i = 0; i < count; i++) {
          const hue = (i * 30 + parseInt(scheme === 'blue' ? 210 : 
                                       scheme === 'green' ? 120 : 
                                       scheme === 'red' ? 0 : 
                                       scheme === 'purple' ? 270 : 
                                       scheme === 'orange' ? 30 : 210)) % 360;
          colors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
        }
        
        chart.data.datasets[0].backgroundColor = colors;
        chart.data.datasets[0].borderColor = colors.map(c => c.replace('0.7', '1'));
      } else {
        // Handle single color
        chart.data.datasets[0].backgroundColor = backgroundColor;
        chart.data.datasets[0].borderColor = borderColor;
      }
    }
    
    return chart;
  };

  // Simplified function to render the chart list sidebar
  const renderChartListSidebar = () => {
    return (
      <div className="chart-list-sidebar">
        <div className="panel-header">
          <h3>Available Charts</h3>
          <div className="sidebar-actions">
            <button 
              onClick={toggleAllCharts} 
              className="btn btn-sm btn-outline-primary"
              title="Select/Deselect All Charts"
            >
              {selectedChartIds.length === availableCharts.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
        
        <div className="panel-content">
        {availableCharts.length === 0 ? (
          <div className="no-charts-message">
            <div className="message-icon">📊</div>
            <p>No charts available. Apply filters or create a custom chart.</p>
          </div>
        ) : (
          <div className="chart-list">
            {availableCharts.map(chart => (
              <div 
                key={chart.id} 
                className={`chart-list-item ${selectedChartIds.includes(chart.id) ? 'selected' : ''}`}
                onClick={() => toggleChartSelection(chart.id)}
              >
                  <div className="chart-item-header">
                    <div className="chart-icon">
                      <span className="material-icons">
                        {chart.type === 'bar' ? 'bar_chart' : 
                         chart.type === 'line' ? 'show_chart' : 
                         chart.type === 'pie' ? 'pie_chart' : 'scatter_plot'}
                      </span>
                    </div>
                <div className="chart-info">
                      <div className="chart-title">{customizations[chart.id]?.title || chart.title || `${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart`}</div>
                      <div className="chart-subtitle">{chart.subtitle || chart.columns.join(', ')}</div>
                    </div>
                </div>
                <div className="chart-actions">
                  <button 
                    className="btn-icon" 
                    onClick={(e) => { e.stopPropagation(); openChartCustomization(chart.id); }}
                    title="Customize Chart"
                  >
                    <span className="material-icons">edit</span>
                  </button>
                  <button 
                    className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); removeChart(chart.id); }}
                      title="Remove Chart"
                  >
                      <span className="material-icons">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    );
  };

  // Toggle functions for UI elements
  const toggleFilterBar = () => {
    setFilterBarOpen(!filterBarOpen);
    // Close other panels
    setChartCreator({...chartCreator, open: false});
    setShowAIRecommendations(false);
    setActiveCustomization(null);
  };
  
  const toggleChartCreator = () => {
    setChartCreator({...chartCreator, open: !chartCreator.open});
    // Close other panels
    setFilterBarOpen(false);
    setShowAIRecommendations(false);
    setActiveCustomization(null);
  };
  
  const toggleAIRecommendations = () => {
    setShowAIRecommendations(!showAIRecommendations);
    // Close other panels
    setFilterBarOpen(false);
    setChartCreator({...chartCreator, open: false});
    setActiveCustomization(null);
  };

  // Function to remove chart
  const removeChart = (chartId) => {
    // Remove from available charts
    setAvailableCharts(availableCharts.filter(chart => chart.id !== chartId));
    
    // Remove from selected charts if selected
    if (selectedChartIds.includes(chartId)) {
      setSelectedChartIds(selectedChartIds.filter(id => id !== chartId));
    }
    
    // Remove from customizations if exists
    if (customizations[chartId]) {
      const newCustomizations = { ...customizations };
      delete newCustomizations[chartId];
      setCustomizations(newCustomizations);
    }
  };

  // Enhanced function to render chart creation panel with more prominence
  const renderChartCreationPanel = () => {
    return (
      <div className="chart-creation-panel">
        <div className="panel-header">
          <h3>Create Custom Chart</h3>
          <div className="sidebar-actions">
            <button 
              className="btn btn-sm btn-primary"
              onClick={toggleChartCreator}
              title="Create Custom Chart"
            >
              <span className="material-icons">add_chart</span> New Chart
            </button>
          </div>
        </div>
        
        <div className="panel-content">
          <div className="section-divider">
            <span>Your Created Charts</span>
          </div>
          
          {availableCharts.length === 0 ? (
            <div className="no-charts-message">
              <div className="message-icon">📊</div>
              <p>No charts created yet. Click the "New Chart" button to create your first visualization.</p>
            </div>
          ) : (
            <div className="chart-list">
              <div className="chart-list-header">
                <h4>My Charts</h4>
                <button 
                  onClick={toggleAllCharts} 
                  className="btn btn-sm btn-outline-primary"
                  title="Select/Deselect All Charts"
                >
                  {selectedChartIds.length === availableCharts.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            
              {availableCharts.map(chart => (
                <div 
                  key={chart.id} 
                  className={`chart-list-item ${selectedChartIds.includes(chart.id) ? 'selected' : ''}`}
                  onClick={() => toggleChartSelection(chart.id)}
                >
                  <div className="chart-item-header">
                    <div className="chart-icon">
                      <span className="material-icons">
                        {chart.type === 'bar' ? 'bar_chart' : 
                         chart.type === 'line' ? 'show_chart' : 
                         chart.type === 'pie' ? 'pie_chart' : 'scatter_plot'}
                      </span>
                    </div>
                    <div className="chart-info">
                      <div className="chart-title">{customizations[chart.id]?.title || chart.title || `${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart`}</div>
                      <div className="chart-subtitle">{chart.subtitle || chart.columns.join(', ')}</div>
                    </div>
                  </div>
                  <div className="chart-actions">
                    <button 
                      className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); openChartCustomization(chart.id); }}
                      title="Customize Chart"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => { e.stopPropagation(); removeChart(chart.id); }}
                      title="Remove Chart"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render the main visualization dashboard
  const renderVisualizationDashboard = () => {
    return (
      <div className="visualization-dashboard">
        {/* Dashboard Toolbar */}
        <div className="dashboard-toolbar">
          <div className="toolbar-section">
            <button 
              className={`toolbar-btn ${chartLayout === 'grid' ? 'primary' : ''}`}
              onClick={toggleChartLayout}
              title="Toggle Layout"
            >
              <span className="material-icons">
                {chartLayout === 'grid' ? 'grid_view' : 'crop_7_5'}
              </span>
              {chartLayout === 'grid' ? 'Grid Layout' : 'Single Layout'}
            </button>
            
            <button 
              className="toolbar-btn"
              onClick={changeChartSize}
              title="Change Chart Size"
            >
              <span className="material-icons">aspect_ratio</span>
              Chart Size
            </button>
            
            <div className="divider"></div>
            
            <button 
              className="toolbar-btn"
              onClick={exportAllCharts}
              disabled={selectedChartIds.length === 0 || exportLoading}
              title="Export All Selected Charts"
            >
              <span className="material-icons">download</span>
              Export All
              {selectedChartIds.length > 0 && (
                <span className="badge">{selectedChartIds.length}</span>
              )}
            </button>
          </div>
          
          <div className="toolbar-section">
            <button 
              className={`toolbar-btn primary ${chartCreator.open ? 'active' : ''}`}
              onClick={toggleChartCreator}
              title="Create Custom Chart"
            >
              <span className="material-icons">add_chart</span>
              Create Custom Chart
            </button>
            
            <div className="divider"></div>
            
            <button 
              className={`toolbar-btn ${filterBarOpen ? 'primary' : ''}`}
              onClick={toggleFilterBar}
              title="Filter Data"
            >
              <span className="material-icons">filter_list</span>
              Filters
              {multipleFilters.length > 0 && (
                <span className="badge">{multipleFilters.length}</span>
              )}
            </button>
          </div>
        </div>
          
        {/* Main content with sidebars and chart area */}
        <div className="visualization-main-content">
          {/* Chart display area */}
          <div className="chart-area">
            {/* Chart creation panel (replacing sidebar) */}
            {renderChartCreationPanel()}
            
            {/* Chart display area */}
            <div 
              className={`charts-container ${chartLayout}`} 
              style={{ '--chart-size': chartSizes[chartSizeIndex] }}
              ref={chartContainerRef}
            >
              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading visualization...</p>
                </div>
              ) : error ? (
                <div className="error-state">
                  <div className="error-icon">
                    <span className="material-icons">error</span>
                  </div>
                  <p>{error}</p>
                </div>
              ) : selectedChartIds.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <span className="material-icons">bar_chart</span>
                  </div>
                  <h3>No Charts Selected</h3>
                  <p>Select charts from the sidebar or create a new custom chart.</p>
            <button 
                    className="btn btn-primary"
                    onClick={() => setChartCreator({...chartCreator, open: true})}
                  >
                    Create Your First Chart
            </button>
          </div>
              ) : (
                visibleCharts.map(chart => (
                  <div key={chart.id} className="chart-item">
                    {renderChart(chart)}
                  </div>
                ))
              )}
        </div>
        
            {/* Right Sidebar for controls */}
            <div className="control-sidebar">
          {/* Filter Panel */}
          {filterBarOpen && (
                <div className="sidebar-panel">
              <div className="panel-header">
                    <h3>Filter Data</h3>
                <button 
                  className="close-btn" 
                  onClick={() => setFilterBarOpen(false)}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              
              <div className="panel-content">
                <div className="filter-form">
                      <h4>Add Filter</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Column</label>
                      <select 
                        value={filterColumn} 
                        onChange={e => setFilterColumn(e.target.value)}
                        className="form-control"
                      >
                        <option value="">Select column</option>
                            {dataset?.columns?.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Operator</label>
                      <select 
                        value={filterOperator} 
                        onChange={e => setFilterOperator(e.target.value)}
                        className="form-control"
                      >
                        <option value="contains">Contains</option>
                        <option value="equals">Equals</option>
                            <option value="greater">Greater Than</option>
                            <option value="less">Less Than</option>
                            <option value="starts">Starts With</option>
                            <option value="ends">Ends With</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Value</label>
                      <input 
                        type="text" 
                        value={filterValue} 
                        onChange={e => setFilterValue(e.target.value)}
                        className="form-control"
                            placeholder="Filter value"
                      />
                        </div>
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={addFilter}
                        disabled={!filterColumn || !filterValue}
                      >
                        Add Filter
                      </button>
                  </div>
                </div>
                
                {multipleFilters.length > 0 && (
                  <div className="active-filters">
                    <div className="section-header">
                      <h4>Active Filters</h4>
                      <button 
                            className="btn-sm btn-outline-danger"
                        onClick={clearAllFilters}
                      >
                        Clear All
                      </button>
                    </div>
                    
                    <div className="filter-tags">
                      {multipleFilters.map(filter => (
                        <div key={filter.id} className="filter-tag">
                          <span className="filter-content">
                            {filter.column} {filter.operator} "{filter.value}"
                          </span>
                          <button 
                            className="remove-btn" 
                            onClick={() => removeFilter(filter.id)}
                          >
                            <span className="material-icons">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Chart Creator Panel - Enhanced version */}
          {chartCreator.open && (
                <div className="sidebar-panel enhanced-chart-creator">
              <div className="panel-header">
                <h3>Create Custom Chart</h3>
                <button 
                  className="close-btn" 
                  onClick={() => setChartCreator({...chartCreator, open: false})}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              
              <div className="panel-content">
                <div className="form-section">
                  <h4>Chart Type</h4>
                  <div className="chart-type-selector">
                    <div 
                      className={`chart-type-option ${chartCreator.type === 'bar' ? 'selected' : ''}`}
                      onClick={() => setChartCreator({...chartCreator, type: 'bar'})}
                    >
                      <span className="material-icons">bar_chart</span>
                      <span>Bar Chart</span>
                      <small>Compare values across categories</small>
                    </div>
                    <div 
                      className={`chart-type-option ${chartCreator.type === 'line' ? 'selected' : ''}`}
                      onClick={() => setChartCreator({...chartCreator, type: 'line'})}
                    >
                      <span className="material-icons">show_chart</span>
                      <span>Line Chart</span>
                      <small>Show trends over time</small>
                    </div>
                    <div 
                      className={`chart-type-option ${chartCreator.type === 'pie' ? 'selected' : ''}`}
                      onClick={() => setChartCreator({...chartCreator, type: 'pie'})}
                    >
                      <span className="material-icons">pie_chart</span>
                      <span>Pie Chart</span>
                      <small>Show composition or proportion</small>
                    </div>
                    <div 
                      className={`chart-type-option ${chartCreator.type === 'scatter' ? 'selected' : ''}`}
                      onClick={() => setChartCreator({...chartCreator, type: 'scatter'})}
                    >
                      <span className="material-icons">scatter_plot</span>
                      <span>Scatter Plot</span>
                      <small>Explore relationships between variables</small>
                    </div>
                  </div>
                </div>
                
                <div className="form-section">
                  <h4>Chart Details</h4>
                  <div className="form-group">
                    <label>Chart Title</label>
                    <input 
                      type="text" 
                      value={chartCreator.title} 
                      onChange={e => setChartCreator({...chartCreator, title: e.target.value})}
                      className="form-control"
                      placeholder="My Custom Chart"
                    />
                  </div>
                </div>
                
                <div className="form-section">
                  <h4>Data Mapping</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>{chartCreator.type === 'pie' ? 'Category Column' : 'X-Axis'}</label>
                      <select 
                        value={chartCreator.xAxis} 
                        onChange={e => setChartCreator({...chartCreator, xAxis: e.target.value})}
                        className="form-control"
                      >
                        <option value="">Select column</option>
                            {dataset?.columns?.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    {chartCreator.type !== 'pie' && (
                      <div className="form-group">
                        <label>Y-Axis</label>
                        <select 
                          value={chartCreator.yAxis} 
                          onChange={e => setChartCreator({...chartCreator, yAxis: e.target.value})}
                          className="form-control"
                        >
                          <option value="">Select column</option>
                              {dataset?.columns?.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  
                  {(chartCreator.type === 'bar' || chartCreator.type === 'pie') && (
                    <div className="form-group">
                      <label>Aggregation Method</label>
                      <select 
                        value={chartCreator.aggregation} 
                        onChange={e => setChartCreator({...chartCreator, aggregation: e.target.value})}
                        className="form-control"
                      >
                        <option value="count">Count</option>
                        <option value="sum">Sum</option>
                        <option value="average">Average</option>
                        <option value="min">Minimum</option>
                        <option value="max">Maximum</option>
                      </select>
                    </div>
                  )}
                </div>
                
                <div className="form-section">
                  <h4>Appearance</h4>
                  <div className="form-group">
                    <label>Color Scheme</label>
                    <div className="color-schemes">
                        <div 
                            className={`chart-type-option ${chartCreator.colorScheme === 'blue' ? 'selected' : ''}`}
                            onClick={() => setChartCreator({...chartCreator, colorScheme: 'blue'})}
                        >
                            <div style={{ backgroundColor: 'rgba(54, 162, 235, 0.7)', width: '100%', height: '20px', borderRadius: '4px' }}></div>
                            <span>Blue</span>
                        </div>
                          <div 
                            className={`chart-type-option ${chartCreator.colorScheme === 'green' ? 'selected' : ''}`}
                            onClick={() => setChartCreator({...chartCreator, colorScheme: 'green'})}
                          >
                            <div style={{ backgroundColor: 'rgba(75, 192, 92, 0.7)', width: '100%', height: '20px', borderRadius: '4px' }}></div>
                            <span>Green</span>
                    </div>
                          <div 
                            className={`chart-type-option ${chartCreator.colorScheme === 'red' ? 'selected' : ''}`}
                            onClick={() => setChartCreator({...chartCreator, colorScheme: 'red'})}
                          >
                            <div style={{ backgroundColor: 'rgba(255, 99, 132, 0.7)', width: '100%', height: '20px', borderRadius: '4px' }}></div>
                            <span>Red</span>
                          </div>
                          <div 
                            className={`chart-type-option ${chartCreator.colorScheme === 'purple' ? 'selected' : ''}`}
                            onClick={() => setChartCreator({...chartCreator, colorScheme: 'purple'})}
                          >
                            <div style={{ backgroundColor: 'rgba(153, 102, 255, 0.7)', width: '100%', height: '20px', borderRadius: '4px' }}></div>
                            <span>Purple</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="form-section">
                      <h4>Chart Preview</h4>
                      <div className="chart-preview">
                        {(() => {
                          const previewChart = previewChartConfig();
                          if (previewChart) {
                            return (
                              <div className="preview-container">
                                <div className="chart-body preview">
                                  {previewChart.type === 'bar' && 
                                    <Bar data={previewChart.data} options={previewChart.options} />
                                  }
                                  {previewChart.type === 'line' && 
                                    <Line data={previewChart.data} options={previewChart.options} />
                                  }
                                  {previewChart.type === 'pie' && 
                                    <Pie data={previewChart.data} options={previewChart.options} />
                                  }
                                  {previewChart.type === 'scatter' && 
                                    <Scatter data={previewChart.data} options={previewChart.options} />
                                  }
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="no-preview">
                              <p>Complete the form to see a preview of your chart</p>
                            </div>
                          );
                        })()}
                  </div>
                </div>
                
                <div className="form-actions">
                  <button 
                        className="btn-icon" 
                    onClick={() => setChartCreator({...chartCreator, open: false})}
                        title="Cancel"
                  >
                        <span className="material-icons">close</span>
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={createCustomChart}
                        disabled={!chartCreator.xAxis || (chartCreator.type !== 'pie' && !chartCreator.yAxis) || !chartCreator.title}
                  >
                    Create Chart
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* AI Recommendations Panel */}
          {showAIRecommendations && (
                <div className="sidebar-panel">
              <div className="panel-header">
                <h3>AI Chart Recommendations</h3>
                <button 
                  className="close-btn" 
                  onClick={() => setShowAIRecommendations(false)}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              
                  <div className="panel-content">
                    <div className="recommendations-info">
                      Based on your data, here are some chart suggestions that might help you discover insights.
                    </div>
                    
                  {analysis && analysis.chartRecommendations && analysis.chartRecommendations.length > 0 ? (
                      <div className="recommendations-list">
                        {analysis.chartRecommendations.map((rec, index) => {
                          // Find if a chart was already created for this recommendation
                          const existingChart = availableCharts.find(chart => 
                            chart.type === rec.type && 
                            JSON.stringify(chart.columns) === JSON.stringify(rec.columns)
                          );
                          
                          return (
                      <div key={index} className="recommendation-item">
                        <div className="recommendation-type">
                          <span className="material-icons">
                                  {rec.type === 'bar' ? 'bar_chart' : 
                                   rec.type === 'line' ? 'show_chart' : 
                                   rec.type === 'pie' ? 'pie_chart' : 'scatter_plot'}
                          </span>
                                {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)} Chart
                        </div>
                        <div className="recommendation-details">
                                {rec.reason}
                        </div>
                              <div className="recommendation-columns">
                                <small>Columns: {rec.columns.join(', ')}</small>
                              </div>
                              <div className="recommendation-actions">
                                {existingChart ? (
                                  <>
                                    <button 
                                      className="btn btn-sm btn-outline-primary"
                                      onClick={() => toggleChartSelection(existingChart.id)}
                                    >
                                      {selectedChartIds.includes(existingChart.id) ? 'Hide Chart' : 'Show Chart'}
                                    </button>
                                    <button 
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => removeChart(existingChart.id)}
                                    >
                                      Remove Chart
                                    </button>
                                  </>
                                ) : (
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                                      const newChart = generateSingleChartData(rec);
                            if (newChart) {
                              setAvailableCharts([...availableCharts, newChart]);
                              setSelectedChartIds([...selectedChartIds, newChart.id]);
                            }
                          }}
                        >
                          Create Chart
                        </button>
                                )}
                      </div>
                            </div>
                          );
                        })}
                      </div>
                  ) : (
                    <p className="no-recommendations">
                      No AI recommendations available. Please analyze your dataset first.
                    </p>
                  )}
              </div>
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    );
  };

  // Add this function to render the Analysis tab
  const renderAnalysisTab = () => {
    if (!dataset || !analysis) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analysis...</p>
        </div>
      );
    }

    // Calculate some data quality metrics
    const calculateDataQuality = () => {
      let totalCells = dataset.sampleData.length * dataset.columns.length;
      let missingCells = 0;
      let duplicateRows = 0;
      
      // Count missing values
      dataset.columns.forEach(column => {
        dataset.sampleData.forEach(row => {
          if (row[column] === null || row[column] === undefined || row[column] === "") {
            missingCells++;
          }
        });
      });

      // Check for duplicate rows (simplified)
      const uniqueRows = new Set();
      dataset.sampleData.forEach(row => {
        const rowStr = JSON.stringify(row);
        uniqueRows.add(rowStr);
      });
      duplicateRows = dataset.sampleData.length - uniqueRows.size;

      // Calculate consistency score (simplified)
      const consistencyScore = Math.round(((totalCells - missingCells) / totalCells) * 100);
      
      // Return metrics
      return {
        completeness: Math.round(((totalCells - missingCells) / totalCells) * 100),
        duplicateRows,
        uniqueRows: uniqueRows.size,
        totalRows: dataset.sampleData.length,
        consistency: consistencyScore
      };
    };

    const dataQuality = analysisMetrics.dataQuality || calculateDataQuality();

    // Generate correlations if not already calculated
    const generateCorrelations = () => {
      // Find numerical columns
      const numericColumns = dataset.columns.filter(col => 
        analysis.columnTypes[col] === 'numeric'
      );
      
      if (numericColumns.length < 2) return [];
      
      // Calculate correlations (Pearson's)
      const correlations = [];
      for (let i = 0; i < numericColumns.length; i++) {
        const colX = numericColumns[i];
        correlations[i] = [];
        
        for (let j = 0; j < numericColumns.length; j++) {
          const colY = numericColumns[j];
          
          // If same column, correlation is 1
          if (i === j) {
            correlations[i][j] = 1;
            continue;
          }
          
          // Get values as numbers
          const values = dataset.sampleData.map(row => ({
            x: parseFloat(row[colX]),
            y: parseFloat(row[colY])
          })).filter(val => !isNaN(val.x) && !isNaN(val.y));
          
          // Calculate correlation
          if (values.length > 0) {
            // Calculate means
            const meanX = values.reduce((sum, val) => sum + val.x, 0) / values.length;
            const meanY = values.reduce((sum, val) => sum + val.y, 0) / values.length;
            
            // Calculate covariance and variances
            let covariance = 0;
            let varX = 0;
            let varY = 0;
            
            values.forEach(val => {
              const diffX = val.x - meanX;
              const diffY = val.y - meanY;
              covariance += diffX * diffY;
              varX += diffX * diffX;
              varY += diffY * diffY;
            });
            
            // Calculate correlation
            const correlation = covariance / (Math.sqrt(varX) * Math.sqrt(varY));
            correlations[i][j] = correlation;
          } else {
            correlations[i][j] = 0;
          }
        }
      }
      
      return {
        columns: numericColumns,
        data: correlations
      };
    };

    // Get correlations data
    const correlations = analysisMetrics.correlations.length ? 
      analysisMetrics.correlations : 
      generateCorrelations();

    return (
      <div className="analysis-dashboard">
        <div className="dashboard-toolbar">
          <div className="toolbar-section">
            <h3>Dataset Analysis</h3>
          </div>
          
          <div className="toolbar-section">
            <button 
              className="toolbar-btn"
              onClick={() => {
                // Update metrics with fresh calculations
                setAnalysisMetrics({
                  ...analysisMetrics,
                  dataQuality: calculateDataQuality(),
                  correlations: generateCorrelations()
                });
              }}
            >
              <span className="material-icons">refresh</span>
              <span className="btn-text">Refresh Analysis</span>
            </button>
          </div>
        </div>
        
        <div className="analysis-content">
          <div className="analysis-metrics">
            {/* Data Quality Card */}
            <div className="metric-card">
              <div className="metric-header">
                <div className="metric-icon">
                  <span className="material-icons">verified</span>
                </div>
                <h3 className="metric-title">Data Completeness</h3>
              </div>
              <div className="metric-value">{dataQuality.completeness}%</div>
              <p className="metric-description">
                Percentage of data cells that contain values
              </p>
            </div>
            
            {/* Duplicate Rows Card */}
            <div className="metric-card">
              <div className="metric-header">
                <div className="metric-icon">
                  <span className="material-icons">content_copy</span>
                </div>
                <h3 className="metric-title">Unique Rows</h3>
              </div>
              <div className="metric-value">{dataQuality.uniqueRows} / {dataQuality.totalRows}</div>
              <p className="metric-description">
                {dataQuality.duplicateRows > 0 ? 
                  `Found ${dataQuality.duplicateRows} duplicate rows in the dataset` : 
                  'No duplicate rows in the dataset'}
              </p>
            </div>
            
            {/* Dataset Size Card */}
            <div className="metric-card">
              <div className="metric-header">
                <div className="metric-icon">
                  <span className="material-icons">data_array</span>
                </div>
                <h3 className="metric-title">Dataset Size</h3>
              </div>
              <div className="metric-value">{dataset.sampleData.length} rows</div>
              <p className="metric-description">
                {dataset.columns.length} columns × {dataset.sampleData.length} rows
              </p>
            </div>
            
            {/* Distribution of Column Types */}
            <div className="metric-card">
              <div className="metric-header">
                <div className="metric-icon">
                  <span className="material-icons">category</span>
                </div>
                <h3 className="metric-title">Column Types</h3>
              </div>
              <div className="metric-value">
                {Object.values(analysis.columnTypes).filter(type => type === 'numeric').length} numeric
              </div>
              <p className="metric-description">
                {Object.values(analysis.columnTypes).filter(type => type === 'string').length} categorical, 
                {Object.values(analysis.columnTypes).filter(type => type === 'date').length} date
              </p>
            </div>
            
            {/* Data Quality Score */}
            <div className="metric-card">
              <div className="metric-header">
                <div className="metric-icon">
                  <span className="material-icons">analytics</span>
                </div>
                <h3 className="metric-title">Quality Score</h3>
              </div>
              <div className="metric-value">{dataQuality.consistency}/100</div>
              <p className="metric-description">
                Overall data quality score based on completeness and consistency
              </p>
            </div>
            
            {/* Column Analysis Cards - For First 3 Important Columns */}
            {dataset.columns.slice(0, 3).map(column => {
              const columnType = analysis.columnTypes[column];
              const missingCount = dataset.sampleData.filter(row => 
                row[column] === null || row[column] === undefined || row[column] === ""
              ).length;
              
              // For numeric columns
              if (columnType === 'numeric') {
                const values = dataset.sampleData
                  .map(row => parseFloat(row[column]))
                  .filter(v => !isNaN(v));
                
                if (values.length === 0) return null;
                
                const min = Math.min(...values);
                const max = Math.max(...values);
                const sum = values.reduce((acc, val) => acc + val, 0);
                const mean = sum / values.length;
                
                return (
                  <div className="metric-card" key={column}>
                    <div className="metric-header">
                      <div className="metric-icon">
                        <span className="material-icons">numbers</span>
                      </div>
                      <h3 className="metric-title">{column}</h3>
                    </div>
                    <div className="metric-value">{mean.toFixed(2)}</div>
                    <p className="metric-description">
                      Range: {min.toFixed(2)} to {max.toFixed(2)}
                      {missingCount > 0 && `, ${missingCount} missing values`}
                    </p>
                  </div>
                );
              }
              
              // For categorical columns
              if (columnType === 'string' || columnType === 'boolean') {
                const valueCounts = {};
                dataset.sampleData.forEach(row => {
                  if (row[column] !== null && row[column] !== undefined && row[column] !== "") {
                    valueCounts[row[column]] = (valueCounts[row[column]] || 0) + 1;
                  }
                });
                
                const uniqueValues = Object.keys(valueCounts).length;
                let topValue = '';
                let topCount = 0;
                
                Object.entries(valueCounts).forEach(([value, count]) => {
                  if (count > topCount) {
                    topValue = value;
                    topCount = count;
                  }
                });
                
                return (
                  <div className="metric-card" key={column}>
                    <div className="metric-header">
                      <div className="metric-icon">
                        <span className="material-icons">sort_by_alpha</span>
                      </div>
                      <h3 className="metric-title">{column}</h3>
                    </div>
                    <div className="metric-value">{uniqueValues}</div>
                    <p className="metric-description">
                      Unique values, most common: {topValue} ({topCount})
                      {missingCount > 0 && `, ${missingCount} missing values`}
                    </p>
                  </div>
                );
              }
              
              return null;
            })}
          </div>
          
          <div className="analysis-sidebar">
            <div className="sidebar-header">
              <h3>Correlations</h3>
            </div>
            
            {correlations.columns && correlations.columns.length > 0 ? (
              <div className="correlation-matrix">
                <table className="correlation-table">
                  <thead>
                    <tr>
                      <th></th>
                      {correlations.columns.map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlations.data.map((row, i) => (
                      <tr key={i}>
                        <th>{correlations.columns[i]}</th>
                        {row.map((value, j) => {
                          // Set color based on correlation value
                          // Positive: blue, Negative: red
                          const color = value > 0 ? 
                            `rgba(54, 162, 235, ${Math.abs(value)})` : 
                            `rgba(255, 99, 132, ${Math.abs(value)})`;
                          
                          return (
                            <td key={j} className="correlation-cell">
                              <div 
                                className="correlation-bg" 
                                style={{
                                  backgroundColor: color,
                                  width: `${Math.abs(value) * 100}%`
                                }}
                              ></div>
                              <span className="correlation-value">
                                {value.toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="no-correlations-message">
                <p>Not enough numeric columns available for correlation analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Function to render the Data Cleaning tab
  const renderDataCleaningTab = () => {
    if (!dataset || !analysis) {
      return (
              <div className="loading-state">
                <div className="spinner"></div>
          <p>Loading data cleaning tools...</p>
              </div>
      );
    }

    // Calculate data summary
    const dataSummary = {
      totalRows: dataset.sampleData.length,
      columnsCount: dataset.columns.length,
      missingValues: 0,
      outliers: 0
    };

    // Count missing values and potential outliers
    dataset.columns.forEach(column => {
      // Count missing
      const missingCount = dataset.sampleData.filter(row => 
        row[column] === null || row[column] === undefined || row[column] === ""
      ).length;
      
      dataSummary.missingValues += missingCount;
      
      // Count outliers for numeric columns
      if (analysis.columnTypes[column] === 'numeric') {
        const values = dataset.sampleData
          .map(row => parseFloat(row[column]))
          .filter(val => !isNaN(val));
          
        if (values.length > 4) {
          values.sort((a, b) => a - b);
          const q1Index = Math.floor(values.length * 0.25);
          const q3Index = Math.floor(values.length * 0.75);
          const q1 = values[q1Index];
          const q3 = values[q3Index];
          const iqr = q3 - q1;
          const lowerBound = q1 - (1.5 * iqr);
          const upperBound = q3 + (1.5 * iqr);
          
          const outliersCount = values.filter(val => val < lowerBound || val > upperBound).length;
          dataSummary.outliers += outliersCount;
        }
      }
    });

    return (
      <div className="data-cleaning-dashboard">
        <div className="dashboard-toolbar">
          <div className="toolbar-section">
            <h3>Data Cleaning & Preprocessing</h3>
                </div>
          
          <div className="toolbar-section">
            <button 
              className="toolbar-btn"
              onClick={() => {
                // Reset to original data
                setFilteredData(originalData);
                setMultipleFilters([]);
                addCleaningStep("Reset to original data");
              }}
              title="Reset to Original Data"
            >
              <span className="material-icons">restore</span>
              <span className="btn-text">Reset Data</span>
            </button>
              </div>
                </div>
        
        <div className="data-cleaning-container">
          <div className="cleaning-controls">
            <h3>Cleaning Operations</h3>
            
            <div className="cleaning-description">
              Clean and preprocess your data before visualization or analysis. These operations help you handle missing values, 
              outliers, and prepare your data for machine learning.
            </div>
            
            <div className="cleaning-actions">
                <button 
                  className="btn btn-primary"
                onClick={cleanData}
                title="Auto-clean missing values and outliers"
              >
                <span className="material-icons">auto_fix_high</span>
                Auto-Clean Data
              </button>
              
              <button 
                className="btn btn-outline-primary"
                onClick={() => {
                  // Export cleaned data
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredData));
                  const downloadAnchorNode = document.createElement('a');
                  downloadAnchorNode.setAttribute("href", dataStr);
                  downloadAnchorNode.setAttribute("download", `${dataset.name}_cleaned.json`);
                  document.body.appendChild(downloadAnchorNode);
                  downloadAnchorNode.click();
                  downloadAnchorNode.remove();
                  
                  addCleaningStep("Exported cleaned data");
                }}
                title="Export cleaned data as JSON"
              >
                <span className="material-icons">download</span>
                Export Cleaned Data
                </button>
              </div>
            
            <div className="cleaning-info">
              <p>Automatic cleaning will perform these operations:</p>
              <ul>
                <li>Replace missing values in numeric columns with the mean value</li>
                <li>Replace missing values in categorical columns with the most frequent value</li>
                <li>Detect outliers using the IQR method</li>
                <li>Analyze correlations between variables</li>
              </ul>
            </div>
            
            <div className="divider"></div>
            
            <h3>Preprocessing Options</h3>
            <div className="preprocessing-description">
              Prepare your data for machine learning by applying these transformations.
            </div>
            
            <div className="preprocessing-options">
              <div className="option-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={preprocessingOptions.normalizeNumerical}
                    onChange={e => setPreprocessingOptions({...preprocessingOptions, normalizeNumerical: e.target.checked})}
                  />
                  Normalize Numerical Features
                </label>
                <div className="option-description">
                  Scale all numerical features to range [0,1] for better model performance
                </div>
              </div>
              
              <div className="option-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={preprocessingOptions.fillMissingValues}
                    onChange={e => setPreprocessingOptions({...preprocessingOptions, fillMissingValues: e.target.checked})}
                  />
                  Fill Missing Values
                </label>
                <div className="option-description">
                  Replace missing values with mean (numerical) or mode (categorical)
                </div>
              </div>
              
              <div className="option-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={preprocessingOptions.removeOutliers}
                    onChange={e => setPreprocessingOptions({...preprocessingOptions, removeOutliers: e.target.checked})}
                  />
                  Remove Outliers
                </label>
                <div className="option-description">
                  Identify and remove statistical outliers using the IQR method
                </div>
              </div>
              
              <div className="option-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={preprocessingOptions.encodeCategories}
                    onChange={e => setPreprocessingOptions({...preprocessingOptions, encodeCategories: e.target.checked})}
                  />
                  One-Hot Encode Categories
                </label>
                <div className="option-description">
                  Convert categorical variables to a format suitable for machine learning
                </div>
              </div>
              
              <div className="option-group">
                <label>
                  <input 
                    type="checkbox" 
                    checked={preprocessingOptions.splitData}
                    onChange={e => setPreprocessingOptions({...preprocessingOptions, splitData: e.target.checked})}
                  />
                  Split into Training/Testing Sets
                </label>
                <div className="option-description">
                  Partition data for model training and evaluation
                </div>
                
                {preprocessingOptions.splitData && (
                  <div className="split-ratio">
                    <label>Training Set Size: {preprocessingOptions.trainSize}%</label>
                    <input 
                      type="range" 
                      min="50" 
                      max="90" 
                      value={preprocessingOptions.trainSize}
                      onChange={e => setPreprocessingOptions({...preprocessingOptions, trainSize: parseInt(e.target.value)})}
                    />
                  </div>
                )}
              </div>
              
              <button 
                className="btn btn-primary mt-4"
                onClick={preprocessData}
                disabled={!Object.values(preprocessingOptions).some(v => v === true)}
              >
                Apply Preprocessing
              </button>
            </div>
          </div>
          
          <div className="cleaning-results">
            <h3>Cleaning History & Data Summary</h3>
            
            <div className="data-summary">
              <h4>Dataset Overview</h4>
              <div className="summary-stats">
                <div className="stat-item">
                  <div className="stat-label">Rows</div>
                  <div className="stat-value">{filteredData.length}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Columns</div>
                  <div className="stat-value">{dataset.columns.length}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Missing Values</div>
                  <div className="stat-value">{dataSummary.missingValues}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Outliers</div>
                  <div className="stat-value">{dataSummary.outliers}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Filtered Rows</div>
                  <div className="stat-value">{originalData.length - filteredData.length}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Data Completeness</div>
                  <div className="stat-value">
                    {Math.round(((dataSummary.totalRows * dataSummary.columnsCount - dataSummary.missingValues) / 
                      (dataSummary.totalRows * dataSummary.columnsCount)) * 100)}%
                  </div>
                </div>
              </div>
            </div>
            
            {/* Correlations Section */}
            {analysisMetrics.correlations && analysisMetrics.correlations.significant && 
             analysisMetrics.correlations.significant.length > 0 && (
              <div className="correlations-summary">
                <h4>Key Variable Relationships</h4>
                <div className="correlations-list">
                  {analysisMetrics.correlations.significant.map((corr, index) => (
                    <div key={index} className="correlation-item">
                      <div className="correlation-strength" 
                           style={{ 
                             backgroundColor: corr.direction === 'positive' ? 
                               'rgba(75, 192, 92, 0.2)' : 'rgba(255, 99, 132, 0.2)',
                             borderLeft: `4px solid ${corr.direction === 'positive' ? 
                               'rgba(75, 192, 92, 0.8)' : 'rgba(255, 99, 132, 0.8)'}`
                           }}>
                        <div className="correlation-columns">
                          <span>{corr.columns[0]}</span>
                          <span className="material-icons">
                            {corr.direction === 'positive' ? 'trending_up' : 'trending_down'}
                          </span>
                          <span>{corr.columns[1]}</span>
                        </div>
                        <div className="correlation-value">
                          Correlation: {corr.correlation.toFixed(2)}
                          <span className="correlation-type">
                            ({corr.strength} {corr.direction})
                          </span>
                        </div>
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            // Create scatter plot for these correlated variables
                            const chartConfig = {
                              type: 'scatter',
                              columns: corr.columns,
                              reason: `Correlation analysis (${corr.correlation.toFixed(2)}) between ${corr.columns[0]} and ${corr.columns[1]}`
                            };
                            
                            const newChart = generateSingleChartData(chartConfig);
                            if (newChart) {
                              setAvailableCharts([...availableCharts, newChart]);
                              setSelectedChartIds([...selectedChartIds, newChart.id]);
                              setActiveTab('visualize');
                            }
                          }}
                        >
                          <span className="material-icons">scatter_plot</span>
                          Create Scatter Plot
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="divider"></div>
            
            <h4>Cleaning Steps History</h4>
            <div className="cleaning-steps">
              {cleaningSteps.length === 0 ? (
                <p className="text-muted">No cleaning steps performed yet. Use the controls on the left to clean your data.</p>
              ) : (
                cleaningSteps.map(step => (
                  <div key={step.id} className="cleaning-step">
                    <div className="step-time">{step.timestamp}</div>
                    <div className="step-description">{step.description}</div>
                  </div>
                ))
            )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render function
  if (loading) {
    return (
      <div className="visualizer-container">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Loading visualization tools...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="visualizer-container">
        <div className="error-screen">
          <div className="error-icon">
            <span className="material-icons">error</span>
          </div>
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <Link to={`/datasets/${id}`} className="btn btn-primary">
            Back to Dataset
          </Link>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="visualizer-container">
        <div className="error-screen">
          <div className="error-icon">
            <span className="material-icons">dataset</span>
          </div>
          <h2>Dataset Not Found</h2>
          <p>The requested dataset could not be loaded.</p>
          <Link to="/datasets" className="btn btn-primary">
            Back to Datasets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="visualizer-container modern-ui">
      <div className="visualizer-header">
        <div className="header-title">
          <Link to={`/datasets/${id}`} className="back-button">
            <span className="material-icons">arrow_back</span>
          </Link>
          <div>
            <h1>Data Visualization</h1>
            <h2>{dataset.name}</h2>
          </div>
        </div>
        
        <div className="header-tabs">
          <button 
            className={`tab-button ${activeTab === 'visualize' ? 'active' : ''}`}
            onClick={() => setActiveTab('visualize')}
          >
            <span className="material-icons">insights</span>
            Visualize
          </button>
          <button 
            className={`tab-button ${activeTab === 'analyze' ? 'active' : ''}`}
            onClick={() => setActiveTab('analyze')}
          >
            <span className="material-icons">analytics</span>
            Analyze
          </button>
          <button 
            className={`tab-button ${activeTab === 'clean' ? 'active' : ''}`}
            onClick={() => setActiveTab('clean')}
          >
            <span className="material-icons">cleaning_services</span>
            Data Cleaning
          </button>
        </div>
      </div>

      <div className="visualizer-content">
        {activeTab === 'visualize' ? renderVisualizationDashboard() : 
         activeTab === 'analyze' ? renderAnalysisTab() :
         renderDataCleaningTab()}
      </div>
    </div>
  );
};

export default DataVisualizer; 