'use client';

import { ShoppingCart, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { ArticlePanier } from '@/services/online-seller.service';
import { useTranslations } from '@/hooks/useTranslations';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency, formatNumber } from '@/lib/format-locale';

interface DesktopMiniCartProps {
  articles: ArticlePanier[];
  nomStructure?: string;
  onOpenDrawer: () => void;
  onSupprimer: (id_produit: number) => void;
  alwaysShow?: boolean;
}

export default function DesktopMiniCart({ articles, nomStructure, onOpenDrawer, onSupprimer, alwaysShow = false }: DesktopMiniCartProps) {
  const t = useTranslations('marketplace');
  const { locale } = useLanguage();
  const total = articles.reduce((sum, a) => sum + a.prix_vente * a.quantite, 0);
  const nbArticles = articles.reduce((sum, a) => sum + a.quantite, 0);
  const fmtMontant = (m: number) => formatCurrency(m, locale, { devise: 'FCFA' });
  const fmtNum = (n: number) => formatNumber(n, locale, { maximumFractionDigits: 0 });

  if (!alwaysShow && articles.length === 0) return null;

  return (
    <aside className="hidden lg:block w-72 flex-shrink-0">
      <div className="sticky top-20 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 space-y-3">
        {/* Titre — style Stitch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-white/60" />
            <h3 className="text-white font-bold text-sm">{t('miniCart.title')}</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
            {nbArticles > 1 ? t('miniCart.itemPlural', { count: nbArticles }) : t('miniCart.itemSingular', { count: nbArticles })}
          </span>
        </div>

        {articles.length === 0 ? (
          <div className="py-6 text-center">
            <ShoppingCart className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-white/30 text-xs">{t('miniCart.empty')}</p>
          </div>
        ) : (
          <>
            {/* Articles */}
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {articles.map(article => (
                <div key={article.id_produit} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/10">
                    {article.photo_url ? (
                      <Image src={article.photo_url} alt="" width={40} height={40} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-3.5 h-3.5 text-white/20" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 truncate">{article.nom_produit}</p>
                    <p className="text-xs text-emerald-400 font-bold">{fmtMontant(article.prix_vente * article.quantite)}</p>
                    <p className="text-[10px] text-white/30">{article.quantite} x {fmtNum(article.prix_vente)}</p>
                  </div>

                  <button
                    onClick={() => onSupprimer(article.id_produit)}
                    className="text-red-400/50 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Sous-total + Total + CTA */}
            <div className="border-t border-white/10 pt-3 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40">{t('miniCart.subtotal')}</span>
                <span className="text-white/70">{fmtMontant(total)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40">{t('miniCart.shippingEstimated')}</span>
                <span className="text-white/70">{t('miniCart.shippingFree')}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/5">
                <span className="text-white font-bold text-sm">{t('miniCart.total')}</span>
                <span className="text-emerald-400 font-bold text-sm">{fmtMontant(total)}</span>
              </div>
              <button
                onClick={onOpenDrawer}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition-all active:scale-95 mt-2"
              >
                {t('miniCart.checkout')}
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
