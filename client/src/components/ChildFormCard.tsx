import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

export interface TherapistOption {
  id: number;
  name: string;
}

export interface ChildData {
  name: string;
  dateOfBirth: string;
  diagnosis: string;
  imageAuthorization: boolean;
  therapyType?: string;
  therapistUserId?: number;
}

const THERAPY_OPTIONS = [
  { value: "", label: "Selecionar terapia (opcional)" },
  { value: "fonoaudiologia", label: "Fonoaudiologia" },
  { value: "psicologia", label: "Psicologia" },
  { value: "terapia_ocupacional", label: "Terapia Ocupacional" },
  { value: "psicopedagogia", label: "Psicopedagogia" },
  { value: "psicomotricidade", label: "Psicomotricidade" },
  { value: "musicoterapia", label: "Musicoterapia" },
  { value: "fisioterapia", label: "Fisioterapia" },
  { value: "neuropsicopedagogia", label: "Neuropsicopedagogia" },
  { value: "nutricao", label: "Nutrição" },
  { value: "aplicadora_denver_aba", label: "Aplicadora Denver/ABA" },
  { value: "assistente_terapeutico", label: "Assistente Terapêutico" },
  { value: "outro", label: "Outro" },
];

interface ChildFormCardProps {
  index: number;
  child: ChildData;
  canRemove: boolean;
  therapists: TherapistOption[];
  onUpdate: (index: number, field: keyof ChildData, value: string | boolean | number | undefined) => void;
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
  therapists,
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

      {/* Vínculo terapêutico */}
      <div className="border-t border-orange-100 pt-3 space-y-3">
        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
          Vínculo Terapêutico
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Tipo de terapia
            </Label>
            <select
              value={child.therapyType ?? ""}
              onChange={(e) => onUpdate(index, "therapyType", e.target.value || undefined)}
              className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
            >
              {THERAPY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Terapeuta responsável
            </Label>
            <select
              value={child.therapistUserId ?? ""}
              onChange={(e) =>
                onUpdate(index, "therapistUserId", e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
              disabled={therapists.length === 0}
            >
              <option value="">
                {therapists.length === 0 ? "Nenhum terapeuta cadastrado" : "Selecionar terapeuta (opcional)"}
              </option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(child.therapyType || child.therapistUserId) && (
          <p className="text-xs text-muted-foreground bg-orange-50 rounded-md px-3 py-2">
            O vínculo será registrado no prontuário do paciente. Agendamentos podem ser criados depois na aba Agenda.
          </p>
        )}
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
