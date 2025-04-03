import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { datasetService } from '../services/api';
import { Chart, registerables } from 'chart.js';
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2';
import html2canvas from 'html2canvas';
import '../styles/DataVisualizer.css';

// Register Chart.js components
Chart.register(...registerables);

const DataVisualizer = () => {
  const { id } = useParams();
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch dataset details
        const datasetData = await datasetService.getDatasetById(id);
        setDataset(datasetData);
        setOriginalData(datasetData.sampleData || []);
        
        // Fetch analysis data
        const analysisData = await datasetService.analyzeDataset(id);
        setAnalysis(analysisData.analysis);
        
        // Set filtered data to all data initially
        setFilteredData(datasetData.sampleData || []);
        
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
            
            if (outliers.length > 0) {
              cleaningActions.push(`Detected ${outliers.length} outliers in '${column}' (values outside ${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)})`);
            }
          }
        }
      });
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
    if (!analysis || !filteredData.length) return;
    
    const allChartsData = analysis.chartRecommendations.map(chart => {
      return generateSingleChartData(chart);
    }).filter(chart => chart !== null);
    
    setAvailableCharts(allChartsData);
    
    // Initialize with first chart selected
    if (allChartsData.length > 0 && selectedChartIds.length === 0) {
      setSelectedChartIds([allChartsData[0].id]);
    }

    // Initialize customizations 
    const initialCustomizations = {};
    allChartsData.forEach(chart => {
      initialCustomizations[chart.id] = {
        title: chart.options.plugins.title.text,
        backgroundColor: chart.type === 'pie' ? null : chart.data.datasets[0].backgroundColor,
        borderColor: chart.type === 'pie' ? null : chart.data.datasets[0].borderColor,
        showLegend: chart.options.plugins.legend?.display ?? true
      };
    });
    setCustomizations(initialCustomizations);
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

  const toggleChartSelection = (chartId) => {
    if (selectedChartIds.includes(chartId)) {
      setSelectedChartIds(selectedChartIds.filter(id => id !== chartId));
    } else {
      setSelectedChartIds([...selectedChartIds, chartId]);
    }
  };

  const toggleAllCharts = () => {
    if (selectedChartIds.length === availableCharts.length) {
      setSelectedChartIds([]);
    } else {
      setSelectedChartIds(availableCharts.map(chart => chart.id));
    }
  };

  const toggleChartLayout = () => {
    setChartLayout(chartLayout === 'grid' ? 'full' : 'grid');
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
        <div className="sidebar-header">
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
                <div className="chart-icon">{chart.type === 'bar' ? '📊' : chart.type === 'line' ? '📈' : chart.type === 'pie' ? '🥧' : '⚪'}</div>
                <div className="chart-info">
                  <div className="chart-title">{chart.title || `${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} Chart`}</div>
                  <div className="chart-subtitle">{chart.subtitle || 'Click to select'}</div>
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
                    onClick={(e) => { e.stopPropagation(); exportChart(chart.id); }}
                    title="Export Chart"
                  >
                    <span className="material-icons">download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
              className="toolbar-btn" 
              onClick={() => setFilterBarOpen(!filterBarOpen)}
              title="Add Data Filter"
            >
              <span className="material-icons">filter_list</span>
              <span className="btn-text">Filters</span>
              {multipleFilters.length > 0 && (
                <span className="badge">{multipleFilters.length}</span>
              )}
            </button>
            
            <button 
              className="toolbar-btn" 
              onClick={() => setChartCreator({...chartCreator, open: !chartCreator.open})}
              title="Create Custom Chart"
            >
              <span className="material-icons">add_chart</span>
              <span className="btn-text">New Chart</span>
            </button>
            
            <div className="divider"></div>
            
            <button 
              className="toolbar-btn" 
              onClick={toggleChartLayout}
              title={`Switch to ${chartLayout === 'grid' ? 'List' : 'Grid'} View`}
            >
              <span className="material-icons">
                {chartLayout === 'grid' ? 'view_list' : 'grid_view'}
              </span>
              <span className="btn-text">Layout</span>
            </button>
            
            <button 
              className="toolbar-btn" 
              onClick={changeChartSize}
              title="Change Chart Size"
            >
              <span className="material-icons">aspect_ratio</span>
              <span className="btn-text">Size</span>
            </button>
          </div>
          
          <div className="toolbar-section">
            <button 
              className="toolbar-btn" 
              onClick={() => setShowAIRecommendations(!showAIRecommendations)}
              title="AI Chart Recommendations"
            >
              <span className="material-icons">lightbulb</span>
              <span className="btn-text">AI Recommendations</span>
            </button>
            
            <button 
              className="toolbar-btn primary" 
              onClick={exportAllCharts}
              disabled={selectedChartIds.length === 0 || exportLoading}
              title="Export Selected Charts"
            >
              <span className="material-icons">save_alt</span>
              <span className="btn-text">
                {exportLoading ? 'Exporting...' : 'Export'}
              </span>
            </button>
          </div>
        </div>
        
        {/* Filter Panel */}
        {filterBarOpen && (
          <div className="filter-panel">
            <div className="panel-header">
              <h3>Data Filters</h3>
              <button 
                className="close-btn" 
                onClick={() => setFilterBarOpen(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="filter-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Column</label>
                  <select 
                    value={filterColumn} 
                    onChange={e => setFilterColumn(e.target.value)}
                    className="form-control"
                  >
                    <option value="">Select column</option>
                    {dataset.columns.map(col => (
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
                    <option value="startsWith">Starts with</option>
                    <option value="endsWith">Ends with</option>
                    <option value="greaterThan">Greater than</option>
                    <option value="lessThan">Less than</option>
                    <option value="between">Between (comma separated)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Value</label>
                  <input 
                    type="text" 
                    value={filterValue} 
                    onChange={e => setFilterValue(e.target.value)}
                    className="form-control"
                    placeholder={filterOperator === 'between' ? "min, max" : "Filter value"}
                  />
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
            </div>
            
            {multipleFilters.length > 0 && (
              <div className="active-filters">
                <div className="section-header">
                  <h4>Active Filters</h4>
                  <button 
                    className="btn btn-sm btn-outline-danger"
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
        )}
        
        {/* Chart Creator Panel */}
        {chartCreator.open && (
          <div className="chart-creator-panel">
            <div className="panel-header">
              <h3>Create Custom Chart</h3>
              <button 
                className="close-btn" 
                onClick={() => setChartCreator({...chartCreator, open: false})}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="form-content">
              <div className="form-section">
                <h4>Chart Properties</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Chart Type</label>
                    <select 
                      value={chartCreator.type} 
                      onChange={e => setChartCreator({...chartCreator, type: e.target.value})}
                      className="form-control"
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="pie">Pie Chart</option>
                      <option value="scatter">Scatter Plot</option>
                    </select>
                  </div>
                  
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
                      {dataset.columns.map(col => (
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
                        {dataset.columns.map(col => (
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
                    {['blue', 'green', 'purple', 'orange', 'rainbow'].map(scheme => (
                      <div 
                        key={scheme} 
                        className={`color-scheme-option ${chartCreator.colorScheme === scheme ? 'selected' : ''}`}
                        onClick={() => setChartCreator({...chartCreator, colorScheme: scheme})}
                      >
                        <div className={`color-preview ${scheme}`}></div>
                        <span>{scheme.charAt(0).toUpperCase() + scheme.slice(1)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => setChartCreator({...chartCreator, open: false})}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={createCustomChart}
                  disabled={!chartCreator.xAxis || (chartCreator.type !== 'pie' && !chartCreator.yAxis)}
                >
                  Create Chart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Recommendations Panel */}
        {showAIRecommendations && (
          <div className="ai-recommendations-panel">
            <div className="panel-header">
              <h3>AI Chart Recommendations</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowAIRecommendations(false)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="recommendations-content">
              <p className="recommendations-info">
                Our AI has analyzed your data and suggests the following charts to best visualize your data patterns:
              </p>
              
              <div className="recommendations-list">
                {analysis && analysis.chartRecommendations ? (
                  analysis.chartRecommendations.map((rec, index) => (
                    <div key={index} className="recommendation-item">
                      <div className="recommendation-icon">
                        <span className="material-icons">{rec.type === 'bar' ? 'bar_chart' : rec.type === 'line' ? 'show_chart' : rec.type === 'pie' ? 'pie_chart' : 'scatter_plot'}</span>
                      </div>
                      <div className="recommendation-details">
                        <h4>{rec.title}</h4>
                        <p>{rec.description}</p>
                        <div className="recommendation-actions">
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              // Create chart based on recommendation
                              const newChartCreator = {
                                ...chartCreator,
                                type: rec.type,
                                xAxis: rec.xAxis,
                                yAxis: rec.yAxis,
                                title: rec.title
                              };
                              setChartCreator(newChartCreator);
                              // Call createCustomChart with this configuration
                              createCustomChart(newChartCreator);
                            }}
                          >
                            Create This Chart
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-recommendations">
                    <p>No recommendations available. Please analyze your dataset first.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Area */}
        <div className="dashboard-main">
          {/* Left sidebar for chart list */}
          {renderChartListSidebar()}
          
          {/* Chart display area */}
          <div className="chart-display-area">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading charts...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <span className="material-icons">error</span>
                <p>{error}</p>
              </div>
            ) : selectedChartIds.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <span className="material-icons">bar_chart</span>
                </div>
                <h3>No Charts Selected</h3>
                <p>Select charts from the sidebar or create a new custom chart to view visualizations.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setChartCreator({...chartCreator, open: true})}
                >
                  Create Your First Chart
                </button>
              </div>
            ) : (
              <div 
                className={`charts-container ${chartLayout}`}
                ref={chartContainerRef}
                style={{
                  '--chart-size': chartSizes[chartSizeIndex]
                }}
              >
                {availableCharts
                  .filter(chart => selectedChartIds.includes(chart.id))
                  .map(chart => (
                    <div key={chart.id} className="chart-container">
                      <div className="chart-header">
                        <h3 className="chart-title">{customizations[chart.id]?.title || chart.title}</h3>
                        <div className="chart-actions">
                          <button 
                            className="btn-icon" 
                            onClick={() => openChartCustomization(chart.id)}
                            title="Customize Chart"
                          >
                            <span className="material-icons">edit</span>
                          </button>
                          <button 
                            className="btn-icon" 
                            onClick={() => exportChart(chart.id)}
                            title="Export Chart"
                          >
                            <span className="material-icons">download</span>
                          </button>
                        </div>
                      </div>
                      <div 
                        className="chart-body"
                        ref={el => chartsRef.current[chart.id] = el}
                      >
                        {renderChart(chart)}
                      </div>
                      {chart.description && (
                        <div className="chart-description">
                          <p>{chart.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
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
            className={`tab-button ${activeTab === 'clean' ? 'active' : ''}`}
            onClick={() => setActiveTab('clean')}
          >
            <span className="material-icons">cleaning_services</span>
            Data Cleaning
          </button>
        </div>
      </div>

      <div className="visualizer-content">
        {activeTab === 'visualize' ? renderVisualizationDashboard() : renderDataCleaningTab()}
      </div>
    </div>
  );
};

export default DataVisualizer; 