// api/raw.js - Replace entire file
import { Redis } from '@upstash/redis';
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // Extract script name from URL path
  const name = req.query.name || req.url.slice(1); // Remove leading slash
  
  if (!name) {
    return res.status(400).send('-- Script name is required');
  }
  
  try {
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    
    const executorPatterns = [
      /synapse/i, /krnl/i, /script-ware/i, /sentinel/i,
      /oxygen/i, /fluxus/i, /electron/i, /jjsploit/i,
      /exploit/i, /injector/i, /executor/i, /roblox/i,
      /lua/i, /http/i
    ];
    
    const browserPatterns = [
      /chrome/i, /firefox/i, /safari/i, /edge/i, /opera/i,
      /mozilla/i, /webkit/i, /gecko/i, /version/i
    ];
    
    const isExecutor = executorPatterns.some(pattern => pattern.test(userAgent)) ||
                      (!browserPatterns.some(pattern => pattern.test(userAgent)) && 
                       (!referer || referer === '' || userAgent.length < 50));
    
    if (!isExecutor) {
      // Return HTML page for browser users
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executor Access Only</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
        body { font-family: 'Poppins', sans-serif; background-color: #1a092a; color: #e0e0e0; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .container { display: flex; flex-direction: column; align-items: flex-start; padding: 40px; background: rgba(45, 24, 69, 0.7); border-radius: 16px; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); max-width: 100%; width: 650px; }
        h1 { font-size: 2.2em; color: #f0e6ff; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center; gap: 15px; }
        h1 span { font-size: 1.4em; color: #ff5577; }
        p { font-size: 1.2em; color: #c3b4d4; text-align: left; margin: 0 0 24px 0; }
        .code-container { width: 100%; background: #1e0a33; border-radius: 12px; padding: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; box-sizing: border-box; }
        pre { margin: 0; flex-grow: 1; overflow-x: auto; }
        code { font-family: 'Courier New', Courier, monospace; font-size: 1em; color: #e0e0e0; white-space: pre-wrap; word-break: break-all; }
        #copy-button { background-color: #8b5cf6; color: white; border: none; padding: 12px 18px; border-radius: 8px; cursor: pointer; transition: background-color 0.2s ease; font-weight: 600; font-size: 1.1em; flex-shrink: 0; }
        #copy-button:hover { background-color: #7c3aed; }
    </style>
</head>
<body>
    <div class="container">
        <h1><span>🚫</span> Executor Access Only</h1>
        <p>This url only for Roblox executors only. Copy the code below to run it.</p>
        <div class="code-container">
            <pre><code id="copy-text-content">Loading...</code></pre>
            <button id="copy-button">Copy</button>
        </div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const codeElement = document.getElementById('copy-text-content');
            const copyButton = document.getElementById('copy-button');
            
            const scriptName = '${name}';
            const command = \`loadstring(game:HttpGet("https://\${window.location.host}/\${scriptName}"))()\`;
            codeElement.textContent = command;
            
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(command).then(() => {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => { copyButton.textContent = originalText; }, 2000);
                }).catch(err => console.error(err));
            });
        });
    </script>
</body>
</html>`;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(htmlContent);
    }
    
    // Handle executor requests
    const scriptId = await redis.get(`name:${name.toLowerCase()}`);
    let script = null;
    
    if (scriptId) {
      const scriptData = await redis.get(`script:${scriptId}`);
      if (scriptData) {
        script = typeof scriptData === 'string' ? JSON.parse(scriptData) : scriptData;
      }
    } else {
      const keys = await redis.keys('script:*');
      
      for (const key of keys) {
        const scriptData = await redis.get(key);
        if (scriptData) {
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
