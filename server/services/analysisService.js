/**
 * Service for data analysis operations
 */
class AnalysisService {
  /**
   * Determines the data type of each column
   * @param {Array} data - Array of data objects
   * @param {Array} columns - Column names
   * @returns {Object} - Object mapping column names to data types
   */
  static determineColumnTypes(data, columns) {
    const columnTypes = {};
    
    columns.forEach(column => {
      // Skip analysis for empty columns
      if (!column || column.trim() === '') {
        columnTypes[column] = 'unknown';
        return;
      }
      
      let isNumeric = true;
      let isDate = true;
      let isBoolean = true;
      let nonNullValues = 0;
      
      // Check values in the sample data
      for (const row of data) {
        const value = row[column];
        
        // Skip null/undefined values
        if (value === null || value === undefined || value === '') {
          continue;
        }
        
        nonNullValues++;
        
        // Check if value can be a number
        if (isNumeric && (isNaN(Number(value)) || value === '')) {
          isNumeric = false;
        }
        
        // Check if value can be a date
        if (isDate) {
          const dateObj = new Date(value);
          if (isNaN(dateObj.getTime())) {
            isDate = false;
          }
        }
        
        // Check if value can be boolean
        if (isBoolean) {
          const normalizedValue = value.toString().toLowerCase();
          if (
            normalizedValue !== 'true' && 
            normalizedValue !== 'false' && 
            normalizedValue !== '1' && 
            normalizedValue !== '0' && 
            normalizedValue !== 'yes' && 
            normalizedValue !== 'no'
          ) {
            isBoolean = false;
          }
        }
      }
      
      // Determine column type based on checks
      if (nonNullValues === 0) {
        columnTypes[column] = 'unknown';
      } else if (isBoolean) {
        columnTypes[column] = 'boolean';
      } else if (isDate) {
        columnTypes[column] = 'date';
      } else if (isNumeric) {
        columnTypes[column] = 'numeric';
      } else {
        columnTypes[column] = 'string';
      }
    });
    
    return columnTypes;
  }

  /**
   * Calculate basic statistics for numeric columns
   * @param {Array} data - Array of data objects
   * @param {Object} columnTypes - Object mapping column names to data types
   * @returns {Object} - Object with basic statistics for each numeric column
   */
  static calculateStatistics(data, columnTypes) {
    const stats = {};
    
    // Find numeric columns
    const numericColumns = Object.keys(columnTypes).filter(
      column => columnTypes[column] === 'numeric'
    );
    
    numericColumns.forEach(column => {
      const values = data
        .map(row => parseFloat(row[column]))
        .filter(val => !isNaN(val));
      
      if (values.length === 0) {
        stats[column] = {
          min: null,
          max: null,
          mean: null,
          median: null
        };
        return;
      }
      
      // Sort values for median calculation
      values.sort((a, b) => a - b);
      
      const sum = values.reduce((acc, val) => acc + val, 0);
      const mean = sum / values.length;
      
      // Calculate median
      let median;
      const mid = Math.floor(values.length / 2);
      if (values.length % 2 === 0) {
        median = (values[mid - 1] + values[mid]) / 2;
      } else {
        median = values[mid];
      }
      
      stats[column] = {
        min: values[0],
        max: values[values.length - 1],
        mean,
        median
      };
    });
    
    return stats;
  }

  /**
   * Detect correlations between numeric columns
   * @param {Array} data - Array of data objects
   * @param {Object} columnTypes - Object mapping column names to data types
   * @returns {Array} - Array of correlation objects
   */
  static detectCorrelations(data, columnTypes) {
    const correlations = [];
    
    // Find numeric columns
    const numericColumns = Object.keys(columnTypes).filter(
      column => columnTypes[column] === 'numeric'
    );
    
    // Need at least 2 numeric columns to find correlations
    if (numericColumns.length < 2) {
      return correlations;
    }
    
    // Compare each pair of numeric columns
    for (let i = 0; i < numericColumns.length - 1; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        
        // Extract numeric values from both columns
        const pairs = data
          .map(row => [parseFloat(row[col1]), parseFloat(row[col2])])
          .filter(pair => !isNaN(pair[0]) && !isNaN(pair[1]));
        
        if (pairs.length < 2) continue;
        
        // Calculate Pearson correlation coefficient
        const correlation = this.calculatePearsonCorrelation(pairs);
        
        if (!isNaN(correlation)) {
          correlations.push({
            column1: col1,
            column2: col2,
            coefficient: correlation,
            strength: Math.abs(correlation) >= 0.7 ? 'strong' : 
                      Math.abs(correlation) >= 0.5 ? 'moderate' : 'weak',
            direction: correlation >= 0 ? 'positive' : 'negative'
          });
        }
      }
    }
    
