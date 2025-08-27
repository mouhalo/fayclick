'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  icon: string;
  value: string | number | ReactNode;
  label: string;
  sublabel?: string | ReactNode;
  borderColor?: string;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Card statistique responsive pour dashboards
 * - Tailles adaptatives selon breakpoints
 * - Espacement et typography adaptatifs
 * - Loading state intégré
 */
export default function StatsCard({
  icon,
  value,
  label,
  sublabel,
  borderColor = "border-blue-500",
  onClick,
  isLoading = false,
  className = ""
}: StatsCardProps) {
  const cardContent = (
    <>
      <span className="text-2xl mb-2 block lg:text-3xl lg:mb-3">{icon}</span>
      <div className="text-2xl font-bold text-gray-800 mb-1 lg:text-3xl lg:mb-2">
        {isLoading ? (
          <div className="w-8 h-6 bg-gray-200 animate-pulse rounded lg:w-12 lg:h-8"></div>
        ) : (
          value
        )}
      </div>
      <div className="text-xs text-gray-600 font-semibold uppercase tracking-wide lg:text-sm">
        {label}
      </div>
      {sublabel && (
        <div className="text-xs mt-1 font-semibold lg:text-sm lg:mt-2">
          {isLoading ? (
            <div className="w-12 h-3 bg-gray-200 animate-pulse rounded lg:w-16 lg:h-4"></div>
          ) : (
            sublabel
          )}
        </div>
      )}
    </>
  );

  const cardClasses = `
    bg-white rounded-2xl p-4 shadow-lg border-l-4 cursor-pointer
    lg:p-6 lg:rounded-3xl lg:shadow-xl
    xl:p-8
    ${borderColor} ${className}
  `;

  if (onClick) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cardClasses}
        onClick={onClick}
      >
        {cardContent}
      </motion.div>
    );
  }

  return (
    <div className={cardClasses}>
      {cardContent}
    </div>
  );
}