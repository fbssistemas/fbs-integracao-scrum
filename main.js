const {app, BrowserWindow, Menu, Tray, Notification, shell, dialog } = require('electron')
const log = require('electron-log')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const Integration = require('./src')

autoUpdater.autoDownload = false

let mainTray = {};

const db_host = process.env.FBS_DB_HOST
const db_port = process.env.FBS_DB_PORT
const db_name = process.env.FBS_DB_NAME
const db_user = process.env.FBS_DB_USER
const db_pass = process.env.FBS_DB_PASS

Integration.setDbConfig(db_host, db_port, db_name, db_user, db_pass)

const isDevelopment = process.env.NODE_ENV === 'development'

function callNotification() {
  const { updates, errors } = Integration.getIntegrationStatus()
  const notify = new Notification({
    title: 'FBS SCRUM INTEGRATION',
    body: `INTEGRATION STATUS\n
    UPDATES: ${updates} | ERRORS: ${errors}`,
    icon: path.resolve(__dirname, 'assets', 'icon.png')
  })
  notify.show()
}

function startApp() {
  const contextMenu = Menu.buildFromTemplate([
    {
      type: 'normal',
      label: 'STATUS DA INTEGRAÇÃO',
      icon: path.resolve(__dirname, 'assets', 'share.png'),
      click: () => callNotification(),
      enabled: true
    },
    {
      type: 'normal',
      label: 'FECHAR FBS SCRUM',
      icon: path.resolve(__dirname, 'assets', 'power-off.png'),
      role: 'quit',
      enabled: true,
    }
  ]);
  mainTray.setContextMenu(contextMenu);
  mainTray.setToolTip('FBS SCRUM INTEGRATION.')
  callNotification()
  Integration.checkIntegration()
}

app.whenReady().then(() => {
  mainTray = new Tray(path.resolve(__dirname, 'assets', 'icon.png'));
  startApp()

  if (!isDevelopment) {
    // Check for new version
    autoUpdater.checkForUpdatesAndNotify()

    // Not available an update
    autoUpdater.on('update-not-available', updateNotAvailable)

    // Available an update
    autoUpdater.on('update-available', updateAvailable)

    // Track download progress on autoUpdater
    autoUpdater.on('download-progress', updateDownloadProgress)

    // Listen for completed update download
    autoUpdater.on('update-downloaded', updateDownloaded)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) startApp()
  })  
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

const updateNotAvailable = () => {  
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify()
  }, 60000)
}

const updateAvailable = () => {
  const notify = new Notification({
    title: 'Aviso de Atualização!',
    body: 'Foi encontrado uma nova versão e será feito o download.',
    icon: path.resolve(__dirname, 'assets', 'icon.png')
  })
  notify.show()

  autoUpdater.downloadUpdate()
}

const updateDownloadProgress = (progressObj) => {
  log.info(`Progresso do Download: ${progressObj.percent}`)
}

const updateDownloaded = () => {
  const notify = new Notification({
    title: 'Aviso de Atualização!',
    body: 'Download da nova versão efetuado. \n O software está sendo reiniciado para atualizar.',
    icon: path.resolve(__dirname, 'assets', 'icon.png')
  })
  notify.show()
  autoUpdater.quitAndInstall()
}