    // Sort by absolute correlation strength (descending)
    return correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
  }

  /**
   * Calculate Pearson correlation coefficient
   * @param {Array} pairs - Array of [x, y] value pairs
   * @returns {Number} - Correlation coefficient
   */
  static calculatePearsonCorrelation(pairs) {
    const n = pairs.length;
    
    // Calculate sums
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (const [x, y] of pairs) {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }
    
    // Calculate correlation coefficient
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return 0;
    
    return numerator / denominator;
  }

  /**
   * Recommend chart types based on data analysis
   * @param {Object} columnTypes - Object mapping column names to data types
   * @param {Object} stats - Statistics for numeric columns
   * @param {Array} correlations - Array of correlation objects
   * @returns {Array} - Array of chart recommendations
   */
  static recommendCharts(columnTypes, stats, correlations) {
    const recommendations = [];
    
    const numericColumns = Object.keys(columnTypes).filter(
      column => columnTypes[column] === 'numeric'
    );
    
    const categoricalColumns = Object.keys(columnTypes).filter(
      column => columnTypes[column] === 'string' || columnTypes[column] === 'boolean'
    );
    
    const dateColumns = Object.keys(columnTypes).filter(
      column => columnTypes[column] === 'date'
    );
    
    // Single numeric column analysis
    numericColumns.forEach(column => {
      recommendations.push({
        type: 'histogram',
        columns: [column],
        reason: `Shows the distribution of values in ${column}`,
        priority: 0.8
      });
      
      recommendations.push({
        type: 'boxplot',
        columns: [column],
        reason: `Shows the statistical summary of ${column} including outliers`,
        priority: 0.7
      });
    });
    
    // Single categorical column analysis
    categoricalColumns.forEach(column => {
      recommendations.push({
        type: 'pie',
        columns: [column],
        reason: `Shows the proportion of each category in ${column}`,
        priority: 0.6
      });
      
      recommendations.push({
        type: 'bar',
        columns: [column],
        reason: `Shows the count of each category in ${column}`,
        priority: 0.7
      });
    });
    
    // Time series analysis
    dateColumns.forEach(dateColumn => {
      numericColumns.forEach(numericColumn => {
        recommendations.push({
          type: 'line',
          columns: [dateColumn, numericColumn],
          reason: `Shows how ${numericColumn} changes over time`,
          priority: 0.9
        });
      });
    });
    
    // Numeric vs categorical analysis
    numericColumns.forEach(numericColumn => {
      categoricalColumns.forEach(categoricalColumn => {
        recommendations.push({
          type: 'groupedBar',
          columns: [categoricalColumn, numericColumn],
          reason: `Compares ${numericColumn} across different ${categoricalColumn} categories`,
          priority: 0.8
        });
      });
    });
    
    // Correlation analysis
    if (correlations.length > 0) {
      // Strong correlations get scatter plots
      correlations
        .filter(corr => Math.abs(corr.coefficient) >= 0.5)
        .forEach(corr => {
          recommendations.push({
            type: 'scatter',
            columns: [corr.column1, corr.column2],
            reason: `Shows ${corr.strength} ${corr.direction} correlation (${corr.coefficient.toFixed(2)}) between ${corr.column1} and ${corr.column2}`,
            priority: 0.9 + Math.abs(corr.coefficient) * 0.1
          });
        });
    }
    
    // Sort by priority (descending)
    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Analyze data to find patterns and correlations
   * @param {Array} data - Array of data objects
   * @param {Array} columns - Column names
   * @returns {Object} - Analysis results
   */
  static analyzeData(data, columns) {
    // Determine column types
    const columnTypes = this.determineColumnTypes(data, columns);
    
    // Calculate statistics for numeric columns
    const statistics = this.calculateStatistics(data, columnTypes);
    
    // Detect correlations between numeric columns
    const correlations = this.detectCorrelations(data, columnTypes);
    
    // Get chart recommendations
    const chartRecommendations = this.recommendCharts(columnTypes, statistics, correlations);
    
    return {
      columnTypes,
      statistics,
      correlations,
      chartRecommendations
    };
  }
}

module.exports = AnalysisService; 