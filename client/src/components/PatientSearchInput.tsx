import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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
}

/**
 * PatientSearchInput — Combobox de busca de paciente baseado em Popover + Command do shadcn/ui.
 *
 * Usa o padrão oficial shadcn Combobox para evitar problemas de remount.
 * O input é gerenciado internamente pelo cmdk, mantendo foco estável durante digitação.
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
}: PatientSearchInputProps) {
  const [open, setOpen] = useState(false);

  const selectedPatient = patients.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-9 font-normal bg-background",
            !selectedPatient && "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 shrink-0 opacity-50" />
            <span className="truncate">
              {selectedPatient ? selectedPatient.name : placeholder}
            </span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar pelo nome..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
            <CommandGroup>
              {patients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.name}
                  onSelect={() => {
                    onChange(patient.id, patient.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === patient.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {patient.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
