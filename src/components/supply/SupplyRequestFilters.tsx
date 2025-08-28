import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface SupplyRequestFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  urgencyFilter: string;
  onUrgencyFilterChange: (value: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

export function SupplyRequestFilters({
  statusFilter,
  onStatusFilterChange,
  urgencyFilter,
  onUrgencyFilterChange,
  searchTerm,
  onSearchTermChange,
}: SupplyRequestFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, numéro ou description..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrer par statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="pending">En attente</SelectItem>
          <SelectItem value="approved">Approuvé</SelectItem>
          <SelectItem value="ordered">Commandé</SelectItem>
          <SelectItem value="shipped">Expédié</SelectItem>
          <SelectItem value="received">Reçu</SelectItem>
          <SelectItem value="completed">Terminé</SelectItem>
          <SelectItem value="rejected">Rejeté</SelectItem>
        </SelectContent>
      </Select>

      <Select value={urgencyFilter} onValueChange={onUrgencyFilterChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrer par urgence" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les urgences</SelectItem>
          <SelectItem value="low">Faible</SelectItem>
          <SelectItem value="normal">Normal</SelectItem>
          <SelectItem value="high">Élevé</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}