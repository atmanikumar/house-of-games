// Rate limiting utility
// Blocks users who make more than 100 requests per 5 minutes

const rateLimitMap = new Map();

// Clean up old entries every 2 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  
  for (const [ip, data] of rateLimitMap.entries()) {
    // Remove timestamps older than 5 minutes
    data.timestamps = data.timestamps.filter(time => time > fiveMinutesAgo);
    
    // Remove IP if no recent requests
    if (data.timestamps.length === 0) {
      rateLimitMap.delete(ip);
    }
  }
}, 2 * 60 * 1000); // Run every 2 minutes

export function checkRateLimit(ip) {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // Get or create rate limit data for this IP
  let ipData = rateLimitMap.get(ip);
  
  if (!ipData) {
    ipData = {
      timestamps: [],
      blocked: false,
      blockedUntil: null
    };
    rateLimitMap.set(ip, ipData);
  }
  
  // Remove timestamps older than 5 minutes
  ipData.timestamps = ipData.timestamps.filter(time => time > fiveMinutesAgo);
  
  // Check if currently blocked
  if (ipData.blocked && ipData.blockedUntil > now) {
    const minutesLeft = Math.ceil((ipData.blockedUntil - now) / 60000);
    return {
      allowed: false,
      remaining: 0,
      resetIn: minutesLeft,
      message: `Too many requests. Blocked for ${minutesLeft} more minutes.`
    };
  }
  
  // Unblock if block period expired
  if (ipData.blocked && ipData.blockedUntil <= now) {
    ipData.blocked = false;
    ipData.blockedUntil = null;
    ipData.timestamps = [];
  }
  
  // Check if exceeding rate limit (100 requests per 5 minutes)
  if (ipData.timestamps.length >= 100) {
    // Block for 5 minutes
    ipData.blocked = true;
    ipData.blockedUntil = now + 5 * 60 * 1000;
    
    return {
      allowed: false,
      remaining: 0,
      resetIn: 5,
      message: 'Rate limit exceeded. Too many requests. Blocked for 5 minutes.'
    };
  }
  
  // Add current request timestamp
  ipData.timestamps.push(now);
  
  // Calculate remaining requests
  const remaining = 100 - ipData.timestamps.length;
  
  return {
    allowed: true,
    remaining,
    resetIn: null,
    message: null
  };
}

export function getRateLimitInfo(ip) {
  const ipData = rateLimitMap.get(ip);
  
  if (!ipData) {
    return {
      requests: 0,
      remaining: 100,
      blocked: false
    };
  }
  
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  // Filter recent requests
  const recentRequests = ipData.timestamps.filter(time => time > fiveMinutesAgo);
  
  return {
    requests: recentRequests.length,
    remaining: Math.max(0, 100 - recentRequests.length),
    blocked: ipData.blocked && ipData.blockedUntil > now,
    blockedUntil: ipData.blockedUntil
  };
}

