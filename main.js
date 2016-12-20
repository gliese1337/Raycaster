const electron = require('electron');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');

let win = null;

function createWindow(){
	win = new BrowserWindow({width: 800, height: 600});

	// and load the index.html of the app.
	win.loadURL(url.format({
		pathname: path.join(__dirname, 'webgl.html'),
		protocol: 'file:',
		slashes: true
	}));

	// Emitted when the window is closed.
	win.on('closed', function(){ win = null; });
}

app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function(){
	if(process.platform === 'darwin'){ return; }
	app.quit();
});

app.on('activate', function(){
	if (win === null){
		createWindow();
	}
});