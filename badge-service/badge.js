const { makeBadge } = require('badge-maker');

function getScoreColor(score) {
  if (score >= 80) return 'brightgreen';
  if (score >= 60) return 'green';
  if (score >= 40) return 'yellow';
  if (score >= 20) return 'orange';
  return 'red';
}

function getScoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Very Poor';
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'max-age=300'); // 5 minutes cache

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { score, style = 'flat', label = 'ML Ready' } = req.query;

    if (!score || isNaN(score)) {
      return res.status(400).json({
        error: 'Score parameter is required and must be a number'
      });
    }

    const numericScore = parseInt(score);
    if (numericScore < 0 || numericScore > 100) {
      return res.status(400).json({
        error: 'Score must be between 0 and 100'
      });
    }

    const color = getScoreColor(numericScore);
    const message = `${numericScore}% (${getScoreLabel(numericScore)})`;

    const format = {
      label: label,
      message: message,
      color: color,
      style: style
    };

    const svg = makeBadge(format);
    res.status(200).send(svg);

  } catch (error) {
    console.error('Badge generation error:', error);

    // Fallback badge for errors
    const errorBadge = makeBadge({
      label: 'ML Ready',
      message: 'Error',
      color: 'red',
      style: 'flat'
    });

    res.status(500).send(errorBadge);
  }
};