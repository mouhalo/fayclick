/**
 * Onglet Informations Générales - Modal Client
 * Formulaire de modification + Stats cards + Ancienneté
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign,
  FileText,
  Clock,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { ClientDetailComplet, ClientFormData, StatCard } from '@/types/client';

interface OngletInfosGeneralesProps {
  clientDetail: ClientDetailComplet | null;
  formData: ClientFormData;
  updateFormField: (field: keyof ClientFormData, value: string) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  statsCards: StatCard[];
  isLoading: boolean;
}

// Composant StatCard réutilisable
function StatCardComponent({ stat }: { stat: StatCard }) {
  const getIconComponent = (iconName: string) => {
    const icons = {
      FileText,
      DollarSign,
      Calendar,
      Clock,
      User,
      Phone
    };
    return icons[iconName as keyof typeof icons] || FileText;
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-500/20',
          border: 'border-blue-400/30',
          icon: 'text-blue-300',
          text: 'text-blue-100'
        };
      case 'green':
        return {
          bg: 'bg-green-500/20',
          border: 'border-green-400/30',
          icon: 'text-green-300',
          text: 'text-green-100'
        };
      case 'purple':
        return {
          bg: 'bg-purple-500/20',
          border: 'border-purple-400/30',
          icon: 'text-purple-300',
          text: 'text-purple-100'
        };
      case 'orange':
        return {
          bg: 'bg-orange-500/20',
          border: 'border-orange-400/30',
          icon: 'text-orange-300',
          text: 'text-orange-100'
        };
      default:
        return {
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-400/30',
          icon: 'text-emerald-300',
          text: 'text-emerald-100'
        };
    }
  };

  const IconComponent = getIconComponent(stat.icon);
  const colors = getColorClasses(stat.color);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${colors.bg} ${colors.border} backdrop-blur-sm rounded-2xl p-4 border`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center`}>
          <IconComponent className={`w-5 h-5 ${colors.icon}`} />
        </div>
        {stat.badge && (
          <span className={`px-2 py-1 ${colors.bg} ${colors.border} rounded-lg text-xs ${colors.text} border`}>
            {stat.badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-white/60 text-sm font-medium">{stat.label}</p>
        <p className={`text-xl font-bold ${colors.text}`}>
          {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
        </p>
      </div>
    </motion.div>
  );
}

export function OngletInfosGenerales({
  clientDetail,
  formData,
  updateFormField,
  isEditing,
  setIsEditing,
  statsCards,
  isLoading
}: OngletInfosGeneralesProps) {

  return (
    <div className="space-y-6">
      {/* En-tête de l'onglet */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Informations Générales
          </h3>
          <p className="text-white/60 text-sm">
            {isEditing 
              ? "Modifiez les informations du client" 
              : "Consultez les informations et statistiques du client"
            }
          </p>
        </div>

        {/* Badge ancienneté */}
        {clientDetail && !isEditing && (
          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-300" />
              <div>
                <p className="text-emerald-100 text-sm font-medium">Ancienneté</p>
                <p className="text-emerald-200 text-xs">{clientDetail.anciennete_texte}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section formulaire */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-white font-medium flex items-center gap-2">
            <User className="w-5 h-5" />
            Informations Client
          </h4>
          
          {!isEditing && clientDetail && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 rounded-lg transition-colors border border-emerald-400/30"
            >
              <Edit3 className="w-4 h-4" />
              <span className="text-sm">Modifier</span>
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Nom du client */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Nom du client *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.nom_client}
                onChange={(e) => updateFormField('nom_client', e.target.value)}
                placeholder="Nom complet du client"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-white placeholder-white/50 backdrop-blur-sm"
                required
              />
            ) : (
              <div className="px-4 py-3 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                <p className="text-white">{clientDetail?.client.nom_client || 'Non défini'}</p>
              </div>
            )}
          </div>

          {/* Téléphone */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Téléphone *
            </label>
            {isEditing ? (
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                  type="tel"
                  value={formData.tel_client}
                  onChange={(e) => updateFormField('tel_client', e.target.value)}
                  placeholder="+221 XX XXX XX XX"
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-white placeholder-white/50 backdrop-blur-sm"
                  required
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                <Phone className="w-5 h-5 text-white/50" />
                <p className="text-white">{clientDetail?.client.tel_client || 'Non défini'}</p>
              </div>
            )}
          </div>

          {/* Adresse - pleine largeur */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Adresse
            </label>
            {isEditing ? (
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-white/50" />
                <textarea
                  value={formData.adresse}
                  onChange={(e) => updateFormField('adresse', e.target.value)}
                  placeholder="Adresse complète du client"
                  rows={3}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-white placeholder-white/50 backdrop-blur-sm resize-none"
                />
              </div>
            ) : (
              <div className="flex gap-3 px-4 py-3 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                <MapPin className="w-5 h-5 text-white/50 mt-0.5" />
                <p className="text-white">{clientDetail?.client.adresse || 'Non définie'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions en mode édition */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/20">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
          </div>
        )}
      </div>

      {/* Section statistiques */}
      {!isEditing && clientDetail && (
        <div>
          <h4 className="text-white font-medium mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Statistiques Client
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            {statsCards.map((stat, index) => (
              <motion.div
                key={stat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <StatCardComponent stat={stat} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* État de chargement */}
      {isLoading && !isEditing && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 text-white/60">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
            Chargement des informations...
          </div>
        </div>
      )}

      {/* Message si nouveau client */}
      {!clientDetail && !isEditing && !isLoading && (
        <div className="text-center py-8 bg-white/5 rounded-2xl border border-white/20">
          <User className="w-12 h-12 text-white/40 mx-auto mb-3" />
          <p className="text-white/60">Aucune information disponible</p>
          <button
            onClick={() => setIsEditing(true)}
            className="mt-3 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 rounded-xl transition-colors"
          >
            Ajouter les informations
          </button>
        </div>
      )}
    </div>
  );
}