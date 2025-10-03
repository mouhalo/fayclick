<?php
/**
 * Endpoint PHP Upload Logo - FayClick V2
 * Solution Senior : Upload FTP simplifié
 */

// Désactiver complètement l'affichage des erreurs
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Buffer de sortie
ob_start();

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Log function
function logMessage($message) {
    error_log("[UPLOAD-LOGO] " . $message);
}

// JSON Response helper
function sendJSON($data, $code = 200) {
    ob_end_clean();
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    sendJSON([], 200);
}

// Vérifier POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJSON(['success' => false, 'error' => 'Méthode non autorisée'], 405);
}

// Vérifier fichier
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    sendJSON(['success' => false, 'error' => 'Aucun fichier reçu'], 400);
}

$file = $_FILES['file'];
$filename = isset($_POST['filename']) ? basename($_POST['filename']) : basename($file['name']);

logMessage("Upload: " . $filename . " (" . $file['size'] . " bytes)");

// Validation taille
if ($file['size'] > 500 * 1024) {
    sendJSON(['success' => false, 'error' => 'Fichier trop volumineux (max 500KB)'], 400);
}

// Validation type
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($file['type'], $allowedTypes)) {
    sendJSON(['success' => false, 'error' => 'Format non supporté'], 400);
}

// Config FTP
$ftpConn = @ftp_connect('node260-eu.n0c.com', 21, 30);
if (!$ftpConn) {
    logMessage("Connexion FTP échouée");
    sendJSON(['success' => false, 'error' => 'Connexion FTP échouée'], 500);
}

$login = @ftp_login($ftpConn, 'uploadv2@fayclick.net', '<0vs:PWBhd');
if (!$login) {
    ftp_close($ftpConn);
    logMessage("Auth FTP échouée");
    sendJSON(['success' => false, 'error' => 'Authentification FTP échouée'], 500);
}

logMessage("FTP connecté");
ftp_pasv($ftpConn, true);

// Upload (nettoyer buffer juste avant)
ob_clean();
$upload = @ftp_put($ftpConn, $filename, $file['tmp_name'], FTP_BINARY);

if (!$upload) {
    ftp_close($ftpConn);
    logMessage("Upload échoué");
    sendJSON(['success' => false, 'error' => 'Upload FTP échoué'], 500);
}

ftp_close($ftpConn);
logMessage("Upload réussi: " . $filename);

// Succès
sendJSON([
    'success' => true,
    'url' => 'https://fayclick.net/uploads/' . $filename,
    'filename' => $filename,
    'size' => $file['size']
]);
?>
