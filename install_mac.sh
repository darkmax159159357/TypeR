#!/bin/sh
set -e

SRCDIR=$(cd "$(dirname "$0")" && pwd)

MANIFEST="$SRCDIR/CSXS/manifest.xml"
EXT_VERSION=$(grep -oE '<Extension Id="typer" Version="[^"]+"' "$MANIFEST" \
  | sed -E 's/.*Version="([^"]+)".*/\1/')

LANGUAGE=$(defaults read -g AppleLocale 2>/dev/null | cut -d"_" -f1 || echo "en")

MSG_INSTALL_EN="Photoshop extension TypeR v$EXT_VERSION will be installed."
MSG_CLOSE_PHOTOSHOP_EN="Close Photoshop (if it is open)."
MSG_PRESS_KEY_EN="Press any key to continue"
MSG_INSTALL_COMPLETE_EN="Installation completed."
MSG_OPEN_PHOTOSHOP_EN="Open Photoshop and in the menu click: [Window] > [Extensions] > [TypeR]"
MSG_PRESS_ENTER_EN="Press Enter to continue"
MSG_CREDITS_EN="Developer: Arcanos AL3mla8"
MSG_DISCORD_EN="Discord: https://discord.gg/PZhSh9bJ"
MSG_REMOVING_EN="Removing old versions..."
MSG_INSTALLING_EN="Installing new version..."

MSG_INSTALL_FR="L'extension Photoshop TypeR v$EXT_VERSION sera installee."
MSG_CLOSE_PHOTOSHOP_FR="Fermez Photoshop (s'il est ouvert)."
MSG_PRESS_KEY_FR="Appuyez sur une touche pour continuer"
MSG_INSTALL_COMPLETE_FR="Installation terminee."
MSG_OPEN_PHOTOSHOP_FR="Ouvrez Photoshop et dans le menu cliquez sur : [Fenetre] > [Extensions] > [TypeR]"
MSG_PRESS_ENTER_FR="Appuyez sur Entree pour continuer"
MSG_CREDITS_FR="Developpeur: Arcanos AL3mla8"
MSG_DISCORD_FR="Discord: https://discord.gg/PZhSh9bJ"
MSG_REMOVING_FR="Suppression des anciennes versions..."
MSG_INSTALLING_FR="Installation de la nouvelle version..."

MSG_INSTALL_ES="La extension de Photoshop TypeR v$EXT_VERSION sera instalada."
MSG_CLOSE_PHOTOSHOP_ES="Cierra Photoshop (si esta abierto)."
MSG_PRESS_KEY_ES="Presiona cualquier tecla para continuar"
MSG_INSTALL_COMPLETE_ES="Instalacion completada."
MSG_OPEN_PHOTOSHOP_ES="Abre Photoshop y en el menu haz clic en: [Ventana] > [Extensiones] > [TypeR]"
MSG_PRESS_ENTER_ES="Presiona Enter para continuar"
MSG_CREDITS_ES="Desarrollador: Arcanos AL3mla8"
MSG_DISCORD_ES="Discord: https://discord.gg/PZhSh9bJ"
MSG_REMOVING_ES="Eliminando versiones anteriores..."
MSG_INSTALLING_ES="Instalando nueva version..."

MSG_INSTALL_PT="A extensao Photoshop TypeR v$EXT_VERSION sera instalada."
MSG_CLOSE_PHOTOSHOP_PT="Feche o Photoshop (se estiver aberto)."
MSG_PRESS_KEY_PT="Pressione qualquer tecla para continuar"
MSG_INSTALL_COMPLETE_PT="Instalacao concluida."
MSG_OPEN_PHOTOSHOP_PT="Abra o Photoshop e no menu clique em: [Janela] > [Extensoes] > [TypeR]"
MSG_PRESS_ENTER_PT="Pressione Enter para continuar"
MSG_CREDITS_PT="Desenvolvedor: Arcanos AL3mla8"
MSG_DISCORD_PT="Discord: https://discord.gg/PZhSh9bJ"
MSG_REMOVING_PT="Removendo versoes anteriores..."
MSG_INSTALLING_PT="Instalando nova versao..."

if [ "$LANGUAGE" = "fr" ]; then
  MSG_INSTALL=$MSG_INSTALL_FR; MSG_CLOSE_PHOTOSHOP=$MSG_CLOSE_PHOTOSHOP_FR
  MSG_PRESS_KEY=$MSG_PRESS_KEY_FR; MSG_INSTALL_COMPLETE=$MSG_INSTALL_COMPLETE_FR
  MSG_OPEN_PHOTOSHOP=$MSG_OPEN_PHOTOSHOP_FR; MSG_PRESS_ENTER=$MSG_PRESS_ENTER_FR
  MSG_CREDITS=$MSG_CREDITS_FR; MSG_DISCORD=$MSG_DISCORD_FR
  MSG_REMOVING=$MSG_REMOVING_FR; MSG_INSTALLING=$MSG_INSTALLING_FR
elif [ "$LANGUAGE" = "es" ]; then
  MSG_INSTALL=$MSG_INSTALL_ES; MSG_CLOSE_PHOTOSHOP=$MSG_CLOSE_PHOTOSHOP_ES
  MSG_PRESS_KEY=$MSG_PRESS_KEY_ES; MSG_INSTALL_COMPLETE=$MSG_INSTALL_COMPLETE_ES
  MSG_OPEN_PHOTOSHOP=$MSG_OPEN_PHOTOSHOP_ES; MSG_PRESS_ENTER=$MSG_PRESS_ENTER_ES
  MSG_CREDITS=$MSG_CREDITS_ES; MSG_DISCORD=$MSG_DISCORD_ES
  MSG_REMOVING=$MSG_REMOVING_ES; MSG_INSTALLING=$MSG_INSTALLING_ES
