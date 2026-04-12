const { exec } = require('child_process');
exec('tasklist /v /fo csv | findstr /i "spotify.exe"', (err, stdout, stderr) => {
    if (err) return console.error(err);
    console.log(stdout.split('\n').map(l => {
        const parts = l.split('","');
        if (parts.length > 8 && parts[8]) return parts[8].replace('"\r', '');
        return null;
    }).filter(Boolean));
});
