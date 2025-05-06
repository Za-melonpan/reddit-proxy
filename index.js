const https = require('https');
const querystring = require('querystring');

module.exports = (req, res) => {
  const getAccessToken = () => {
    return new Promise((resolve, reject) => {
      const postData = querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: process.env.REDDIT_ACCESS_TOKEN,
        client_id: process.env.REDDIT_CLIENT_ID,
      });

      const options = {
        hostname: 'www.reddit.com',
        path: '/api/v1/access_token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'MakeBot/0.1 by za_melonpan',
        },
      };

      const tokenReq = https.request(options, tokenRes => {
        let body = '';
        tokenRes.on('data', chunk => body += chunk);
        tokenRes.on('end', () => {
          const data = JSON.parse(body);
          if (data.access_token) resolve(data.access_token);
          else reject(new Error('No access token returned'));
        });
      });

      tokenReq.on('error', reject);
      tokenReq.write(postData);
      tokenReq.end();
    });
  };

  getAccessToken().then(token => {
    const url = new URL(req.url, 'https://oauth.reddit.com');
    const proxyOptions = {
      hostname: 'oauth.reddit.com',
      path: url.pathname + url.search,
      method: req.method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'MakeBot/0.1 by za_melonpan',
      },
    };

    const proxy = https.request(proxyOptions, redditRes => {
      res.writeHead(redditRes.statusCode, redditRes.headers);
      redditRes.pipe(res, { end: true });
    });

    req.pipe(proxy, { end: true });

    proxy.on('error', err => {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Proxy failed', details: err.message }));
    });
  }).catch(err => {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Token fetch failed', details: err.message }));
  });
};
