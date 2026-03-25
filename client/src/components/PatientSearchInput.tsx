import { useState, useRef, useCallback, useEffect } from "react";

interface PatientSearchInputProps {
  value: string;
  onChange: (v: string) => void;
  patients: { id: number; name: string }[];
  onSelect: (id: number) => void;
  placeholder?: string;
}

/**
 * PatientSearchInput — campo de busca de paciente com dropdown filtrado.
 *
 * IMPORTANTE: Este componente DEVE ser definido fora de qualquer componente pai.
 * Defini-lo dentro de outro componente (como uma função interna) causa remount
 * a cada renderização, fazendo o input perder o foco após cada tecla digitada.
 */
export function PatientSearchInput({
  value,
  onChange,
  patients,
  onSelect,
  placeholder = "Buscar paciente pelo nome...",
}: PatientSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = patients
    .filter((p) => p.name.toLowerCase().includes(value.toLowerCase()))
    .slice(0, 8);

  const updatePosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (showDropdown) updatePosition();
  }, [showDropdown, value, updatePosition]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(e.target.value.length >= 1);
          updatePosition();
        }}
        onFocus={() => {
          if (value.length >= 1) {
            setShowDropdown(true);
            updatePosition();
          }
        }}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        autoComplete="off"
        className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
      />
      {showDropdown && value.length >= 1 && (
        <div
          style={dropdownStyle}
          className="bg-white border border-purple-200 rounded-lg shadow-xl max-h-48 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Nenhum paciente encontrado</div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-0"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(p.id);
                  setShowDropdown(false);
                }}
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
