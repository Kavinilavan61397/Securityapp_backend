// Storage configuration based on deployment environment
const isVercel = process.env.VERCEL === '1';
const isAWS = process.env.AWS_LAMBDA_FUNCTION_NAME;
const isRailway = process.env.RAILWAY_ENVIRONMENT;
const isHeroku = process.env.HEROKU_APP_NAME;
const isDigitalOcean = process.env.DO_APP_NAME;

// Determine if we're in a serverless environment
const isServerless = isVercel || isAWS || isRailway;

// Storage type configuration
const STORAGE_CONFIG = {
  type: isServerless ? 'memory' : 'disk',
  environment: {
    isVercel,
    isAWS,
    isRailway,
    isHeroku,
    isDigitalOcean,
    isServerless
  }
};

// Log storage configuration on startup
console.log('📁 Storage Configuration:', {
  type: STORAGE_CONFIG.type,
  environment: Object.keys(STORAGE_CONFIG.environment)
    .filter(key => STORAGE_CONFIG.environment[key])
    .join(', ') || 'local development'
});

module.exports = STORAGE_CONFIG;
