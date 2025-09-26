const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const upload = multer({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Enhanced analysis using dataprof binary
async function analyzeWithDataprof(csvBuffer, filename) {
  return new Promise((resolve, reject) => {
    const tempId = crypto.randomUUID();
    const tempFilePath = path.join('/tmp', `dataprof_${tempId}.csv`);
    const binaryPath = path.join(__dirname, 'bin', 'dataprof');

    try {
      // Write CSV buffer to temp file
      fs.writeFileSync(tempFilePath, csvBuffer);

      // Execute dataprof binary
      const process = spawn(binaryPath, [
        tempFilePath,
        '--ml-score',
        '--quality',
        '--format', 'json'
      ], {
        timeout: 25000, // 25 seconds timeout (leave 5s buffer for cleanup)
        killSignal: 'SIGTERM'
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        // Cleanup temp file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.warn('Failed to cleanup temp file:', err.message);
        }

        if (code === 0 && stdout) {
          try {
            const dataprofResult = JSON.parse(stdout);
            const mlReady = convertDataprofToApiResponse(dataprofResult, filename);
            resolve(mlReady);
          } catch (parseError) {
            console.error('Failed to parse dataprof output:', parseError.message);
            console.error('Raw output:', stdout);
            reject(new Error('Failed to parse analysis results'));
          }
        } else {
          console.error('Dataprof execution failed:', { code, stderr, stdout: stdout.substring(0, 500) });
          reject(new Error(`Analysis failed with code ${code}: ${stderr || 'Unknown error'}`));
        }
      });

      process.on('error', (error) => {
        // Cleanup temp file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.warn('Failed to cleanup temp file after error:', err.message);
        }

        console.error('Failed to execute dataprof binary:', error.message);
        reject(error);
      });

    } catch (error) {
      // Cleanup temp file if creation failed
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        // Ignore cleanup errors if file wasn't created
      }

      console.error('Failed to prepare dataprof execution:', error.message);
      reject(error);
    }
  });
}

