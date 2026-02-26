<?php
/**
 * Endpoint PHP Upload Logo - FayClick V2
 * Version CURL (alternative pour problèmes de permissions)
 */

// Configuration stricte des erreurs
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/upload-logo-errors.log');

// Démarrer le buffer de sortie proprement
ob_start();

// Fallback dossier temporaire si non configuré par le serveur
$tmpDir = sys_get_temp_dir();
if (empty($tmpDir) || !is_writable($tmpDir)) {
    $tmpDir = __DIR__ . '/tmp';
    if (!is_dir($tmpDir)) {
        @mkdir($tmpDir, 0755, true);
    }
    if (is_dir($tmpDir) && is_writable($tmpDir)) {
        ini_set('upload_tmp_dir', $tmpDir);
    }
}

// Headers CORS et Content-Type
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

/**
 * Fonction de log sécurisée
 */
function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] [UPLOAD-CURL] [$level] $message\n";
    error_log($logEntry);
    @file_put_contents('/tmp/upload-logo-debug.log', $logEntry, FILE_APPEND);
}

/**
 * Envoi de réponse JSON propre
 */
function sendJSON($data, $code = 200) {
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Gestion des erreurs PHP fatales
 */
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        logMessage("Erreur fatale: " . $error['message'], 'ERROR');
        sendJSON(['success' => false, 'error' => 'Erreur serveur interne'], 500);
    }
});

// Gestion des requêtes OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJSON(['success' => true], 200);
}

// Vérification de la méthode HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['success' => false, 'error' => 'Méthode non autorisée'], 405);
}

// Vérifier que CURL est disponible
if (!function_exists('curl_init')) {
    logMessage("CURL n'est pas disponible", 'ERROR');
    sendJSON(['success' => false, 'error' => 'CURL non disponible sur le serveur'], 500);
}

// === MODE BASE64 : Contourne UPLOAD_ERR_NO_TMP_DIR sur hébergements mutualisés ===
// Le client peut envoyer le fichier en base64 dans le body JSON
// Format: { "file_base64": "data:image/jpeg;base64,...", "filename": "mon-logo.jpg" }
$useBase64 = false;
$tmpFilePath = null;

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (strpos($contentType, 'application/json') !== false || !isset($_FILES['file'])) {
    $jsonBody = json_decode(file_get_contents('php://input'), true);
    if ($jsonBody && !empty($jsonBody['file_base64'])) {
        $useBase64 = true;
        logMessage("=== MODE BASE64 ===");

        // Extraire les données base64
        $base64Data = $jsonBody['file_base64'];
        $filename = isset($jsonBody['filename']) ? basename($jsonBody['filename']) : 'upload.jpg';

        // Supprimer le préfixe data:image/...;base64, si présent
        if (preg_match('/^data:image\/(\w+);base64,/', $base64Data, $matches)) {
            $base64Data = substr($base64Data, strlen($matches[0]));
            $detectedExt = $matches[1] === 'jpeg' ? 'jpg' : $matches[1];
        }

        $fileData = base64_decode($base64Data);
        if ($fileData === false) {
            sendJSON(['success' => false, 'error' => 'Données base64 invalides'], 400);
        }

        $fileSize = strlen($fileData);
        $fileType = 'image/' . (pathinfo($filename, PATHINFO_EXTENSION) ?: 'jpeg');

        // Sauvegarder dans le dossier tmp local
        $localTmpDir = __DIR__ . '/tmp';
        if (!is_dir($localTmpDir)) {
            @mkdir($localTmpDir, 0755, true);
        }
        $tmpFilePath = $localTmpDir . '/' . uniqid('upload_') . '_' . $filename;
        file_put_contents($tmpFilePath, $fileData);

        // Construire un pseudo $_FILES pour le reste du code
        $file = [
            'name' => $filename,
            'type' => $fileType,
            'tmp_name' => $tmpFilePath,
            'error' => UPLOAD_ERR_OK,
            'size' => $fileSize
        ];
    } else {
        sendJSON(['success' => false, 'error' => 'Aucun fichier reçu'], 400);
    }
}

