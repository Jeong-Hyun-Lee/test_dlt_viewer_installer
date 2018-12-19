function Controller()
{
  // skip license, target path, component select wizard page
  installer.setDefaultPageVisible (QInstaller.TargetDirectory, false);
  installer.setDefaultPageVisible (QInstaller.ComponentSelection, false);
  installer.setDefaultPageVisible (QInstaller.LicenseCheck, false);
  installer.setDefaultPageVisible (QInstaller.StartMenuSelection, false);

  installer.installationFinished.connect(onInstallationFinished);
  installer.uninstallationStarted.connect(onUninstallationStarted);
}

function setIntroPage () {
    var widget = gui.currentPageWidget(); // get the current wizard page
    if (widget != null) {
      if (installer.isUninstaller()) {
        // uninstall
        widget.title = "Uninstall DLT Viewer"; // set the page title
        widget.MessageLabel.setText("Remove DLT Viewer from your computer"); // set the welcome text

        widget.findChild("PackageManagerRadioButton").visible = false;
        widget.findChild("UpdaterRadioButton").visible = false;
        widget.findChild("UninstallerRadioButton").visible = false;

      } else if (installer.isInstaller()) {
        // install
        widget.title = "Install DLT Viewer"; // set the page title
        widget.MessageLabel.setText("setup is now ready to begin installing DLT Viewer on your computer"); // set the welcome text
      }
    }
}

function checkRunningProcess() {
  var options = systemInfo.kernelType === 'linux' ? ['-aux'] :['-e']
  var ps = installer.execute('ps', options)[0];
  var cnt = 0;
  var arr = ps.split('\n');
  arr.forEach(function (line) {
    if (/dlt_viewer/.test(line)) {
      cnt++;
    }
  });

  return cnt;
}

function removeAllPage() {
  installer.setDefaultPageVisible (QInstaller.Introduction, false);
  installer.setDefaultPageVisible (QInstaller.TargetDirectory, false);
  installer.setDefaultPageVisible (QInstaller.ComponentSelection, false);
  installer.setDefaultPageVisible (QInstaller.LicenseCheck, false);
  installer.setDefaultPageVisible (QInstaller.StartMenuSelection, false);
  installer.setDefaultPageVisible (QInstaller.ReadyForInstallation, false);
  installer.setDefaultPageVisible (QInstaller.PerformInstallation, false);
  installer.setDefaultPageVisible (QInstaller.InstallationFinished, false);
}

function onInstallationFinished() {
  installer.setAutomatedPageSwitchEnabled(false);
  installer.gainAdminRights();
  if (systemInfo.kernelType === 'linux') {
    installer.execute('mv', ['/opt/DLT Viewer/dlt-daemon', '/usr/bin/'])[0];
  } else if (systemInfo.kernelType === 'darwin') {
    installer.execute('cp', ['/Applications/DLT Viewer/libqdlt.1.dylib', '/usr/local/lib'])[0];
  }
	
	installer.dropAdminRights();
	installer.setAutomatedPageSwitchEnabled(true);
}

function onUninstallationStarted() {
  installer.setAutomatedPageSwitchEnabled(false);
  installer.gainAdminRights();
  if (systemInfo.kernelType === 'darwin') {
    installer.execute('rm -rf', ['/usr/local/lib/libqdlt.1.dylib'])[0];
  }
	
	installer.dropAdminRights();
	installer.setAutomatedPageSwitchEnabled(true);
}

Controller.prototype.IntroductionPageCallback = function()
{
  setIntroPage();
}

Controller.prototype.TargetDirectoryPageCallback = function() {}

Controller.prototype.LicenseAgreementPageCallback = function() {}

Controller.prototype.ComponentSelectionPageCallback = function() {}

Controller.prototype.StartMenuDirectoryPageCallback = function() {}

Controller.prototype.ReadyForInstallationPageCallback = function() {}

Controller.prototype.PerformInstallationPageCallback = function()
{
    gui.clickButton(buttons.NextButton); // automatically click the Next button
}

Controller.prototype.FinishedPageCallback = function() {}
