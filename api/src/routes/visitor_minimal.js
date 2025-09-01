const express = require('express');
const router = express.Router();

// Minimal test route - no middleware, no models
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Minimal visitor route working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