// === MODE MULTIPART CLASSIQUE ===
if (!$useBase64) {
    if (!isset($_FILES['file'])) {
        logMessage("Aucun fichier dans la requête", 'ERROR');
        sendJSON(['success' => false, 'error' => 'Aucun fichier reçu'], 400);
    }

    $file = $_FILES['file'];

    // Gestion des erreurs d'upload PHP
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $uploadErrors = [
            UPLOAD_ERR_INI_SIZE => 'Fichier trop volumineux (limite serveur)',
            UPLOAD_ERR_FORM_SIZE => 'Fichier trop volumineux (limite formulaire)',
            UPLOAD_ERR_PARTIAL => 'Fichier partiellement uploadé',
            UPLOAD_ERR_NO_FILE => 'Aucun fichier uploadé',
            UPLOAD_ERR_NO_TMP_DIR => 'Dossier temporaire manquant',
            UPLOAD_ERR_CANT_WRITE => 'Erreur écriture disque',
            UPLOAD_ERR_EXTENSION => 'Extension PHP a bloqué l\'upload'
        ];
        $errorMsg = $uploadErrors[$file['error']] ?? 'Erreur inconnue';

        // Si UPLOAD_ERR_NO_TMP_DIR, suggérer le mode base64
        if ($file['error'] === UPLOAD_ERR_NO_TMP_DIR) {
            $errorMsg .= '. Utilisez le mode base64 (Content-Type: application/json)';
        }

        sendJSON(['success' => false, 'error' => $errorMsg, 'details' => 'use_base64_mode'], 400);
    }
}

// Récupération et nettoyage du nom de fichier
$filename = isset($_POST['filename']) ? basename($_POST['filename']) : basename($file['name']);
$filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $filename);

if (empty($filename) || $filename === '.' || $filename === '..') {
    sendJSON(['success' => false, 'error' => 'Nom de fichier invalide'], 400);
}

logMessage("=== UPLOAD CURL ===");
logMessage("Fichier: $filename (" . number_format($file['size']) . " octets) Mode: " . ($useBase64 ? 'base64' : 'multipart'));

// Validation de la taille (5 MB max pour photos, 500 KB pour logos)
$maxSize = 5 * 1024 * 1024; // 5 MB
if ($file['size'] > $maxSize) {
    sendJSON(['success' => false, 'error' => 'Fichier trop volumineux. Maximum: 5 MB'], 400);
}

if ($file['size'] === 0) {
    sendJSON(['success' => false, 'error' => 'Le fichier est vide'], 400);
}

// Validation du type MIME
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
$fileType = strtolower($file['type']);

if (!in_array($fileType, $allowedTypes)) {
    sendJSON(['success' => false, 'error' => "Format non supporté. Types acceptés: JPEG, PNG, GIF, WebP"], 400);
}

// Validation de l'extension
$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

if (!in_array($ext, $allowedExtensions)) {
    sendJSON(['success' => false, 'error' => "Extension non supportée: .$ext"], 400);
}

// Vérifier que le fichier temporaire existe
if (!file_exists($file['tmp_name'])) {
    sendJSON(['success' => false, 'error' => 'Fichier temporaire introuvable'], 500);
}

// Configuration FTP - Auto-détection du domaine
$serverHost = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isFayclickCom = (strpos($serverHost, 'fayclick.com') !== false);

if ($isFayclickCom) {
    // fayclick.com → serveur node156
    $ftpHost = 'node156-eu.n0c.com';
    $ftpUser = 'upload@fayclick.com';
    $ftpPass = "O}<OFd'iw6";
    $baseUrl = 'https://fayclick.com/uploads/';
} else {
    // fayclick.net / v2.fayclick.net → serveur node260
    $ftpHost = 'node260-eu.n0c.com';
    $ftpUser = 'uploadv2@fayclick.net';
    $ftpPass = '<0vs:PWBhd';
    $baseUrl = 'https://fayclick.net/uploads/';
}

