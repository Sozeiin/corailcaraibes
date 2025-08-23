import React, { useState } from 'react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { useAuth } from '@/contexts/AuthContext';
import { StockScanner } from '@/components/stock/StockScanner';
import { StockItem } from '@/types';

export default function StockScannerPage() {
  const { user } = useAuth();
  const baseId = user?.role !== 'direction' ? user?.baseId : undefined;

  const {
    data: rawStockItems = [],
    refetch: refetchStock
  } = useOfflineData<any>({ table: 'stock_items', baseId, dependencies: [user?.role, user?.baseId] });

  const stockItems: StockItem[] = rawStockItems.map((item: any) => ({
    id: item.id,
    name: item.name,
    reference: item.reference || '',
    category: item.category || '',
    quantity: item.quantity || 0,
    minThreshold: item.min_threshold || 0,
    unit: item.unit || '',
    location: item.location || '',
    baseId: item.base_id || '',
    baseName: '',
    photoUrl: item.photo_url || '',
    lastUpdated: item.last_updated || new Date().toISOString(),
    lastPurchaseDate: null,
    lastPurchaseCost: null,
    lastSupplierId: null
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Scanner Stock</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Scannez les codes-barres pour gérer rapidement votre stock
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <StockScanner stockItems={stockItems} onRefreshStock={refetchStock} />
      </div>
    </div>
  );
}