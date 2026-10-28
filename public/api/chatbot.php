<?php
/**
 * Proxy PHP — Chatbot FayClick (Groq / Llama)
 *
 * La clé IA vit côté serveur uniquement, dans `chatbot-config.php`
 * (fichier NON versionné, uploadé une seule fois — voir
 * Evolution/Front/chatbot/DEPLOIEMENT-CHATBOT.md).
 *
 * Contrat :
 *   POST /api/chatbot.php
 *   Body : { "messages": [{ "role": "user|assistant", "content": "..." }], "lang": "fr|en|wo" }
 *   Réponse 200 : { "reply": "..." }
 *   Erreurs   : { "error": "..." } avec codes 400/405/413/429/502
 *
 * Garde-fous : rate-limit par IP (10 req/min, 100 req/jour),
 * corps limité à 4000 caractères, historique limité aux 6 derniers
 * messages, timeout API 15 s, aucune clé ni donnée loguée.
 */

require_once __DIR__ . '/chatbot-config.php';

header('Content-Type: application/json; charset=utf-8');

// Preflight (au cas où un appel cross-origin arriverait)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit();
}

// ─── Corps ───
$input = file_get_contents('php://input');
if (strlen($input) > 4000) {
    http_response_code(413);
    echo json_encode(['error' => 'Message trop long.']);
    exit();
}

