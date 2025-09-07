import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scan, Camera } from 'lucide-react';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ScanInputProps {
  onScan: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ScanInput({ onScan, disabled = false, placeholder = "Scanner ou saisir une référence" }: ScanInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isNative } = useMobileCapacitor();
  const { user } = useAuth();

  // Récupérer les articles du stock pour l'autocomplétion
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items-scan', user?.baseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id, name, reference')
        .eq('base_id', user?.baseId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.baseId
  });

  // Auto-focus input when component mounts or mode changes
  useEffect(() => {
    if (!isCameraMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCameraMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.length >= 2) {
      const search = value.toLowerCase();
      const matches = stockItems
        .filter((item: any) =>
          item.reference?.toLowerCase().includes(search) ||
          item.name.toLowerCase().includes(search)
        )
        .slice(0, 5);
      setFilteredItems(matches);
    } else {
      setFilteredItems([]);
    }
  };

  const handleSelect = (item: any) => {
    onScan(item.reference);
    setInputValue('');
    setFilteredItems([]);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onScan(inputValue.trim());
      setInputValue('');
      setFilteredItems([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInputSubmit(e);
    }
  };

  const handleCameraScan = async () => {
    if (!isNative) {
      // Fallback pour le web - basculer vers input manuel
      setIsCameraMode(false);
      return;
    }

    try {
      // Simuler un scan pour le développement
      // En production, utiliser le vrai scanner Capacitor
      console.log('Scanner activé en mode développement');
      setIsCameraMode(true);
      
      // Simuler un délai de scan
      setTimeout(() => {
        setIsCameraMode(false);
        // onScan('TEST-SKU-001'); // Décommentez pour tester
      }, 2000);
    } catch (error) {
      console.error('Erreur lors du scan:', error);
      setIsCameraMode(false);
    }
  };

  if (isCameraMode) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <Camera className="w-12 h-12 mx-auto text-primary" />
            <p className="text-lg font-medium">Scanner un code-barres</p>
            <p className="text-sm text-muted-foreground">
              Pointez votre caméra vers le code-barres de l'article
            </p>
            <Button 
              variant="outline" 
              onClick={() => setIsCameraMode(false)}
              className="w-full"
            >
              Annuler le scan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scan className="w-5 h-5" />
          Scanner un article
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInputSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scanInput">Référence de l'article</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="scanInput"
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={disabled}
                  className="w-full"
                  autoComplete="off"
                  autoFocus
                />
                {filteredItems.length > 0 && (
                  <Card className="absolute z-50 top-full left-0 right-0 mt-1 max-h-60 overflow-auto">
                    <div className="p-1">
                      {filteredItems.map((item: any) => (
                        <Button
                          key={item.id}
                          type="button"
                          variant="ghost"
                          className="w-full justify-start p-2 h-auto"
                          onClick={() => handleSelect(item)}
                        >
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-medium">{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.reference}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
              {isNative && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCameraScan}
                  disabled={disabled}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={!inputValue.trim() || disabled}
              className="flex-1 sm:flex-none sm:min-w-32"
            >
              <Scan className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
            
            {!isNative && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCameraMode(true)}
                disabled={disabled}
                className="flex-1 sm:flex-none"
              >
                <Camera className="w-4 h-4 mr-2" />
                Caméra
              </Button>
            )}
          </div>
        </form>
        
        <div className="mt-4 text-xs text-muted-foreground">
          <p>💡 Astuce: Utilisez un lecteur de code-barres USB ou Bluetooth pour scanner rapidement</p>
        </div>
      </CardContent>
    </Card>
  );
}