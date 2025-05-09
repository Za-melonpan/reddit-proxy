const https = require('https');
const querystring = require('querystring');

module.exports = async (req, res) => {
  try {
    // Step 1: Refresh token to get access token
    const token = await getAccessToken();

    if (!token) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Token fetch failed', details: 'No access token returned' }));
    }

    // Step 2: Make the actual Reddit API request
    const apiUrl = new URL(req.url, 'https://oauth.reddit.com');
    const options = {
      hostname: 'oauth.reddit.com',
      path: apiUrl.pathname + apiUrl.search,
      method: req.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': process.env.REDDIT_USER_AGENT || 'MakeBot/0.1 by za_melonpan'
      }
    };

    const proxy = https.request(options, redditRes => {
      res.writeHead(redditRes.statusCode, redditRes.headers);
      redditRes.pipe(res, { end: true });
    });

    proxy.on('error', err => {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Proxy failed', details: err.message }));
    });

    req.pipe(proxy, { end: true });

  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Unexpected failure', details: err.message }));
  }
};

// Helper: Get Access Token from Reddit using refresh token
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: process.env.REDDIT_REFRESH_TOKEN
    });

    const options = {
      hostname: 'www.reddit.com',
      path: '/api/v1/access_token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': process.env.REDDIT_USER_AGENT || 'MakeBot/0.1 by za_melonpan'
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Token response:', data);  // Debug log for token response
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.access_token);
        } catch (err) {
          reject(new Error('Failed to parse token response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}
