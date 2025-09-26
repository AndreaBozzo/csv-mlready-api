# CSV ML Readiness API

[![ML Ready](https://csv-mlready-api.vercel.app/api/badge?score=93)](https://csv-mlready-api.vercel.app)

> **ML Readiness as a Service** - Fast, serverless API for CSV data profiling and machine learning readiness scoring.

## 🚀 Live Demo

**API Endpoint**: https://csv-mlready-api.vercel.app/api/analyze
**Frontend Interface**: https://csv-mlready-api.vercel.app

## ✨ Features

- **🔥 10-second analysis** for datasets up to 50MB
- **🎯 ML Readiness scoring** (0-100) with detailed recommendations
- **📊 Advanced data profiling** powered by [DataProfiler v0.4.6](https://github.com/AndreaBozzo/dataprof)
- **🛡️ Robust fallback** system for maximum reliability
- **🎨 Professional frontend** with drag-and-drop interface
- **☁️ Fully serverless** on Vercel with zero maintenance

## 🔧 Technology Stack

### Backend
- **Core Engine**: DataProfiler v0.4.6 (Rust) with JavaScript fallback
- **Runtime**: Node.js 18+ serverless functions
- **Platform**: Vercel with 30-second timeout
- **File Processing**: Multer + CSV parsing with streaming support

### Frontend
- **UI**: Vanilla JavaScript with professional CSS design
- **Upload**: Drag-and-drop + file browser
- **Visualization**: Dynamic results with column analysis tables
- **Responsive**: Mobile-friendly interface

### Infrastructure
- **Deployment**: Vercel with automatic CI/CD
- **Binary**: Cross-compiled Rust executable (5.3MB)
- **Storage**: Temporary file processing in `/tmp`
- **Monitoring**: Request/response logging with engine tracking

## 📡 API Reference

### POST `/api/analyze`

Upload and analyze a CSV file for ML readiness.

**Request:**
```bash
curl -X POST "https://csv-mlready-api.vercel.app/api/analyze" \
  -F "csv=@your-file.csv" \
  -H "Content-Type: multipart/form-data"
```

**Response:**
```json
{
  "success": true,
  "filename": "your-file.csv",
  "analysis": {
    "score": 93,
    "totalRows": 5000,
    "totalColumns": 12,
    "columnTypes": {
      "integer": 5,
      "float": 3,
      "string": 3,
      "date": 1
    },
    "issues": [
      "Null values detected: 1 (20.0%) in column 'email'"
    ],
    "recommendations": [
      "Feature Engineering: Extract features from date columns",
      "Feature Scaling: Consider standardization for numeric columns"
    ],
    "columns": [
      {
        "name": "user_id",
        "type": "integer",
        "nullPercentage": "0.0",
        "uniqueValues": 5000,
        "mlSuitability": 0.9,
        "featureType": "NumericReady",
        "encodingSuggestions": ["Consider standardization or normalization"]
      }
    ],
    "dataQualityScore": 96.67,
    "mlReadinessLevel": "Ready",
    "processingEngine": "dataprof-v0.4.6"
  },
  "meta": {
    "engineUsed": "dataprof-v0.4.6",
    "processingTime": 1234567890
  }
}
```


## 🎯 ML Readiness Scoring

The API provides comprehensive ML readiness analysis:

### Score Breakdown
- **90-100**: Excellent - Ready for production ML
- **80-89**: Very Good - Minor preprocessing needed
- **70-79**: Good - Some data cleaning required
- **60-69**: Fair - Moderate improvements needed
- **0-59**: Poor - Significant work required

### Feature Analysis
Each column receives detailed analysis:
- **ML Suitability**: 0.0-1.0 score for ML usefulness
- **Feature Type**: Classification (NumericReady, CategoricalNeedsEncoding, etc.)
- **Encoding Suggestions**: Specific preprocessing recommendations
- **Quality Issues**: Missing values, cardinality problems, etc.

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/csv-mlready-api.git
   cd csv-mlready-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd api && npm install
   cd ../badge-service && npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

### Project Structure
```
csv-mlready-api/
├── api/
│   ├── bin/dataprof          # DataProfiler binary (Linux x64)
│   ├── analyze.js            # Main analysis endpoint
│   ├── badge.js              # Badge generation
│   └── package.json
├── frontend/
│   ├── index.html            # Main interface
│   ├── styles.css            # Professional styling
│   ├── script.js             # Upload logic
│   └── package.json
├── vercel.json               # Deployment configuration
└── README.md
```

### Deployment

Deploy to Vercel with one command:
```bash
vercel --prod
```

The app automatically:
- Builds all services
- Deploys serverless functions
- Serves static frontend
- Includes the DataProfiler binary

## 🔄 Engine Fallback System

The API uses a robust dual-engine approach:

1. **Primary**: DataProfiler v0.4.6 (Rust binary)
   - Advanced ML analysis
   - High performance
   - Detailed feature classification

2. **Fallback**: JavaScript implementation
   - Basic analysis
   - Guaranteed availability
   - Backward compatibility

The system automatically falls back to JavaScript if the binary fails, ensuring 99.9% uptime.

## 📊 Use Cases

- **Data Scientists**: Quick dataset assessment before modeling
- **GitHub Projects**: Link to online CSV analysis
- **CI/CD Pipelines**: Automated data quality checks
- **Research**: Dataset quality comparison
- **Education**: Learning data preprocessing concepts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[DataProfiler](https://github.com/AndreaBozzo/dataprof)**: Core Rust engine for ML analysis
- **Vercel**: Serverless deployment platform
- **Community**: Contributors and feedback

---