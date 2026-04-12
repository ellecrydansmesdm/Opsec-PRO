const { app, BrowserWindow, session } = require('electron');

app.on('ready', async () => {
    try {
        const cookieStr = 'AQByuVbr7Q_QAmUr3MjIVdbDL_f2ErmPH9lOHAtyCO6lyQe-KwOds-Oj4XwTeW7TS7_uZIKSTfP3xOEYqi1cxoFzT-ga4BB9Vxz-Yr96s83rsSGcntEnbAcFzjBw-DtBFUFBopQc7vJ7-kwBAJBRVB_mVGTKKbXfifZCjBiYoMw7Mj4axcbcRKpocJKbg7nGYkYd9tVobGDRnSXRq6o';
        
        await session.defaultSession.cookies.set({
            url: 'https://open.spotify.com',
            name: 'sp_dc',
            value: cookieStr,
            domain: '.spotify.com',
            path: '/',
            secure: true,
            httpOnly: true
        });

        const win = new BrowserWindow({ show: false });
        await win.loadURL('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const innerText = await win.webContents.executeJavaScript('document.body.innerText');
        console.log("ELECTRON BROWSER OUTPUT:", innerText);
        
        process.exit();
    } catch(err) {
        console.error(err);
        process.exit();
    }
});
