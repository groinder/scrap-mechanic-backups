import { app, BrowserWindow, Tray, Menu, Notification } from 'electron';
import { join } from 'path';
declare const MAIN_WINDOW_WEBPACK_ENTRY: any;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

let tray = null;
let mainWindow: BrowserWindow = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  })

  const notifyOnClose = () => {
    const notification = new Notification({
      title: 'Scrap Mechanic Backups is still running',
      body: 'The app runs in the background, right-click tray icon to close.',
      timeoutType: 'default'
    });

    notification.show();
  }

  const createWindow = () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({
      height: 600,
      width: 800,
      webPreferences: {
        nodeIntegration: true
      },
      show: !app.getLoginItemSettings().openAtLogin,
      autoHideMenuBar: true
    });

    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

    if (!app.isPackaged) {
      // Open the DevTools.
      mainWindow.webContents.openDevTools();
    }

    // @ts-ignore
    mainWindow.on('minimize', function (event) {
      event.preventDefault();
      mainWindow.hide();
      notifyOnClose();
    });

    mainWindow.on('close', function (event) {
      // @ts-ignore
      if (!app.isQuiting) {
        event.preventDefault();
        mainWindow.hide();
        notifyOnClose();
      }

      return false;
    });

    tray = new Tray(join(__dirname, 'static', 'icon', 'icon.png'));

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App', click: function () {
          mainWindow.show();
        }
      },
      {
        label: 'Quit', click: function () {
          // @ts-ignore
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      mainWindow.show();
    })
  };

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.on('ready', createWindow);

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
