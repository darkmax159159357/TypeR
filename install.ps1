[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = New-Object System.Text.UTF8Encoding

$ScriptDir = $PSScriptRoot
Set-Location -Path $ScriptDir

$ManifestPath = Join-Path $ScriptDir "CSXS\manifest.xml"
if (-not (Test-Path $ManifestPath)) {
    Write-Host "[ERROR] File not found: $ManifestPath" -ForegroundColor Red
    Write-Host "Place this script next to the 'CSXS', 'app', 'icons', 'locale', 'themes' folders."
    Read-Host "Press Enter to exit..."
    exit
}

$Content = Get-Content $ManifestPath -Raw
if ($Content -match 'Extension Id="typer".*?Version="([^"]+)"') {
    $ExtVersion = $matches[1]
}
else {
    $ExtVersion = "Unknown"
}

$Lang = $Host.CurrentCulture.TwoLetterISOLanguageName

$msg_install = "Photoshop extension TypeR v$ExtVersion will be installed."
$msg_close = "Close Photoshop (if it is open)."
$msg_complete = "Installation completed."
$msg_open = "Open Photoshop and in the upper menu click: [Window] > [Extensions] > [TypeR]"
$msg_pause = "Press Enter to continue..."
$msg_credits = "Developer: Arcanos AL3mla8"
$msg_discord = "Discord: https://discord.gg/PZhSh9bJ"
$msg_removing = "Removing old version..."
$msg_installing = "Installing new version..."

if ($Lang -eq "fr") {
    $msg_install = "L'extension Photoshop TypeR v$ExtVersion sera installee."
    $msg_close = "Fermez Photoshop (s'il est ouvert)."
    $msg_complete = "Installation terminee."
    $msg_open = "Ouvrez Photoshop et dans le menu cliquez sur : [Fenetre] > [Extensions] > [TypeR]"
    $msg_pause = "Appuyez sur Entree pour continuer..."
    $msg_credits = "Developpeur: Arcanos AL3mla8"
    $msg_discord = "Discord: https://discord.gg/PZhSh9bJ"
    $msg_removing = "Suppression de l'ancienne version..."
    $msg_installing = "Installation de la nouvelle version..."
}
elseif ($Lang -eq "es") {
    $msg_install = "La extension de Photoshop TypeR v$ExtVersion sera instalada."
    $msg_close = "Cierra Photoshop (si esta abierto)."
    $msg_complete = "Instalacion completada."
    $msg_open = "Abre Photoshop y en el menu haz clic en: [Ventana] > [Extensiones] > [TypeR]"
    $msg_pause = "Presiona Enter para continuar..."
    $msg_credits = "Desarrollador: Arcanos AL3mla8"
    $msg_discord = "Discord: https://discord.gg/PZhSh9bJ"
    $msg_removing = "Eliminando version anterior..."
    $msg_installing = "Instalando nueva version..."
}
elseif ($Lang -eq "pt") {
    $msg_install = "A extensao Photoshop TypeR v$ExtVersion sera instalada."
    $msg_close = "Feche o Photoshop (se estiver aberto)."
    $msg_complete = "Instalacao concluida."
    $msg_open = "Abra o Photoshop e no menu clique em: [Janela] > [Extensoes] > [TypeR]"
    $msg_pause = "Pressione Enter para continuar..."
    $msg_credits = "Desenvolvedor: Arcanos AL3mla8"
    $msg_discord = "Discord: https://discord.gg/PZhSh9bJ"
    $msg_removing = "Removendo versao anterior..."
    $msg_installing = "Instalando nova versao..."
}
elseif ($Lang -eq "ar") {
    $msg_install = "TypeR v$ExtVersion :       Photoshop"
    $msg_close = "Photoshop (   )."
    $msg_complete = "     ."
    $msg_open = "[Window] > [Extensions] > [TypeR] : Photoshop"
    $msg_pause = "Enter     ..."
    $msg_credits = "Arcanos AL3mla8 :  "
    $msg_discord = "Discord: https://discord.gg/PZhSh9bJ"
    $msg_removing = "      ..."
    $msg_installing = "       ..."
}

Clear-Host
Write-Host "+------------------------------------------------------------------+" -ForegroundColor Cyan
Write-Host "|                          TypeR Installer                         |" -ForegroundColor Cyan
Write-Host "+------------------------------------------------------------------+" -ForegroundColor Cyan
Write-Host ""
Write-Host "  $msg_install"
Write-Host ""
Write-Host "  $msg_close" -ForegroundColor Yellow
Write-Host ""
Read-Host -Prompt "  $msg_pause"

6..18 | ForEach-Object {
    $RegPath = "HKCU:\Software\Adobe\CSXS.$_"
    if (Test-Path $RegPath) {
        Set-ItemProperty -Path $RegPath -Name "PlayerDebugMode" -Value 1 -Type String -ErrorAction SilentlyContinue
    }
}

$AppData = $env:APPDATA
$ExtensionsDir = Join-Path $AppData "Adobe\CEP\extensions"
$TargetDir = Join-Path $ExtensionsDir "typertools"

$OldNames = @("typertools", "typer", "TypeR", "com.scanr.typer", "com.swirt.tools")

$TempBackup = Join-Path $env:TEMP "typer_backup_userdata"
if (Test-Path $TempBackup) { Remove-Item $TempBackup -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -Path $TempBackup -ItemType Directory -Force | Out-Null

$UserDirs = @("fonts", "app\fonts", "app\themes")
$UserFiles = @("storage")
foreach ($oldName in $OldNames) {
    $oldPath = Join-Path $ExtensionsDir $oldName
    if (Test-Path $oldPath) {
        foreach ($udir in $UserDirs) {
            $srcPath = Join-Path $oldPath $udir
            if (Test-Path $srcPath) {
                $backupDest = Join-Path $TempBackup $udir
                if (-not (Test-Path $backupDest)) { New-Item -Path $backupDest -ItemType Directory -Force | Out-Null }
                Copy-Item "$srcPath\*" -Destination $backupDest -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "    Backed up: $udir ($oldName)" -ForegroundColor DarkGray
            }
        }
        foreach ($ufile in $UserFiles) {
            $srcFile = Join-Path $oldPath $ufile
            if (Test-Path $srcFile) {
                Copy-Item $srcFile -Destination (Join-Path $TempBackup $ufile) -Force -ErrorAction SilentlyContinue
                Write-Host "    Backed up: $ufile ($oldName)" -ForegroundColor DarkGray
            }
        }
    }
}

Write-Host ""
Write-Host "  $msg_removing" -ForegroundColor Yellow
foreach ($oldName in $OldNames) {
    $oldPath = Join-Path $ExtensionsDir $oldName
    if (Test-Path $oldPath) {
        Remove-Item $oldPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "    Removed: $oldName" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "  $msg_installing" -ForegroundColor Green
New-Item -Path $TargetDir -ItemType Directory -Force | Out-Null

$FoldersToCopy = @("app", "CSXS", "icons", "locale")

foreach ($folder in $FoldersToCopy) {
    $Source = Join-Path $ScriptDir $folder
    $Dest = Join-Path $TargetDir $folder
    if (Test-Path $Source) {
        Copy-Item $Source -Destination $Dest -Recurse -Force
        Write-Host "    Copied: $folder" -ForegroundColor DarkGray
    }
}

if (Test-Path "$ScriptDir\themes") {
    $ThemeDest = "$TargetDir\app\themes"
    if (-not (Test-Path $ThemeDest)) { New-Item $ThemeDest -ItemType Directory -Force | Out-Null }
    Copy-Item "$ScriptDir\themes\*" -Destination $ThemeDest -Recurse -Force
    Write-Host "    Copied: themes" -ForegroundColor DarkGray
}

if (Test-Path "$ScriptDir\.debug") {
    Copy-Item "$ScriptDir\.debug" -Destination "$TargetDir\.debug" -Force
    Write-Host "    Copied: .debug" -ForegroundColor DarkGray
}

foreach ($udir in $UserDirs) {
    $backupSrc = Join-Path $TempBackup $udir
    if (Test-Path $backupSrc) {
        $restoreDest = Join-Path $TargetDir $udir
        if (-not (Test-Path $restoreDest)) { New-Item -Path $restoreDest -ItemType Directory -Force | Out-Null }
        Copy-Item "$backupSrc\*" -Destination $restoreDest -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "    Restored: $udir" -ForegroundColor DarkGray
    }
}
foreach ($ufile in $UserFiles) {
    $backupFile = Join-Path $TempBackup $ufile
    if (Test-Path $backupFile) {
        Copy-Item $backupFile -Destination (Join-Path $TargetDir $ufile) -Force -ErrorAction SilentlyContinue
        Write-Host "    Restored: $ufile" -ForegroundColor DarkGray
    }
}
if (Test-Path $TempBackup) { Remove-Item $TempBackup -Recurse -Force -ErrorAction SilentlyContinue }

Write-Host ""
Write-Host "+------------------------------------------------------------------+" -ForegroundColor Green
Write-Host "|                      Installation Completed                      |" -ForegroundColor Green
Write-Host "+------------------------------------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Host "  $msg_complete"
Write-Host ""
Write-Host "  $msg_open" -ForegroundColor Cyan
Write-Host ""
Write-Host "+------------------------------------------------------------------+"
Write-Host "  $msg_credits"
Write-Host "  $msg_discord"
Write-Host "+------------------------------------------------------------------+"
Write-Host ""
Read-Host -Prompt $msg_pause
