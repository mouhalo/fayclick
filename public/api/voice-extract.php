<?php
/**
 * Proxy PHP pour l'API Anthropic (Claude)
 * Contourne les restrictions CORS pour les appels depuis le navigateur
 */

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Gérer les requêtes OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Vérifier que c'est une requête POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit();
}

// Récupérer le corps de la requête
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Données JSON invalides']);
    exit();
}

// Extraire les paramètres
$apiKey = $data['apiKey'] ?? '';
$transcription = $data['transcription'] ?? '';
$context = $data['context'] ?? 'client';

if (empty($apiKey) || empty($transcription)) {
    http_response_code(400);
    echo json_encode(['error' => 'Paramètres manquants (apiKey, transcription)']);
    exit();
}

// Prompts système par contexte
$systemPrompts = [
    'client' => 'Tu es un assistant qui extrait des informations client d\'un texte dicté en français.
Extrais les informations suivantes si présentes:
- nom_client: nom complet du client (prénom et nom)
- tel_client: numéro de téléphone (format sénégalais: 9 chiffres commençant par 7, ex: 771234567)
- adresse_client: adresse complète

IMPORTANT: Réponds UNIQUEMENT en JSON valide, sans aucun texte supplémentaire:
{"nom_client": "...", "tel_client": "...", "adresse_client": "...", "confidence": 0.0-1.0}

Si une information n\'est pas claire ou absente, ne l\'inclus pas dans la réponse (omets le champ).
Pour le téléphone: retire les espaces et le préfixe +221 s\'il y en a.
Le champ confidence indique ta confiance globale dans l\'extraction (0 à 1).',

    'service' => 'Tu es un assistant qui identifie un service mentionné dans un texte dicté en français.
Extrais le terme de recherche clé pour trouver ce service dans une liste.

IMPORTANT: Réponds UNIQUEMENT en JSON valide, sans aucun texte supplémentaire:
{"search_term": "terme de recherche", "confidence": 0.0-1.0}

Le search_term doit être un mot-clé simple et court pour filtrer une liste de services.',

    'equipement' => 'Tu es un assistant qui extrait des informations d\'équipement d\'un texte dicté en français.
Extrais les informations suivantes:
- designation: nom ou description de l\'équipement/article
- marque: marque si mentionnée
- prix_unitaire: prix en FCFA si mentionné (nombre entier sans espaces)
- quantite: quantité si mentionnée (nombre entier, défaut 1)

IMPORTANT: Réponds UNIQUEMENT en JSON valide, sans aucun texte supplémentaire:
{"designation": "...", "marque": "...", "prix_unitaire": 0, "quantite": 1, "confidence": 0.0-1.0}

Si une information n\'est pas mentionnée, omets le champ (sauf confidence).
Les prix sont en FCFA (francs CFA).'
];

$systemPrompt = $systemPrompts[$context] ?? $systemPrompts['client'];

// Préparer la requête pour Anthropic
$anthropicPayload = [
    'model' => 'claude-3-5-haiku-20241022',
    'max_tokens' => 256,
    'system' => $systemPrompt,
    'messages' => [
        [
            'role' => 'user',
            'content' => 'Texte dicté à analyser: "' . $transcription . '"'
        ]
    ]
];

// Appeler l'API Anthropic
$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($anthropicPayload),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01'
    ],
    CURLOPT_TIMEOUT => 30
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur cURL: ' . $error]);
    exit();
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo $response;
    exit();
}

// Retourner la réponse
echo $response;
