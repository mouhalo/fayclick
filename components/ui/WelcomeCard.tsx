'use client';

interface WelcomeCardProps {
  title: string;
  description: string;
  icon: string;
  className?: string;
}

export default function WelcomeCard({ title, description, icon, className = '' }: WelcomeCardProps) {
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 ${className}`}>
      {/* Header avec icône */}
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
          <span className="text-2xl">{icon}</span>
        </div>
        <h3 className="text-lg font-bold text-gray-800 font-montserrat">
          {title}
        </h3>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm leading-relaxed">
        {description}
      </p>

      {/* Élément décoratif */}
      <div className="mt-4 h-1 w-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
    </div>
  );
}