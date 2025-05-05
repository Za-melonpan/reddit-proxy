module.exports = (req, res) => {
  const https = require('https');
  const url = new URL(req.url, 'https://oauth.reddit.com');

  const options = {
    hostname: 'oauth.reddit.com',
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      'Authorization': `Bearer ${process.env.REDDIT_ACCESS_TOKEN}`,
      'User-Agent': 'MakeBot/0.1 by za_melonpan',
    },
  };

  const proxy = https.request(options, redditRes => {
    res.writeHead(redditRes.statusCode, redditRes.headers);
    redditRes.pipe(res, { end: true });
  });

  req.pipe(proxy, { end: true });

  proxy.on('error', err => {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Proxy failed', details: err.message }));
  });
};
