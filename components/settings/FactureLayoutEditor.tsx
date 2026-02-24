'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Phone, Globe, Mail, CreditCard, Shield, Image,
  GripVertical, X, Save, Loader2, RotateCcw, Eye
} from 'lucide-react';
import { ConfigFacture, ConfigFactureZone, FactureFieldId, InfoFacture } from '@/types/auth';

// Définition des champs disponibles
const FACTURE_FIELDS: { id: FactureFieldId; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'logo', label: 'Logo', icon: Image, color: 'bg-amber-500' },
  { id: 'adresse_complete', label: 'Adresse', icon: MapPin, color: 'bg-blue-500' },
  { id: 'tel_contact', label: 'Téléphone', icon: Phone, color: 'bg-green-500' },
  { id: 'email', label: 'Email', icon: Mail, color: 'bg-red-500' },
  { id: 'site_web', label: 'Site web', icon: Globe, color: 'bg-purple-500' },
  { id: 'compte_bancaire', label: 'Compte bancaire', icon: CreditCard, color: 'bg-cyan-500' },
  { id: 'ninea_rc', label: 'NINEA / RC', icon: Shield, color: 'bg-gray-500' },
];

const DEFAULT_CONFIG: ConfigFacture = {
  header: { gauche: [], centre: [], droite: [] },
  footer: { gauche: [], centre: [], droite: [] },
};

type ZoneName = 'header' | 'footer';
type PositionName = 'gauche' | 'centre' | 'droite';

interface Props {
  config: ConfigFacture | undefined;
  infoFacture: InfoFacture;
  logo?: string;
  nomStructure: string;
  onSave: (config: ConfigFacture) => Promise<void>;
}