elif [ "$LANGUAGE" = "pt" ]; then
  MSG_INSTALL=$MSG_INSTALL_PT; MSG_CLOSE_PHOTOSHOP=$MSG_CLOSE_PHOTOSHOP_PT
  MSG_PRESS_KEY=$MSG_PRESS_KEY_PT; MSG_INSTALL_COMPLETE=$MSG_INSTALL_COMPLETE_PT
  MSG_OPEN_PHOTOSHOP=$MSG_OPEN_PHOTOSHOP_PT; MSG_PRESS_ENTER=$MSG_PRESS_ENTER_PT
  MSG_CREDITS=$MSG_CREDITS_PT; MSG_DISCORD=$MSG_DISCORD_PT
  MSG_REMOVING=$MSG_REMOVING_PT; MSG_INSTALLING=$MSG_INSTALLING_PT
else
  MSG_INSTALL=$MSG_INSTALL_EN; MSG_CLOSE_PHOTOSHOP=$MSG_CLOSE_PHOTOSHOP_EN
  MSG_PRESS_KEY=$MSG_PRESS_KEY_EN; MSG_INSTALL_COMPLETE=$MSG_INSTALL_COMPLETE_EN
  MSG_OPEN_PHOTOSHOP=$MSG_OPEN_PHOTOSHOP_EN; MSG_PRESS_ENTER=$MSG_PRESS_ENTER_EN
  MSG_CREDITS=$MSG_CREDITS_EN; MSG_DISCORD=$MSG_DISCORD_EN
  MSG_REMOVING=$MSG_REMOVING_EN; MSG_INSTALLING=$MSG_INSTALLING_EN
fi

cat << EOF
$MSG_INSTALL

$MSG_CLOSE_PHOTOSHOP

EOF
read -n 1 -p "$MSG_PRESS_KEY"
echo

is_preferences_domain_exists() {
  defaults read "$1" > /dev/null 2> /dev/null
}

for version in {6..18}; do
  if is_preferences_domain_exists com.adobe.CSXS.${version} ; then
    defaults write com.adobe.CSXS.${version} PlayerDebugMode 1
  fi
done
killall -u "$(whoami)" csprefsd > /dev/null 2> /dev/null || true

EXTDIR="${HOME}/Library/Application Support/Adobe/CEP/extensions"
DESTDIR="${EXTDIR}/typertools"

TMPBACKUP="/tmp/typer_backup_userdata"
rm -rf "${TMPBACKUP}"
mkdir -p "${TMPBACKUP}"

USER_DIRS="fonts app/fonts app/themes"
USER_FILES="storage"
for oldname in typertools typer TypeR com.scanr.typer com.swirt.tools; do
  oldpath="${EXTDIR}/${oldname}"
  if [ -e "${oldpath}" ]; then
    for udir in ${USER_DIRS}; do
      srcpath="${oldpath}/${udir}"
      if [ -d "${srcpath}" ]; then
        backupdest="${TMPBACKUP}/${udir}"
        mkdir -p "${backupdest}"
        cp -rf "${srcpath}/"* "${backupdest}/" 2>/dev/null || true
        echo "  Backed up: ${udir} (${oldname})"
      fi
    done
    for ufile in ${USER_FILES}; do
      srcfile="${oldpath}/${ufile}"
      if [ -f "${srcfile}" ]; then
        cp -f "${srcfile}" "${TMPBACKUP}/${ufile}" 2>/dev/null || true
        echo "  Backed up: ${ufile} (${oldname})"
      fi
    done
  fi
done

echo ""
echo "$MSG_REMOVING"
for oldname in typertools typer TypeR com.scanr.typer com.swirt.tools; do
  oldpath="${EXTDIR}/${oldname}"
  if [ -e "${oldpath}" ]; then
    rm -rf "${oldpath}"
    echo "  Removed: ${oldname}"
  fi
done

echo ""
echo "$MSG_INSTALLING"
mkdir -p "${DESTDIR}"

for item in app CSXS icons locale .debug; do
  if [ -e "${SRCDIR}/${item}" ]; then
    cp -rf "${SRCDIR}/${item}" "${DESTDIR}/${item}"
    echo "  Copied: ${item}"
  fi
done

if [ -e "${SRCDIR}/themes" ]; then
  mkdir -p "${DESTDIR}/app/themes"
  cp -rf "${SRCDIR}/themes/"* "${DESTDIR}/app/themes/"
  echo "  Copied: themes"
fi

for udir in ${USER_DIRS}; do
  backupsrc="${TMPBACKUP}/${udir}"
  if [ -d "${backupsrc}" ]; then
    restoredest="${DESTDIR}/${udir}"
    mkdir -p "${restoredest}"
    cp -rf "${backupsrc}/"* "${restoredest}/" 2>/dev/null || true
    echo "  Restored: ${udir}"
  fi
done
for ufile in ${USER_FILES}; do
  backupfile="${TMPBACKUP}/${ufile}"
  if [ -f "${backupfile}" ]; then
    cp -f "${backupfile}" "${DESTDIR}/${ufile}" 2>/dev/null || true
    echo "  Restored: ${ufile}"
  fi
done
rm -rf "${TMPBACKUP}"

cat << EOF

$MSG_INSTALL_COMPLETE
$MSG_OPEN_PHOTOSHOP

$MSG_CREDITS
$MSG_DISCORD

EOF
read -n 1 -p "$MSG_PRESS_ENTER"
echo
