'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Vérifier l'authentification
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = authService.getUser();
    if (!user || (user.nom_groupe !== 'ADMIN' && user.nom_groupe !== 'SYSTEM')) {
      // Rediriger vers le bon dashboard selon le type
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Dashboard Administration</h1>
        <p className="text-gray-300">
          Page d'administration système - En cours de développement
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-gray-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Structures</h2>
            <p className="text-gray-400">Gérer toutes les structures</p>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Utilisateurs</h2>
            <p className="text-gray-400">Gestion des utilisateurs</p>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Rapports</h2>
            <p className="text-gray-400">Statistiques globales</p>
          </div>
        </div>
      </div>
    </div>
  );
}
