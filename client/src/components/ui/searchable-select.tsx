import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, X } from "lucide-react";

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
}

const SearchableSelect = React.forwardRef<HTMLDivElement, SearchableSelectProps>(
  ({ options, value, onChange, placeholder = "Selecione...", searchPlaceholder = "Buscar...", className, disabled }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find((o) => o.value === value);

    const filtered = options
      .filter((o) => !o.disabled)
      .filter((o) => !search || o.label.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

    // Close on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearch("");
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search when opening
    useEffect(() => {
      if (isOpen && searchRef.current) {
        setTimeout(() => searchRef.current?.focus(), 50);
      }
    }, [isOpen]);

    const handleSelect = (optValue: string) => {
      onChange?.(optValue);
      setIsOpen(false);
      setSearch("");
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.("");
      setSearch("");
    };

    return (
      <div ref={containerRef} className={cn("relative w-full", className)}>
        {/* Trigger button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "cursor-pointer text-left"
          )}
        >
          <span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === "Enter" && handleClear(e as any)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-background shadow-lg">
            {/* Search input */}
            <div className="flex items-center border-b border-input px-3 py-2 gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {search && (
                <button type="button" onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Options list */}
            <div className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                      opt.value === value && "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

SearchableSelect.displayName = "SearchableSelect";

export { SearchableSelect };