export default function FactureLayoutEditor({ config, infoFacture, logo, nomStructure, onSave }: Props) {
  const [layout, setLayout] = useState<ConfigFacture>(config ?? DEFAULT_CONFIG);
  const [draggedField, setDraggedField] = useState<FactureFieldId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Récupérer tous les champs déjà placés
  const getPlacedFields = useCallback((): FactureFieldId[] => {
    const placed: FactureFieldId[] = [];
    (['header', 'footer'] as ZoneName[]).forEach(zone => {
      (['gauche', 'centre', 'droite'] as PositionName[]).forEach(pos => {
        placed.push(...layout[zone][pos]);
      });
    });
    return placed;
  }, [layout]);

  // Champs disponibles (non placés)
  const availableFields = FACTURE_FIELDS.filter(f => !getPlacedFields().includes(f.id));

  // Vérifier si un champ info_facture est rempli
  const isFieldFilled = (fieldId: FactureFieldId): boolean => {
    if (fieldId === 'logo') return !!logo;
    return !!(infoFacture[fieldId as keyof InfoFacture]?.trim());
  };

  // Valeur d'un champ
  const getFieldValue = (fieldId: FactureFieldId): string => {
    if (fieldId === 'logo') return logo || '';
    return infoFacture[fieldId as keyof InfoFacture] || '';
  };

  // Drag handlers
  const handleDragStart = (fieldId: FactureFieldId) => {
    setDraggedField(fieldId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (zone: ZoneName, position: PositionName, e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedField) return;

    setLayout(prev => {
      const newLayout = JSON.parse(JSON.stringify(prev)) as ConfigFacture;
      // Retirer le champ de toutes les positions
      (['header', 'footer'] as ZoneName[]).forEach(z => {
        (['gauche', 'centre', 'droite'] as PositionName[]).forEach(p => {
          newLayout[z][p] = newLayout[z][p].filter((f: FactureFieldId) => f !== draggedField);
        });
      });
      // Ajouter à la nouvelle position
      newLayout[zone][position].push(draggedField);
      return newLayout;
    });
    setDraggedField(null);
  };

  // Retirer un champ d'une zone
  const removeField = (zone: ZoneName, position: PositionName, fieldId: FactureFieldId) => {
    setLayout(prev => {
      const newLayout = JSON.parse(JSON.stringify(prev)) as ConfigFacture;
      newLayout[zone][position] = newLayout[zone][position].filter((f: FactureFieldId) => f !== fieldId);
      return newLayout;
    });
  };

  // Reset
  const resetLayout = () => {
    setLayout(config ?? DEFAULT_CONFIG);
  };

  // Sauvegarder
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(layout);
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldConfig = (fieldId: FactureFieldId) => FACTURE_FIELDS.find(f => f.id === fieldId)!;

  // Chip d'un champ placé dans une zone
  const FieldChip = ({ fieldId, zone, position }: { fieldId: FactureFieldId; zone: ZoneName; position: PositionName }) => {
    const fieldConfig = getFieldConfig(fieldId);
    const Icon = fieldConfig.icon;
    const filled = isFieldFilled(fieldId);
    return (
      <div
        draggable
        onDragStart={() => handleDragStart(fieldId)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-grab active:cursor-grabbing border ${
          filled ? 'bg-white border-gray-200 text-gray-700' : 'bg-gray-100 border-dashed border-gray-300 text-gray-400'
        }`}
      >
        <GripVertical className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${filled ? 'text-blue-500' : 'text-gray-300'}`} />
        <span className="truncate max-w-[80px]">{fieldConfig.label}</span>
        <button
          onClick={(e) => { e.stopPropagation(); removeField(zone, position, fieldId); }}
          className="ml-auto p-0.5 hover:bg-red-100 rounded"
        >
          <X className="h-3 w-3 text-red-400" />
        </button>
      </div>
    );
  };

  // Zone de drop
  const DropZone = ({ zone, position, label }: { zone: ZoneName; position: PositionName; label: string }) => {
    const fields = layout[zone][position];
    const [isOver, setIsOver] = useState(false);

    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => { handleDrop(zone, position, e); setIsOver(false); }}
        onDragEnter={() => setIsOver(true)}
        onDragLeave={() => setIsOver(false)}
        className={`min-h-[60px] p-2 rounded-lg border-2 border-dashed transition-colors flex flex-col gap-1.5 ${
          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50/50'
        }`}
      >
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</span>
        {fields.length === 0 && !isOver && (
          <span className="text-[10px] text-gray-300 italic">Glisser ici</span>
        )}
        {fields.map(fieldId => (
          <FieldChip key={fieldId} fieldId={fieldId} zone={zone} position={position} />
        ))}
      </div>
    );
  };

  // Rendu aperçu d'un champ
  const PreviewField = ({ fieldId }: { fieldId: FactureFieldId }) => {
    const value = getFieldValue(fieldId);
    if (fieldId === 'logo' && logo) {
      return <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />;
    }
    if (!value) return null;
    const config = getFieldConfig(fieldId);
    const Icon = config.icon;
    return (
      <div className="flex items-center gap-1 text-[10px] text-gray-600">
        <Icon className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <span className="truncate">{value}</span>
      </div>
    );
  };

  // Rendu aperçu zone
  const PreviewZoneContent = ({ zone }: { zone: ConfigFactureZone }) => (
    <div className="grid grid-cols-3 gap-2 px-3 py-2">
      {(['gauche', 'centre', 'droite'] as PositionName[]).map(pos => (
        <div key={pos} className={`flex flex-col gap-0.5 ${pos === 'centre' ? 'items-center' : pos === 'droite' ? 'items-end' : 'items-start'}`}>
          {zone[pos].map(fieldId => (
            <PreviewField key={fieldId} fieldId={fieldId} />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Palette de champs disponibles */}
      <div className="p-4 bg-white rounded-xl border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Champs disponibles — glisser vers une zone
        </p>
        <div className="flex flex-wrap gap-2">
          {availableFields.length === 0 && (
            <span className="text-xs text-gray-400 italic">Tous les champs sont placés</span>
          )}
          {availableFields.map(field => {
            const Icon = field.icon;
            const filled = isFieldFilled(field.id);
            return (
              <div
                key={field.id}
                draggable
                onDragStart={() => handleDragStart(field.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing border transition-shadow hover:shadow-md ${
                  filled ? 'bg-white border-gray-200' : 'bg-gray-50 border-dashed border-gray-300 opacity-50'
                }`}
              >
                <GripVertical className="h-3.5 w-3.5 text-gray-400" />
                <div className={`w-6 h-6 ${field.color} rounded flex items-center justify-center`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className={`text-sm font-medium ${filled ? 'text-gray-700' : 'text-gray-400'}`}>
                  {field.label}
                </span>
                {!filled && <span className="text-[10px] text-red-400">(vide)</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Canvas - Page facture */}
      <div className="bg-white rounded-xl border-2 border-gray-300 shadow-lg overflow-hidden" style={{ maxWidth: 500, margin: '0 auto' }}>
        {/* Titre structure */}
        <div className="bg-gray-800 text-white text-center py-2 px-4">
          <span className="text-xs font-semibold uppercase tracking-wider">{nomStructure}</span>
        </div>

        {/* HEADER */}
        <div className="border-b-2 border-gray-200 p-3">
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">En-tête de facture</div>
          <div className="grid grid-cols-3 gap-2">
            <DropZone zone="header" position="gauche" label="Gauche" />
            <DropZone zone="header" position="centre" label="Centre" />
            <DropZone zone="header" position="droite" label="Droite" />
          </div>
        </div>

        {/* CORPS - non modifiable */}
        <div className="py-8 px-4 bg-gray-50 border-b-2 border-gray-200">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-gray-400">Zone articles</p>
            <p className="text-xs text-gray-300 mt-1">Détail des produits / prestations</p>
            <div className="mt-3 space-y-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-2 bg-gray-200 rounded" style={{ width: `${100 - i * 15}%`, margin: '0 auto' }} />
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-3">
          <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Pied de page</div>
          <div className="grid grid-cols-3 gap-2">
            <DropZone zone="footer" position="gauche" label="Gauche" />
            <DropZone zone="footer" position="centre" label="Centre" />
            <DropZone zone="footer" position="droite" label="Droite" />
          </div>
        </div>
      </div>

      {/* Boutons actions */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Eye className="h-4 w-4" />
          {showPreview ? 'Masquer aperçu' : 'Aperçu'}
        </button>
        <button
          onClick={resetLayout}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Réinitialiser
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder le modèle'}
        </button>
      </div>

      {/* Aperçu live */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border-2 border-green-300 shadow-lg overflow-hidden" style={{ maxWidth: 500, margin: '0 auto' }}>
              <div className="bg-green-600 text-white text-center py-1.5 px-4">
                <span className="text-xs font-semibold">Aperçu facture — {nomStructure}</span>
              </div>
              {/* Header preview */}
              <div className="border-b border-gray-200">
                <PreviewZoneContent zone={layout.header} />
              </div>
              {/* Corps */}
              <div className="py-6 px-3 bg-gray-50 border-b border-gray-200">
                <div className="text-center text-xs text-gray-400">[ Articles / Prestations ]</div>
              </div>
              {/* Footer preview */}
              <div className="border-t border-gray-200">
                <PreviewZoneContent zone={layout.footer} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
