// services/chatbot.service.ts
// Assistant hybride : FAQ locale instantanée (corpus traduit) → sinon LLM via proxy PHP.

import { FAQ_CORPUS } from '@/components/chatbot/chatbot-data';
import type { Locale } from '@/contexts/LanguageContext';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Cherche une réponse dans le corpus local.
 * Retourne { answer, ctaRegister } ou null si aucune correspondance.
 */
export function matchLocalFaq(text: string, lang: Locale): { answer: string; ctaRegister: boolean } | null {
  const normalized = normalize(text);
  // Les clés courtes (ex. « om ») doivent matcher un MOT ENTIER :
  // sinon elles produisent des faux positifs (« kilomètres » contient « om »).
  const words = normalized.split(/\s+/);
  let best: { score: number; entry: (typeof FAQ_CORPUS)[number] } | null = null;

  for (const entry of FAQ_CORPUS) {
    const keys = lang === 'fr' ? entry.keysFr : lang === 'en' ? entry.keysEn : entry.keysWo;
    let score = 0;
    for (const key of keys) {
      const nk = normalize(key);
      if (nk.length <= 3) {
        if (words.includes(nk)) score += 2;
      } else if (normalized.includes(nk)) {
        score += 1;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, entry };
    }
  }

  if (!best) return null;
  return { answer: best.entry.answers[lang], ctaRegister: best.entry.ctaRegister === true };
}

/**
 * Envoie la conversation au proxy PHP (même origine, clé côté serveur).
 * Lève une erreur en cas d'échec (réseau, 429, 502…) pour que l'UI fasse le repli.
 */
export async function askAi(messages: ChatMessage[], lang: Locale): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const res = await fetch('/api/chatbot.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.slice(-6), lang }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.reply === 'string' && data.reply) {
      return data.reply;
    }
    throw new Error(typeof data.error === 'string' ? data.error : 'IA indisponible');
  } finally {
    clearTimeout(timer);
  }
}
