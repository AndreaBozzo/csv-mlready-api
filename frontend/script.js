class MLReadinessChecker {
    constructor() {
        this.initializeAnalytics();
        this.initializeElements();
        this.attachEventListeners();
        this.apiBaseUrl = window.location.origin; // Will use current domain in production
    }

    // Initialize Vercel Analytics
    initializeAnalytics() {
        if (typeof window !== 'undefined' && window.va) {
            window.va('init');
        }
    }

    // Analytics tracking helper
    track(eventName, properties = {}) {
        if (typeof window !== 'undefined' && window.va) {
            window.va('track', eventName, properties);
        } else {
            // Fallback if analytics not loaded yet
            console.log('Analytics tracking:', eventName, properties);
        }
    }

    initializeElements() {
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.browseBtn = document.getElementById('browse-btn');
        this.loading = document.getElementById('loading');
        this.results = document.getElementById('results');
        this.scoreNumber = document.getElementById('score-number');
        this.scoreDescription = document.getElementById('score-description');
        this.badgeImg = document.getElementById('badge-img');
        this.badgeMarkdown = document.getElementById('badge-markdown');
        this.copyBadgeBtn = document.getElementById('copy-badge');
        this.datasetOverview = document.getElementById('dataset-overview');
        this.issuesList = document.getElementById('issues-list');
        this.recommendationsList = document.getElementById('recommendations-list');
        this.columnsTable = document.getElementById('columns-table');
        this.demoGoodBtn = document.getElementById('demo-good');
        this.demoPoorBtn = document.getElementById('demo-poor');
    }

    attachEventListeners() {
        // File upload events
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.browseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

        // Drag and drop events
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this));

        // Copy badge button
        this.copyBadgeBtn.addEventListener('click', this.copyBadgeToClipboard.bind(this));

        // Demo buttons
        this.demoGoodBtn.addEventListener('click', () => {
            this.track('Demo Data Loaded', { demoType: 'good' });
            this.loadDemoData('good');
        });
        this.demoPoorBtn.addEventListener('click', () => {
            this.track('Demo Data Loaded', { demoType: 'poor' });
            this.loadDemoData('poor');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFileSelect(files[0]);
        }
    }

    async handleFileSelect(file) {
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            alert('Please select a CSV file');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            alert('File size must be less than 50MB');
            return;
        }

        // Track file upload start
        this.track('File Upload Started', {
            fileName: file.name,
            fileSizeMB: parseFloat((file.size / 1024 / 1024).toFixed(2)),
            fileType: file.type || 'unknown'
        });

        this.showLoading();

        try {
            const formData = new FormData();
            formData.append('csv', file);

            const response = await fetch(`${this.apiBaseUrl}/api/analyze`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Analysis failed');
            }

            // Track successful analysis
            this.track('Analysis Completed', {
                score: result.analysis?.score || 0,
                totalRows: result.analysis?.totalRows || 0,
                totalColumns: result.analysis?.totalColumns || 0,
                engineUsed: result.meta?.engineUsed || 'unknown',
                mlReadinessLevel: result.analysis?.mlReadinessLevel || 'unknown'
            });

            this.displayResults(result);
        } catch (error) {
            console.error('Analysis error:', error);

            // Track analysis failure
            this.track('Analysis Failed', {
                error: error.message,
                fileName: file?.name || 'unknown'
            });

            alert(`Analysis failed: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        this.results.style.display = 'none';
        this.loading.style.display = 'block';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    displayResults(result) {
        const { analysis, filename } = result;

        // Update score
        this.scoreNumber.textContent = analysis.score;
        this.updateScoreCircleColor(analysis.score);

        // Update description
        const description = this.getScoreDescription(analysis.score);
        this.scoreDescription.innerHTML = `
            <h2>${description.label}</h2>
            <p>${description.text}</p>
        `;

        // Update dataset overview
        this.datasetOverview.innerHTML = `
            <div class="overview-grid">
                <div class="overview-item">
                    <strong>Rows:</strong> ${analysis.totalRows.toLocaleString()}
                </div>
                <div class="overview-item">
                    <strong>Columns:</strong> ${analysis.totalColumns}
                </div>
                <div class="overview-item">
                    <strong>File:</strong> ${filename}
                </div>
                <div class="overview-item">
                    <strong>Column Types:</strong>
                    ${Object.entries(analysis.columnTypes || {}).map(([type, count]) =>
                        `${count} ${type}`
                    ).join(', ')}
                </div>
            </div>
        `;

        // Update issues
        this.issuesList.innerHTML = analysis.issues.length > 0
            ? analysis.issues.map(issue => `<li><strong>Warning:</strong> ${issue}</li>`).join('')
            : '<li><strong>Good:</strong> No major issues found</li>';

        // Update recommendations
        this.recommendationsList.innerHTML = analysis.recommendations.length > 0
            ? analysis.recommendations.map(rec => `<li><strong>Tip:</strong> ${rec}</li>`).join('')
            : '<li><strong>Success:</strong> Your data looks ready for ML!</li>';

        // Update columns table
        if (analysis.columns && analysis.columns.length > 0) {
            const tableHtml = `
                <table class="columns-table">
                    <thead>
                        <tr>
                            <th>Column</th>
                            <th>Type</th>
                            <th>Missing %</th>
                            <th>Unique Values</th>
                            <th>Sample Values</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${analysis.columns.map(col => `
                            <tr>
                                <td><strong>${col.name}</strong></td>
                                <td><span class="type-badge type-${col.type}">${col.type}</span></td>
                                <td>${col.nullPercentage}%</td>
                                <td>${col.uniqueValues.toLocaleString()}</td>
                                <td>${col.samples.join(', ')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            this.columnsTable.innerHTML = tableHtml;
        }

        // Update badge
        this.updateBadge(analysis.score);

        // Show results
        this.results.style.display = 'block';
        this.results.scrollIntoView({ behavior: 'smooth' });
    }

    updateScoreCircleColor(score) {
        const circle = document.querySelector('.score-circle');
        circle.className = 'score-circle'; // Reset classes

        if (score >= 80) circle.classList.add('excellent');
        else if (score >= 60) circle.classList.add('good');
        else if (score >= 40) circle.classList.add('fair');
        else circle.classList.add('poor');
    }

    getScoreDescription(score) {
        if (score >= 90) return {
            label: 'Excellent ML Readiness',
            text: 'Your dataset is in excellent shape for machine learning. High quality data with minimal issues.'
        };
        if (score >= 80) return {
            label: 'Very Good ML Readiness',
            text: 'Your dataset is very well-prepared for ML with only minor improvements needed.'
        };
        if (score >= 70) return {
            label: 'Good ML Readiness',
            text: 'Your dataset is in good shape but would benefit from some data cleaning and preprocessing.'
        };
        if (score >= 60) return {
            label: 'Fair ML Readiness',
            text: 'Your dataset needs moderate improvements before being used for machine learning.'
        };
        if (score >= 40) return {
            label: 'Poor ML Readiness',
            text: 'Significant data quality issues detected. Consider substantial data cleaning.'
        };
        return {
            label: 'Very Poor ML Readiness',
            text: 'Major data quality problems found. Extensive preprocessing required.'
        };
    }

    updateBadge(score) {
        const badgeUrl = `${this.apiBaseUrl}/api/badge?score=${score}`;
        this.badgeImg.src = badgeUrl;
        this.badgeImg.alt = `ML Ready: ${score}%`;

        const markdown = `[![ML Ready](${badgeUrl})](${window.location.origin})`;
        this.badgeMarkdown.value = markdown;
    }

    async copyBadgeToClipboard() {
        try {
            await navigator.clipboard.writeText(this.badgeMarkdown.value);
            const originalText = this.copyBadgeBtn.textContent;
            this.copyBadgeBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.copyBadgeBtn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            // Fallback: select the text
            this.badgeMarkdown.select();
        }
    }

    async loadDemoData(type) {
        // For demo purposes, we'll simulate different datasets
        const demoData = {
            good: {
                filename: 'demo_good_dataset.csv',
                analysis: {
                    score: 85,
                    totalRows: 5000,
                    totalColumns: 12,
                    columnTypes: { 'integer': 5, 'float': 3, 'string': 3, 'date': 1 },
                    issues: [
                        'Moderate missing values in phone_number: 15.2%'
                    ],
                    recommendations: [
                        'Consider imputing missing phone numbers or marking as optional',
                        'Extract time-based features from registration_date'
                    ],
                    columns: [
                        { name: 'user_id', type: 'integer', nullPercentage: '0.0', uniqueValues: 5000, samples: ['1', '2', '3'] },
                        { name: 'age', type: 'integer', nullPercentage: '2.1', uniqueValues: 45, samples: ['25', '34', '42'] },
                        { name: 'income', type: 'float', nullPercentage: '5.3', uniqueValues: 892, samples: ['45000.50', '62000.00', '38500.75'] },
                        { name: 'category', type: 'string', nullPercentage: '0.8', uniqueValues: 8, samples: ['premium', 'standard', 'basic'] }
                    ]
                }
            },
            poor: {
                filename: 'demo_poor_dataset.csv',
                analysis: {
                    score: 32,
                    totalRows: 150,
                    totalColumns: 8,
                    columnTypes: { 'string': 5, 'integer': 2, 'float': 1 },
                    issues: [
                        'Small dataset: only 150 rows',
                        'High missing values in email: 78.5%',
                        'High missing values in address: 65.2%',
                        'Constant column status provides no information',
                        'High cardinality in user_notes: 89.3% unique values'
                    ],
                    recommendations: [
                        'Consider collecting more data (recommended: 1000+ rows)',
                        'Consider imputing or removing column email',
                        'Remove constant column status',
                        'Consider feature engineering for user_notes or use embeddings'
                    ],
                    columns: [
                        { name: 'id', type: 'integer', nullPercentage: '0.0', uniqueValues: 150, samples: ['1', '2', '3'] },
                        { name: 'email', type: 'string', nullPercentage: '78.5', uniqueValues: 32, samples: ['user@email.com', '', 'test@test.com'] },
                        { name: 'status', type: 'string', nullPercentage: '0.0', uniqueValues: 1, samples: ['active', 'active', 'active'] },
                        { name: 'user_notes', type: 'string', nullPercentage: '12.0', uniqueValues: 134, samples: ['Long unique note...', 'Another note...', 'Different...'] }
                    ]
                }
            }
        };

        this.showLoading();

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        this.displayResults(demoData[type]);
        this.hideLoading();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MLReadinessChecker();
});