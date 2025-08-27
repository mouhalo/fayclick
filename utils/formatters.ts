export function formatDate(dateString: string): string {
  // Format YYYY-MM-DD vers format lisible
  const date = new Date(dateString);
  
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatTime(timeString: string): string {
  // Format HH:MM:SS vers HH:MM
  return timeString.substring(0, 5);
}

export function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR');
}

export function formatPhoneNumber(phone: string): string {
  // Nettoyer et formater le numéro sénégalais
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 9 && /^(77|78|76|75|70)/.test(cleaned)) {
    return `+221 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone;
}

export function validateSenegalPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return /^(77|78|76|75|70)\d{7}$/.test(cleaned);
}