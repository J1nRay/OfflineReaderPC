/* 轻量打包脚本：读取 package.json 版本，产出 Windows 安装包 */
const builder = require('electron-builder');
const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
const Platform = builder.Platform;

const args = process.argv.slice(2);
const isWin32 = args.includes('--win32');
const archArg = args.find(a => a.startsWith('--win32='));
const arch = archArg ? archArg.split('=')[1] : 'x64';

(async () => {
  if (!isWin32) {
    console.log('仅配置了 Windows 打包，请使用 --win32');
    return;
  }
  await builder.build({
    targets: Platform.WINDOWS.createTarget(['nsis'], arch === 'ia32' ? builder.Arch.ia32 : builder.Arch.x64),
    config: {
      appId: 'com.offlinereader.pc',
      productName: 'OfflineReader',
      directories: { output: 'release' },
      files: ['dist', 'dist-electron'],
      win: {
        icon: 'public/icons/icon.ico',
        target: ['nsis']
      },
      nsis: {
        oneClick: false,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: true
      }
    }
  });
  console.log(`build success, version: ${pkg.version}`);
})();