logMessage("Domaine détecté: $serverHost → " . ($isFayclickCom ? 'fayclick.com' : 'fayclick.net'));

// Construire l'URL FTP complète
$ftpUrl = "ftp://$ftpHost/$filename";

logMessage("URL FTP: $ftpUrl");

// Nettoyer le buffer
while (ob_get_level() > 0) {
    ob_end_clean();
}

// Initialiser CURL pour l'upload FTP
$ch = curl_init();

// Ouvrir le fichier en lecture
$fp = fopen($file['tmp_name'], 'r');
if (!$fp) {
    logMessage("Impossible d'ouvrir le fichier temporaire", 'ERROR');
    sendJSON(['success' => false, 'error' => 'Erreur lors de la lecture du fichier'], 500);
}

// Configuration CURL
curl_setopt_array($ch, [
    CURLOPT_URL => $ftpUrl,
    CURLOPT_USERPWD => "$ftpUser:$ftpPass",
    CURLOPT_UPLOAD => true,
    CURLOPT_INFILE => $fp,
    CURLOPT_INFILESIZE => $file['size'],
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 30,
    CURLOPT_FTP_CREATE_MISSING_DIRS => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_VERBOSE => false,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    // Options FTP supplémentaires
    CURLOPT_FTPSSLAUTH => CURLFTPAUTH_DEFAULT,
    CURLOPT_FTP_USE_EPSV => false, // Désactiver EPSV (peut causer des problèmes)
]);

logMessage("Début upload CURL...");

// Exécuter l'upload
$response = curl_exec($ch);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$ftpCode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

// Fermer le fichier et CURL
fclose($fp);
curl_close($ch);

// Vérifier le résultat
if ($curlErrno !== 0) {
    logMessage("Erreur CURL: [$curlErrno] $curlError", 'ERROR');
    
    // Messages d'erreur spécifiques
    $errorMessages = [
        7 => 'Impossible de se connecter au serveur FTP',
        9 => 'Accès refusé',
        67 => 'Échec de l\'authentification FTP',
        78 => 'Fichier non trouvé sur le serveur',
    ];
    
    $userError = $errorMessages[$curlErrno] ?? "Erreur FTP: $curlError";
    
    sendJSON([
        'success' => false,
        'error' => $userError,
        'debug' => [
            'curl_errno' => $curlErrno,
            'curl_error' => $curlError,
            'ftp_code' => $ftpCode
        ]
    ], 500);
}

// Vérifier le code FTP
if ($ftpCode >= 400) {
    logMessage("Code FTP d'erreur: $ftpCode", 'ERROR');
    sendJSON([
        'success' => false,
        'error' => 'Échec de l\'upload FTP',
        'debug' => [
            'ftp_code' => $ftpCode,
            'message' => 'Le serveur FTP a refusé l\'upload'
        ]
    ], 500);
}

logMessage("✓ Upload CURL réussi!");
logMessage("Code FTP: $ftpCode");

// Construire l'URL finale (utilise $baseUrl détectée plus haut)
$fileUrl = $baseUrl . $filename;

$callerOrigin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? 'unknown';
logMessage("Appelé depuis: $callerOrigin");

logMessage("=== SUCCÈS ===");
logMessage("URL: $fileUrl");

// Nettoyage du fichier temporaire base64
if ($useBase64 && $tmpFilePath && file_exists($tmpFilePath)) {
    @unlink($tmpFilePath);
    logMessage("Fichier temporaire base64 supprimé");
}

// Réponse de succès
sendJSON([
    'success' => true,
    'url' => $fileUrl,
    'filename' => $filename,
    'size' => $file['size'],
    'type' => $fileType,
    'timestamp' => time()
], 200);