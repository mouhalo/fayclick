@echo off
REM Script de deploiement FayClick V2 pour Windows
REM Auteur: Cascade AI
REM Date: 2025-10-01

echo ========================================
echo   DEPLOIEMENT FAYCLICK V2
echo ========================================
echo.

REM Etape 1: Verification des dependances
echo [1/5] Verification des dependances...
call npm --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Node.js/npm n'est pas installe
    pause
    exit /b 1
)
echo ✓ Node.js/npm detecte
echo.

REM Etape 2: Installation des dependances
echo [2/5] Installation des dependances...
call npm install
if errorlevel 1 (
    echo ERREUR: Installation des dependances echouee
    pause
    exit /b 1
)
echo ✓ Dependances installees
echo.

REM Etape 3: Build de l'application
echo [3/5] Build de l'application...
echo ATTENTION: Cela peut prendre quelques minutes...
call npm run build
if errorlevel 1 (
    echo ERREUR: Build echoue
    echo Verifiez les erreurs TypeScript/ESLint ci-dessus
    pause
    exit /b 1
)
echo ✓ Build reussi
echo.

REM Etape 4: Verification du dossier out
echo [4/5] Verification du build...
if not exist "out" (
    echo ERREUR: Le dossier 'out' n'existe pas
    pause
    exit /b 1
)
if not exist "out\index.html" (
    echo ERREUR: Le fichier 'out\index.html' n'existe pas
    pause
    exit /b 1
)
echo ✓ Fichiers de build valides
echo.

REM Etape 5: Copie du fichier .htaccess
echo [5/5] Preparation des fichiers de deploiement...
copy /Y ".htaccess" "out\.htaccess" >nul
if errorlevel 1 (
    echo ATTENTION: Impossible de copier .htaccess
) else (
    echo ✓ .htaccess copie dans le dossier out
)
echo.

REM Affichage du resume
echo ========================================
echo   BUILD TERMINE AVEC SUCCES!
echo ========================================
echo.
echo Dossier de deploiement: %CD%\out
echo.
echo PROCHAINES ETAPES:
echo 1. Uploadez le contenu du dossier 'out' vers votre serveur
echo 2. Assurez-vous que .htaccess est bien uploade
echo 3. Verifiez la configuration Apache/Nginx sur le serveur
echo.
echo METHODES DE DEPLOIEMENT:
echo - FTP/SFTP: Utilisez FileZilla ou WinSCP
echo - SSH: scp -r out/* user@server:/var/www/fayclick/
echo - Git: Commitez et deployez via CI/CD
echo.
echo Pour plus d'informations, consultez GUIDE_DEPLOIEMENT.md
echo.
pause
