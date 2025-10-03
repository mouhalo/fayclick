<?php
/**
 * Endpoint PHP Upload Logo - FayClick V2
 * Solution Senior : Upload FTP avec logs détaillés
 */

// Activer affichage des erreurs pour debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Désactiver en prod
ini_set('log_errors', 1);

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Log function
function logMessage($message) {
    error_log("[UPLOAD-LOGO] " . $message);
}

// Gestion preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifier méthode POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logMessage("Méthode non autorisée: " . $_SERVER['REQUEST_METHOD']);
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

// Vérifier fichier uploadé
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errorCode = isset($_FILES['file']) ? $_FILES['file']['error'] : 'NO_FILE';
    logMessage("Erreur fichier: " . $errorCode);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Aucun fichier reçu (code: ' . $errorCode . ')']);
    exit;
}

$file = $_FILES['file'];
$filename = isset($_POST['filename']) ? basename($_POST['filename']) : basename($file['name']);

logMessage("=== DEBUT UPLOAD ===");
logMessage("Fichier reçu: " . $filename);
logMessage("Taille: " . $file['size'] . " bytes");
logMessage("Type MIME: " . $file['type']);

// Validation taille (max 500KB)
if ($file['size'] > 500 * 1024) {
    logMessage("Fichier trop volumineux: " . $file['size']);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Fichier trop volumineux (' . round($file['size'] / 1024) . 'KB). Max 500KB']);
    exit;
}

// Validation type MIME
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($file['type'], $allowedTypes)) {
    logMessage("Type MIME non supporté: " . $file['type']);
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Format non supporté: ' . $file['type']]);
    exit;
}

// Configuration FTP - Même serveur que le déploiement
$ftpHost = 'node260-eu.n0c.com';
$ftpUser = 'userv2@fayclick.net';
$ftpPass = 'Y@L@tif129*';
$ftpDir = 'uploads'; // Dossier relatif

logMessage("Connexion FTP: " . $ftpHost . " user: " . $ftpUser);

// Connexion FTP avec timeout
$ftpConn = @ftp_connect($ftpHost, 21, 30);
if (!$ftpConn) {
    $lastError = error_get_last();
    logMessage("Connexion FTP échouée: " . ($lastError['message'] ?? 'Unknown'));
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Connexion FTP échouée',
        'details' => $lastError['message'] ?? 'Cannot connect to ' . $ftpHost
    ]);
    exit;
}

logMessage("Connexion FTP établie");

// Login FTP
$login = @ftp_login($ftpConn, $ftpUser, $ftpPass);
if (!$login) {
    $lastError = error_get_last();
    logMessage("Auth FTP échouée: " . ($lastError['message'] ?? 'Unknown'));
    ftp_close($ftpConn);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Authentification FTP échouée',
        'details' => $lastError['message'] ?? 'Invalid credentials'
    ]);
    exit;
}

logMessage("Authentification FTP réussie");

// Mode passif
ftp_pasv($ftpConn, true);
logMessage("Mode passif activé");

// Créer dossier uploads si n'existe pas
$dirCreated = @ftp_mkdir($ftpConn, $ftpDir);
if ($dirCreated) {
    logMessage("Dossier créé: " . $ftpDir);
} else {
    logMessage("Dossier existe déjà: " . $ftpDir);
}

// Upload du fichier
$remoteFile = $ftpDir . '/' . $filename;
$localFile = $file['tmp_name'];

logMessage("Upload: " . $localFile . " → " . $remoteFile);

$upload = @ftp_put($ftpConn, $remoteFile, $localFile, FTP_BINARY);

if (!$upload) {
    $lastError = error_get_last();
    logMessage("Upload FTP échoué: " . ($lastError['message'] ?? 'Unknown'));
    ftp_close($ftpConn);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Upload échoué',
        'details' => $lastError['message'] ?? 'FTP PUT failed'
    ]);
    exit;
}

logMessage("Upload FTP réussi: " . $remoteFile);

// Vérifier que le fichier existe
$fileSize = @ftp_size($ftpConn, $remoteFile);
logMessage("Taille fichier distant: " . $fileSize . " bytes");

ftp_close($ftpConn);
logMessage("Connexion FTP fermée");

// Construction URL publique
$publicUrl = 'https://v2.fayclick.net/uploads/' . $filename;

logMessage("URL publique générée: " . $publicUrl);
logMessage("=== FIN UPLOAD (SUCCESS) ===");

// Succès
echo json_encode([
    'success' => true,
    'url' => $publicUrl,
    'filename' => $filename,
    'size' => $file['size']
]);
?>