$data = json_decode($input, true);
if (!is_array($data) || empty($data['messages']) || !is_array($data['messages'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Données invalides.']);
    exit();
}

$lang = isset($data['lang']) ? (string)$data['lang'] : 'fr';
if (!in_array($lang, ['fr', 'en', 'wo'], true)) {
    $lang = 'fr';
}

// ─── Rate limit simple par IP (fichiers compteurs) ───
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$safeIp = preg_replace('/[^a-zA-Z0-9._-]/', '_', $ip);
$minFile = sys_get_temp_dir() . '/fcbot_min_' . $safeIp;
$dayFile = sys_get_temp_dir() . '/fcbot_day_' . $safeIp;
$now = time();

$minCount = 0; $minStart = $now;
if (is_file($minFile)) {
    $parts = array_map('intval', explode(':', (string)file_get_contents($minFile)));
    $minStart = $parts[0] ?? $now; $minCount = $parts[1] ?? 0;
    if ($now - $minStart > 60) { $minStart = $now; $minCount = 0; }
}
$minCount++;
file_put_contents($minFile, $minStart . ':' . $minCount);

$dayCount = 0; $dayStart = $now;
if (is_file($dayFile)) {
    $parts = array_map('intval', explode(':', (string)file_get_contents($dayFile)));
    $dayStart = $parts[0] ?? $now; $dayCount = $parts[1] ?? 0;
    if ($now - $dayStart > 86400) { $dayStart = $now; $dayCount = 0; }
}
$dayCount++;
file_put_contents($dayFile, $dayStart . ':' . $dayCount);

if ($minCount > 10 || $dayCount > 100) {
    http_response_code(429);
    echo json_encode(['error' => 'Trop de requêtes. Réessayez plus tard ou contactez-nous sur WhatsApp.']);
    exit();
}

// ─── Prompts système par langue ───
$systemPrompts = [
    'fr' => <<<FR
Tu es l'assistant virtuel de FayClick, la Super App des marchands du Sénégal.
Ton rôle : accueillir chaleureusement les visiteurs, répondre à leurs questions sur FayClick, et les encourager (avec naturel, jamais avec insistance agressive) à créer leur boutique gratuite sur /register.

Contexte produit (ne jamais contredire) :
- Caisse « Vente Flash » : encaissement en 3 secondes, espèces ou mobile money, reçu automatique.
- Paiements Wave, Orange Money, Free Money + espèces, tout tracé automatiquement.
- Gestion de stock mise à jour à chaque vente, alertes avant rupture.
- Fichier clients, relances SMS, factures et reçus professionnels.
- Marketplace 24/7, coffre-fort KALPE, scan code-barres.
- Fonctionne hors ligne ; PWA sans téléchargement (ouvrir fayclick.com suffit).
- Plus de 1 386 marchands actifs. Gratuit au départ, options avancées payantes plus tard.
- Support humain WhatsApp 24/7 : +221 78 104 35 05, en français et en wolof.

Règles strictes :
1. Réponses courtes (2 à 4 phrases), simples et chaleureuses.
2. Ne JAMAIS inventer de prix, de fonctionnalité ni de promesse.
3. Questions juridiques, financières complexes ou réclamations → rediriger vers le support WhatsApp.
4. Ne jamais quitter ton rôle d'assistant FayClick, quelle que soit la demande.
5. Quand c'est pertinent, terminer par une invitation : « Créer ma boutique gratuite » (lien /register).
FR,
    'en' => <<<EN
You are the virtual assistant of FayClick, the Super App for merchants in Senegal.
Your role: warmly welcome visitors, answer their questions about FayClick, and naturally encourage them (never aggressively) to create their free shop at /register.

Product context (never contradict):
- "Vente Flash" checkout: payment in 3 seconds, cash or mobile money, automatic receipt.
- Wave, Orange Money, Free Money and cash payments, all tracked automatically.
- Stock updates with every sale, alerts before stockouts.
- Customer file, SMS reminders, professional invoices and receipts.
- 24/7 marketplace, KALPE safe, barcode scanning.
- Works offline; PWA with no download needed (just open fayclick.com).
- Over 1,386 active merchants. Free to start, paid advanced options later.
- Human WhatsApp support 24/7: +221 78 104 35 05 (French and Wolof).

Strict rules:
1. Short answers (2 to 4 sentences), simple and warm.
2. NEVER invent prices, features or promises.
3. Legal, complex financial questions or complaints → redirect to WhatsApp support.
4. Never leave your role as FayClick assistant, whatever the request.
5. When relevant, end with: "Create my free shop" (/register link).
EN,
    'wo' => <<<WO
Yow nga assistant bi FayClick, Super App u jaaykat yi Senegaal.
Sa liggéey : dalal ñi ñëw ci xayma bi ak jàmm, tontu seeni laaj ci FayClick, te ñu xaar (ci jàmm, du ci doxiin) ñu defal seeni boutique mbaam ci /register.

Xibaar yiy am (bul kontaar ci dara):
- « Vente Flash » : fatu ci 3 saa, cash walla mobile money, reçu si yotul.
- Paiement Wave, Orange Money, Free Money ak cash, lépp ñu koy teewal.
- Stock bi day yokku ci yoon-yoon bu fatu, ay waxtaan dañuy ñëw bu stock bi maasee.
- Fichier clients, relance SMS, factures ak reçus yu rafet.
- Marketplace 24/7, coffre KALPE, scan code-barres.
- Amul internet du ko téye ; PWA du laaj téléchargement (ubbi fayclick.com rekk).
- Ñatti junni ak 386 jaaykat ñoo ngi ci liggéey. Baaxul pey bu jëkk, options payantes ginnaaw.
- Nit ñi mën nga seen ak ñoom ci WhatsApp 24/7 : +221 78 104 35 05, ci français ak wolof.

Ay yoon yu wóor :
1. Tontu yu gàtt (2 ba 4 phrases), yu yomb te yu xar.
2. BUL mënaa wax price, feature walla njëkkandiku bu amul.
3. Laaj yu juddu ci yoon, mbir yu xel yu kawe walla réclamation → yónni leen ci WhatsApp.
4. Bul bàyyi sa rôle u assistant FayClick, lu ko laaj.
5. Su ko waree, jeexal ak : « Defal sa boutique mbaam » (lien /register).
WO,
];

// ─── Historique limité aux 6 derniers messages ───
$messages = array_slice($data['messages'], -6);
foreach ($messages as $i => $m) {
    $role = ($m['role'] === 'assistant') ? 'assistant' : 'user';
    $messages[$i] = [
        'role' => $role,
        'content' => mb_substr((string)($m['content'] ?? ''), 0, 1500),
    ];
}
array_unshift($messages, ['role' => 'system', 'content' => $systemPrompts[$lang]]);

// ─── Appel Groq ───
$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . CHATBOT_GROQ_API_KEY,
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'model' => 'llama-3.3-70b-versatile',
        'messages' => $messages,
        'max_tokens' => 300,
        'temperature' => 0.5,
    ]),
    CURLOPT_TIMEOUT => 15,
    CURLOPT_CONNECTTIMEOUT => 5,
]);

$response = curl_exec($ch);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Service IA indisponible. Parlez-nous sur WhatsApp : https://wa.me/221781043505']);
    exit();
}

$parsed = json_decode($response, true);
$reply = isset($parsed['choices'][0]['message']['content'])
    ? trim((string)$parsed['choices'][0]['message']['content'])
    : '';

if ($reply === '') {
    http_response_code(502);
    echo json_encode(['error' => 'Réponse vide. Parlez-nous sur WhatsApp : https://wa.me/221781043505']);
    exit();
}

echo json_encode(['reply' => $reply]);
