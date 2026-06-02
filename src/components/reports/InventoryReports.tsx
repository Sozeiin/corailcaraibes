import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, Package, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { formatDateSafe } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';

interface InventoryReportsProps {
  isDirection: boolean;
  isChefBase: boolean;
}

interface InventoryRecord {
  id: string;
  session_id: string;
  item_name: string;
  item_reference: string | null;
  base_id: string;
  theoretical_qty: number;
  counted_qty: number;
  difference: number;
  actor_name: string | null;
  created_at: string;
}

interface SessionSummary {
  sessionId: string;
  baseId: string;
  baseName: string;
  date: string;
  itemCount: number;
  discrepancyCount: number;
  totalDifference: number;
  actorName: string | null;
}

export function InventoryReports({ isDirection }: InventoryReportsProps) {
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();
  const [yearTab, setYearTab] = useState(String(currentYear));

  const years = [currentYear, currentYear - 1, currentYear - 2];

  const { data: bases } = useQuery({
    queryKey: ['inventory-bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('id, name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ['inventory-reports', user?.baseId, isDirection],
    enabled: isDirection || !!user?.baseId,
    queryFn: async () => {
      let query = supabase
        .from('stock_inventory_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isDirection && user?.baseId) {
        query = query.eq('base_id', user.baseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as InventoryRecord[];
    },
  });

  const baseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (bases ?? []).forEach((b: any) => map.set(b.id, b.name));
    return map;
  }, [bases]);

  // Group records into sessions
  const sessionsByYear = useMemo(() => {
    const map = new Map<number, SessionSummary[]>();
    const sessionMap = new Map<string, InventoryRecord[]>();

    (records ?? []).forEach((rec) => {
      const arr = sessionMap.get(rec.session_id) ?? [];
      arr.push(rec);
      sessionMap.set(rec.session_id, arr);
    });

    sessionMap.forEach((recs, sessionId) => {
      const first = recs[0];
      const year = new Date(first.created_at).getFullYear();
      const summary: SessionSummary = {
        sessionId,
        baseId: first.base_id,
        baseName: baseNameMap.get(first.base_id) ?? 'Base inconnue',
        date: first.created_at,
        itemCount: recs.length,
        discrepancyCount: recs.filter((r) => Number(r.difference) !== 0).length,
        totalDifference: recs.reduce((sum, r) => sum + Number(r.difference), 0),
        actorName: first.actor_name,
      };
      const yearArr = map.get(year) ?? [];
      yearArr.push(summary);
      map.set(year, yearArr);
    });

    map.forEach((arr) => arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return map;
  }, [records, baseNameMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Chargement de l'inventaire...</span>
      </div>
    );
  }

  const renderYear = (year: number) => {
    const sessions = sessionsByYear.get(year) ?? [];

    if (sessions.length === 0) {
      return (
        <div className="text-center p-8 text-muted-foreground">
          Aucun inventaire enregistré pour {year}
        </div>
      );
    }

    // Group sessions by base
    const byBase = new Map<string, SessionSummary[]>();
    sessions.forEach((s) => {
      const arr = byBase.get(s.baseId) ?? [];
      arr.push(s);
      byBase.set(s.baseId, arr);
    });

    return (
      <div className="space-y-6">
        {Array.from(byBase.entries()).map(([baseId, baseSessions]) => (
          <Card key={baseId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                {baseSessions[0].baseName}
                <Badge variant="secondary" className="ml-2">
                  {baseSessions.length} inventaire{baseSessions.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Réalisé par</TableHead>
                    <TableHead className="text-right">Articles comptés</TableHead>
                    <TableHead className="text-right">Écarts</TableHead>
                    <TableHead className="text-right">Écart total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baseSessions.map((s) => (
                    <TableRow key={s.sessionId}>
                      <TableCell>{formatDateSafe(s.date)}</TableCell>
                      <TableCell>{s.actorName ?? '—'}</TableCell>
                      <TableCell className="text-right">{s.itemCount}</TableCell>
                      <TableCell className="text-right">
                        {s.discrepancyCount > 0 ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {s.discrepancyCount}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={s.totalDifference < 0 ? 'text-destructive' : s.totalDifference > 0 ? 'text-emerald-600' : ''}>
                          {s.totalDifference > 0 ? '+' : ''}{s.totalDifference}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Historique des inventaires par base
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={yearTab} onValueChange={setYearTab}>
            <TabsList>
              {years.map((y) => (
                <TabsTrigger key={y} value={String(y)}>
                  {y === currentYear ? `${y} (en cours)` : y}
                </TabsTrigger>
              ))}
            </TabsList>
            {years.map((y) => (
              <TabsContent key={y} value={String(y)} className="mt-4">
                {renderYear(y)}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
