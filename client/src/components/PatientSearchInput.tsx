import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PatientSearchInputProps {
  value: number; // selected patient ID (0 = none)
  onChange: (id: number, name: string) => void;
  patients: { id: number; name: string }[];
  placeholder?: string;
  disabled?: boolean;
  /** Label acessível para screen readers */
  ariaLabel?: string;
}

/**
 * PatientSearchInput — Combobox de busca de paciente baseado em Popover + Command do shadcn/ui.
 *
 * Otimizações:
 * - Memoiza a lista de pacientes para evitar recálculos desnecessários
 * - Usa o padrão oficial shadcn Combobox para estabilidade de foco
 * - Acessibilidade completa com aria-labels e keyboard navigation
 * - Visual refinado com ícones contextuais e estados claros
 *
 * IMPORTANTE: Este componente deve ser definido FORA de qualquer componente pai
 * para evitar recriação a cada render.
 */
export function PatientSearchInput({
  value,
  onChange,
  patients,
  placeholder = "Selecionar paciente...",
  disabled = false,
  ariaLabel = "Selecionar paciente",
}: PatientSearchInputProps) {
  const [open, setOpen] = useState(false);

  // Memoiza a busca do paciente selecionado
  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === value),
    [patients, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-9 font-normal bg-background transition-colors",
            !selectedPatient && "text-muted-foreground",
            open && "ring-2 ring-orange-500/20 border-orange-300"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedPatient ? (
              <User className="h-3.5 w-3.5 shrink-0 text-orange-500" />
            ) : (
              <Search className="h-3.5 w-3.5 shrink-0 opacity-50" />
            )}
            <span className="truncate">
              {selectedPatient ? selectedPatient.name : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder="Buscar pelo nome..."
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-1 py-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Nenhum paciente encontrado</span>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {patients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.name}
                  onSelect={() => {
                    // Toggle: se clicar no mesmo, deseleciona
                    if (value === patient.id) {
                      onChange(0, "");
                    } else {
                      onChange(patient.id, patient.name);
                    }
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 transition-opacity",
                      value === patient.id ? "opacity-100 text-orange-500" : "opacity-0"
                    )}
                  />
                  <span className={cn(
                    "truncate",
                    value === patient.id && "font-medium text-orange-700"
                  )}>
                    {patient.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