// Convert dataprof JSON output to our API response format
function convertDataprofToApiResponse(dataprofResult, filename) {
  const mlReadiness = dataprofResult.summary?.ml_readiness;
  const quality = dataprofResult.quality;
  const metadata = dataprofResult.metadata;
  const columns = dataprofResult.columns || [];

  // Extract main ML readiness score
  const score = Math.round(mlReadiness?.score || 0);

  // Convert issues from quality assessment
  const issues = [];
  const recommendations = [];

  if (quality?.issues) {
    quality.issues.forEach(issue => {
      if (issue.severity === 'critical' || issue.severity === 'warning') {
        issues.push(`${issue.description} in column '${issue.column}'`);
      }
    });
  }

  // Convert ML recommendations
  if (mlReadiness?.recommendations) {
    mlReadiness.recommendations.forEach(rec => {
      recommendations.push(`${rec.category}: ${rec.description}`);
    });
  }

  // Convert column analysis
  const columnAnalysis = columns.map(col => {
    const featureInfo = mlReadiness?.feature_analysis?.find(f => f.column_name === col.name);

    return {
      name: col.name,
      type: col.data_type?.toLowerCase() || 'unknown',
      nullPercentage: col.null_percentage?.toFixed(1) || '0.0',
      uniqueValues: col.total_count - col.null_count,
      samples: [], // dataprof doesn't provide samples in this format
      mlSuitability: featureInfo?.ml_suitability || 0,
      featureType: featureInfo?.feature_type || 'unknown',
      encodingSuggestions: featureInfo?.encoding_suggestions || []
    };
  });

  return {
    score,
    totalRows: metadata?.total_rows || columns[0]?.total_count || 0,
    totalColumns: metadata?.total_columns || columns.length,
    columnTypes: columns.reduce((acc, col) => {
      const type = col.data_type?.toLowerCase() || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {}),
    issues: issues.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
    columns: columnAnalysis,
    dataQualityScore: quality?.quality_score || 0,
    mlReadinessLevel: mlReadiness?.level || 'Unknown',
    processingEngine: 'dataprof-v0.4.6'
  };
}

// Fallback: Original JS analysis function
function analyzeCSV(csvData) {
  const rows = [];
  const columns = {};

  return new Promise((resolve, reject) => {
    const stream = Readable.from(csvData);

    stream
      .pipe(csv())
      .on('headers', (headers) => {
        headers.forEach(header => {
          columns[header] = {
            name: header,
            type: 'unknown',
            nullCount: 0,
            uniqueValues: new Set(),
            samples: []
          };
        });
      })
      .on('data', (row) => {
        rows.push(row);

        Object.keys(row).forEach(key => {
          const value = row[key];
          const col = columns[key];

          if (!col) return;

          if (!value || value.trim() === '') {
            col.nullCount++;
          } else {
            col.uniqueValues.add(value);
            if (col.samples.length < 10) {
              col.samples.push(value);
            }

            // Basic type inference
            if (col.type === 'unknown') {
              if (!isNaN(value) && !isNaN(parseFloat(value))) {
                col.type = value.includes('.') ? 'float' : 'integer';
              } else if (isValidDate(value)) {
                col.type = 'date';
              } else {
                col.type = 'string';
              }
            }
          }
        });
      })
      .on('end', () => {
        const analysis = calculateMLReadiness(rows, columns);
        resolve(analysis);
      })
      .on('error', reject);
  });
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

function calculateMLReadiness(rows, columns) {
  const totalRows = rows.length;
  const totalColumns = Object.keys(columns).length;

  if (totalRows === 0 || totalColumns === 0) {
    return {
      score: 0,
      issues: ['No data found'],
      recommendations: ['Upload a valid CSV file with data']
    };
  }

  let score = 100;
  const issues = [];
  const recommendations = [];

  // Check data volume
  if (totalRows < 100) {
    score -= 20;
    issues.push(`Small dataset: only ${totalRows} rows`);
    recommendations.push('Consider collecting more data (recommended: 1000+ rows)');
  }

  // Analyze each column
  Object.values(columns).forEach(col => {
    const nullPercentage = (col.nullCount / totalRows) * 100;
    const uniquePercentage = (col.uniqueValues.size / totalRows) * 100;

    // High null percentage
    if (nullPercentage > 50) {
      score -= 15;
      issues.push(`High missing values in '${col.name}': ${nullPercentage.toFixed(1)}%`);
      recommendations.push(`Consider imputing or removing column '${col.name}'`);
    } else if (nullPercentage > 20) {
      score -= 5;
      issues.push(`Moderate missing values in '${col.name}': ${nullPercentage.toFixed(1)}%`);
    }

    // High cardinality for categorical data
    if (col.type === 'string' && uniquePercentage > 90) {
      score -= 10;
      issues.push(`High cardinality in '${col.name}': ${uniquePercentage.toFixed(1)}% unique values`);
      recommendations.push(`Consider feature engineering for '${col.name}' or use embeddings`);
    }

    // Single unique value (constant column)
    if (col.uniqueValues.size === 1) {
      score -= 20;
      issues.push(`Constant column '${col.name}' provides no information`);
      recommendations.push(`Remove constant column '${col.name}'`);
    }
  });

  // Feature engineering recommendations
  const numericColumns = Object.values(columns).filter(col =>
    col.type === 'integer' || col.type === 'float'
  ).length;

  if (numericColumns < totalColumns * 0.3) {
    recommendations.push('Consider creating numeric features from categorical data');
  }

  const dateColumns = Object.values(columns).filter(col => col.type === 'date').length;
  if (dateColumns > 0) {
    recommendations.push('Extract time-based features from date columns (year, month, day, etc.)');
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    totalRows,
    totalColumns,
    columnTypes: Object.values(columns).reduce((acc, col) => {
      acc[col.type] = (acc[col.type] || 0) + 1;
      return acc;
    }, {}),
    issues: issues.slice(0, 5), // Limit to top 5 issues
    recommendations: recommendations.slice(0, 5), // Limit to top 5 recommendations
    columns: Object.values(columns).map(col => ({
      name: col.name,
      type: col.type,
      nullPercentage: ((col.nullCount / totalRows) * 100).toFixed(1),
      uniqueValues: col.uniqueValues.size,
      samples: col.samples.slice(0, 3)
    }))
  };
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    upload.single('csv')(req, res, async (err) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({
          error: err.message || 'File upload failed'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No CSV file provided'
        });
      }

      try {
        let analysis;
        let engineUsed = 'fallback-js';

        // Try enhanced dataprof analysis first
        try {
          console.log('Attempting analysis with dataprof binary...');
          analysis = await analyzeWithDataprof(req.file.buffer, req.file.originalname);
          engineUsed = 'dataprof-v0.4.6';
          console.log('Successfully analyzed with dataprof binary');
        } catch (dataprofError) {
          console.warn('Dataprof analysis failed, falling back to JS implementation:', dataprofError.message);

          // Fallback to original JS analysis
          analysis = await analyzeCSV(req.file.buffer.toString());
          analysis.processingEngine = 'fallback-js-v1';
          engineUsed = 'fallback-js';
        }

        res.status(200).json({
          success: true,
          filename: req.file.originalname,
          analysis,
          meta: {
            engineUsed,
            processingTime: Date.now()
          }
        });
      } catch (analysisError) {
        console.error('Analysis error (both engines failed):', analysisError);
        res.status(500).json({
          error: 'Failed to analyze CSV file',
          details: analysisError.message
        });
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};