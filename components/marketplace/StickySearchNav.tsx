'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MarketplaceSearchBar from './MarketplaceSearchBar';
import { StructurePublique } from '@/types/marketplace';

interface StickySearchNavProps {
  onSelectStructure?: (structure: StructurePublique) => void;
}

export default function StickySearchNav({ onSelectStructure }: StickySearchNavProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-2.5"
        >
          <div className="max-w-xl mx-auto">
            <MarketplaceSearchBar variant="sticky" onSelectStructure={onSelectStructure} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
