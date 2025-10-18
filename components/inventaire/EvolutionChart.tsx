'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import type { EvolutionVente } from '@/types/inventaire.types';

interface EvolutionChartProps {
  data: EvolutionVente[];
  titre?: string;
}

/**
 * Graphique d'évolution des ventes avec barres vertes
 * Affiche le montant des ventes sur une période donnée
 */
export default function EvolutionChart({ data, titre = 'Évolution des Ventes' }: EvolutionChartProps) {
  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload }: {active?: boolean; payload?: unknown[]}) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as EvolutionVente;
      return (
        <div className="bg-white p-4 rounded-lg shadow-xl border-2 border-emerald-500">
          <p className="font-semibold text-gray-800 mb-2">{data.label}</p>
          <p className="text-emerald-600 font-bold text-lg">
            {data.montant.toLocaleString('fr-FR')} FCFA
          </p>
          <p className="text-gray-600 text-sm mt-1">
            {data.nombre_ventes} {data.nombre_ventes > 1 ? 'ventes' : 'vente'}
          </p>
        </div>
      );
    }
    return null;
  };

  // Trouver la valeur maximale pour colorer différemment la barre la plus haute
  const maxMontant = Math.max(...data.map(d => d.montant));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl p-6 shadow-lg"
    >
      {/* Titre */}
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
        {titre}
      </h3>

      {/* Graphique */}
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="periode"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#d1d5db' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }} />
            <Bar dataKey="montant" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.montant === maxMontant ? '#059669' : '#10b981'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <p>Aucune donnée disponible pour cette période</p>
        </div>
      )}
    </motion.div>
  );
}
