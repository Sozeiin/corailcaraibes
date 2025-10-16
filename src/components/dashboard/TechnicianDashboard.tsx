import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Wrench, Ship, Scan, Eye, Anchor } from 'lucide-react';
import { TechnicianPlanningView } from './TechnicianPlanningView';
export function TechnicianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return <div className="space-y-6">
      {/* En-tête personnalisé technicien */}
      <div className="bg-gradient-to-r from-marine-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Bonjour {user?.name} 👋</h1>
            <p className="text-marine-100 mt-1">
              Voici votre planning de la semaine
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <Button onClick={() => navigate('/checkin')} variant="secondary" className="border-white/20 bg-lime-700 hover:bg-lime-600 text-gray-50 font-extralight rounded-xl">
              <Anchor className="h-4 w-4 mr-2" />
              Check-in Bateau
            </Button>
            <div className="text-center">
              <p className="text-base text-marine-200">
                {format(new Date(), 'EEEE dd MMMM yyyy', {
                locale: fr
              })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Planning principal */}
      <TechnicianPlanningView />

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/stock/scanner')}>
              <Scan className="h-6 w-6" />
              <span className="text-xs">Scanner Stock</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/maintenance')}>
              <Wrench className="h-6 w-6" />
              <span className="text-xs">Maintenance</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/boat-preparation')}>
              <Ship className="h-6 w-6" />
              <span className="text-xs">Préparations</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => navigate('/boats')}>
              <Eye className="h-6 w-6" />
              <span className="text-xs">Voir Bateaux</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
}