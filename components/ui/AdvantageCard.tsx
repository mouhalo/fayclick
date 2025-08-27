'use client';

interface AdvantageItem {
  icon: string;
  text: string;
}

interface AdvantageCardProps {
  title: string;
  advantages: AdvantageItem[];
  icon: string;
  className?: string;
}

export default function AdvantageCard({ title, advantages, icon, className = '' }: AdvantageCardProps) {
  return (
    <div className={`bg-gradient-to-br from-cyan-50 to-blue-100 rounded-2xl p-6 shadow-lg border border-cyan-200 hover:shadow-xl transition-all duration-300 ${className}`}>
      {/* Header avec icône */}
      <div className="flex items-center mb-5">
        <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
          <span className="text-white text-xl">{icon}</span>
        </div>
        <h3 className="text-lg font-bold text-gray-800 font-montserrat">
          {title}
        </h3>
      </div>

      {/* Liste des avantages */}
      <div className="space-y-4">
        {advantages.map((advantage, index) => (
          <div key={index} className="flex items-start group">
            {/* Icône de l'avantage */}
            <div className="w-8 h-8 bg-white/80 rounded-lg flex items-center justify-center mr-3 flex-shrink-0 group-hover:bg-white transition-colors duration-200 shadow-sm">
              <span className="text-lg">{advantage.icon}</span>
            </div>
            
            {/* Texte de l'avantage */}
            <p className="text-gray-700 text-sm leading-relaxed font-medium flex-1 pt-1">
              {advantage.text}
            </p>
          </div>
        ))}
      </div>

      {/* Badge "Écosystème FayClick" */}
      <div className="mt-5 pt-4 border-t border-cyan-200/50">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-800 text-xs font-medium">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Écosystème FayClick
        </div>
      </div>
    </div>
  );
}