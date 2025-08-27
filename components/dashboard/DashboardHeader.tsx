'use client';

import { motion } from 'framer-motion';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  gradient?: string;
  onMenuClick: () => void;
  onNotificationClick: () => void;
  notificationCount?: number;
  className?: string;
}

/**
 * Header responsive pour dashboards
 * - Mobile: Design actuel compact
 * - Desktop: Header plus spacieux avec meilleure typography
 */
export default function DashboardHeader({
  title,
  subtitle,
  gradient = "from-blue-500 to-blue-600",
  onMenuClick,
  onNotificationClick,
  notificationCount = 0,
  className = ""
}: DashboardHeaderProps) {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`bg-gradient-to-r ${gradient} p-5 text-white relative overflow-hidden lg:p-8 ${className}`}
    >
      {/* Pattern Background */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 2px, transparent 2px)',
            backgroundSize: '25px 25px',
            animation: 'sparkle 20s linear infinite'
          }} 
        />
      </div>

      {/* Header Top */}
      <div className="flex justify-between items-center mb-5 relative z-10 lg:mb-8">
        <motion.button
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all lg:w-12 lg:h-12"
          onClick={onMenuClick}
        >
          <span className="text-xl lg:text-2xl">☰</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all relative lg:w-12 lg:h-12"
          onClick={onNotificationClick}
        >
          <span className="text-xl lg:text-2xl">🔔</span>
          {notificationCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold lg:w-6 lg:h-6 lg:text-sm"
            >
              {notificationCount}
            </motion.div>
          )}
        </motion.button>
      </div>

      {/* Welcome Section */}
      <div className="text-center relative z-10 lg:text-left lg:max-w-4xl">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-base opacity-90 mb-2 lg:text-lg lg:mb-3"
        >
          {subtitle}
        </motion.p>
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-2xl font-bold mb-2 lg:text-4xl lg:mb-4"
        >
          {title}
        </motion.h1>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100px' }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mx-auto h-1 bg-white/30 rounded-full lg:mx-0 lg:w-32 lg:h-2"
        />
      </div>
    </motion.div>
  );
}