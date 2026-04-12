const https = require('https');

const req = https.request({
    hostname: 'open.spotify.com',
    port: 443,
    path: '/get_access_token?reason=transport&productType=web_player',
    method: 'GET',
    headers: {
        'Cookie': 'sp_dc=fake_cookie_test',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
    }
}, (res) => {
    console.log("Status Code:", res.statusCode);
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => console.log("Response Body:", data));
});
req.end();
