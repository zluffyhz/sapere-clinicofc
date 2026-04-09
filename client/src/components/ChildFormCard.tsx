import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

export interface ChildData {
  name: string;
  dateOfBirth: string;
  diagnosis: string;
  imageAuthorization: boolean;
}

interface ChildFormCardProps {
  index: number;
  child: ChildData;
  canRemove: boolean;
  onUpdate: (index: number, field: keyof ChildData, value: string | boolean) => void;
  onRemove: (index: number) => void;
}

/**
 * ChildFormCard — Componente memoizado para formulário individual de cada filho.
 * 
 * Extraído para evitar re-renders desnecessários quando outro filho é editado.
 * Usa React.memo para comparação shallow — só re-renderiza quando suas props mudam.
 */
export const ChildFormCard = memo(function ChildFormCard({
  index,
  child,
  canRemove,
  onUpdate,
  onRemove,
}: ChildFormCardProps) {
  return (
    <div className="border border-orange-200/60 rounded-lg p-4 space-y-3 bg-white shadow-sm transition-all duration-200 hover:shadow-md animate-in fade-in-0 slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-xs font-bold text-orange-600">{index + 1}</span>
          </div>
          <span className="text-sm font-medium text-foreground">
            {child.name.trim() || `Filho ${index + 1}`}
          </span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
            aria-label={`Remover filho ${index + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Nome completo <span className="text-red-400">*</span>
          </Label>
          <Input
            value={child.name}
            onChange={(e) => onUpdate(index, "name", e.target.value)}
            placeholder="Nome completo do paciente"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Data de nascimento
          </Label>
          <Input
            type="date"
            value={child.dateOfBirth}
            onChange={(e) => onUpdate(index, "dateOfBirth", e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Diagnóstico / CID
          </Label>
          <Input
            value={child.diagnosis}
            onChange={(e) => onUpdate(index, "diagnosis", e.target.value)}
            placeholder="Ex: TEA, TDAH, CID F84.0"
            className="h-9 text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={child.imageAuthorization}
          onChange={(e) => onUpdate(index, "imageAuthorization", e.target.checked)}
          className="rounded border-gray-300 text-orange-500 focus:ring-orange-500/20"
        />
        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
          Autoriza uso de imagem
        </span>
      </label>
    </div>
  );
});
