// api/raw.js - Replace entire file
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  const name = req.query.name;
  
  if (!name) {
    return res.status(400).send('-- Script name is required');
  }

  try {
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    
    const executorPatterns = [
      /synapse/i, /krnl/i, /script-ware/i, /sentinel/i,
      /oxygen/i, /fluxus/i, /electron/i, /jjsploit/i,
      /exploit/i, /injector/i, /executor/i
    ];
    
    const browserPatterns = [
      /chrome/i, /firefox/i, /safari/i, /edge/i, /opera/i,
      /mozilla/i, /webkit/i, /gecko/i, /version/i
    ];
    
    const isExecutor = executorPatterns.some(pattern => pattern.test(userAgent)) ||
                      (!browserPatterns.some(pattern => pattern.test(userAgent)) && 
                       (!referer || referer === '' || userAgent.length < 50));
    
    if (!isExecutor) {
      return res.status(403).send('-- Access denied: Executor access only');
    }

    const scriptId = await redis.get(`name:${name.toLowerCase()}`);
    let script = null;
    
    if (scriptId) {
      const scriptData = await redis.get(`script:${scriptId}`);
      if (scriptData) {
        // Check if scriptData is already an object or needs parsing
        script = typeof scriptData === 'string' ? JSON.parse(scriptData) : scriptData;
      }
    } else {
      const keys = await redis.keys('script:*');
      
      for (const key of keys) {
        const scriptData = await redis.get(key);
        if (scriptData) {
          // Check if scriptData is already an object or needs parsing
          const parsedScript = typeof scriptData === 'string' ? JSON.parse(scriptData) : scriptData;
          if (parsedScript && parsedScript.name === name.toLowerCase()) {
            script = parsedScript;
            break;
          }
        }
      }
    }

    if (!script) {
      return res.status(404).send('-- Script not found');
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.send(script.content);
    
  } catch (error) {
    console.error('Raw endpoint error:', error);
    return res.status(500).send('-- Internal server error: ' + error.message);
  }
}
