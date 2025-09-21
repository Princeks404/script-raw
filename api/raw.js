import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Get script name from query parameter
  const name = req.query.name;
  
  if (!name) {
    return res.status(400).send('-- Script name is required');
  }

  try {
    // Executor detection
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    
    if (!isExecutorRequest(userAgent, referer)) {
      return res.status(403).send('-- Access denied: Executor access only');
    }

    // Try to get script ID from name mapping (faster lookup)
    const scriptId = await kv.get(`name:${name.toLowerCase()}`);
    let script = null;
    
    if (scriptId) {
      // Direct lookup by ID
      const scriptData = await kv.get(`script:${scriptId}`);
      if (scriptData) {
        script = scriptData;
      }
    } else {
      // Fallback: search through all scripts
      const keys = await kv.keys('script:*');
      
      for (const key of keys) {
        const scriptData = await kv.get(key);
        if (scriptData && scriptData.name === name.toLowerCase()) {
          script = scriptData;
          break;
        }
      }
    }

    if (!script) {
      return res.status(404).send('-- Script not found');
    }

    // Return raw script content
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.send(script.content);
    
  } catch (error) {
    console.error('Raw endpoint error:', error);
    return res.status(500).send('-- Internal server error');
  }
}

function isExecutorRequest(userAgent, referer) {
  // Block common browsers
  const browserPatterns = [
    /chrome/i, /firefox/i, /safari/i, /edge/i, /opera/i,
    /mozilla/i, /webkit/i, /gecko/i, /version/i
  ];
  
  // Allow known executors
  const executorPatterns = [
    /synapse/i, /krnl/i, /script-ware/i, /sentinel/i,
    /oxygen/i, /fluxus/i, /electron/i, /jjsploit/i,
    /exploit/i, /injector/i, /executor/i
  ];
  
  // Check for executor patterns first
  if (executorPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  // Block if it looks like a browser
  const isBrowser = browserPatterns.some(pattern => pattern.test(userAgent));
  if (isBrowser) {
    return false;
  }
  
  // Allow requests without typical browser headers (likely executors)
  return !referer || referer === '' || userAgent.length < 50;
}
