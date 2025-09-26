// Simple badge generator for debugging
module.exports = async (req, res) => {
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'max-age=300');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { score = '93' } = req.query;

    // Simple SVG badge without dependencies
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
      <rect width="60" height="20" fill="#555"/>
      <rect x="60" width="60" height="20" fill="#4c1"/>
      <text x="30" y="15" fill="white" font-family="Arial" font-size="11" text-anchor="middle">ML Ready</text>
      <text x="90" y="15" fill="white" font-family="Arial" font-size="11" text-anchor="middle">${score}%</text>
    </svg>`;

    res.status(200).send(svg);
  } catch (error) {
    console.error('Badge error:', error);
    res.status(500).send(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="20">
      <rect width="80" height="20" fill="#e05d44"/>
      <text x="40" y="15" fill="white" font-family="Arial" font-size="11" text-anchor="middle">Error</text>
    </svg>`);
  }
};