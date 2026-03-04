import { useEffect, useState, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { SessionTimer } from "@/components/SessionTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, User, Search, ChevronDown, X } from "lucide-react";

export default function SessionPage() {
  const [, params] = useRoute("/session/:patientId");
  const [, setLocation] = useLocation();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    params?.patientId ? parseInt(params.patientId) : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: patients, isLoading } = trpc.patients.list.useQuery();

  const selectedPatient = patients?.find((p: any) => p.id === selectedPatientId);

  // Filtrar pacientes pelo nome
  const filteredPatients = patients?.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  useEffect(() => {
    if (params?.patientId) {
      setSelectedPatientId(parseInt(params.patientId));
    }
  }, [params]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPatient = (patientId: number, patientName: string) => {
    setSelectedPatientId(patientId);
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleClearSelection = () => {
    setSelectedPatientId(null);
    setSearchQuery("");
  };

  const handleSessionEnd = (durationMinutes: number, startTime: Date) => {
    if (selectedPatientId) {
      sessionStorage.setItem('sessionData', JSON.stringify({
        durationMinutes,
        startTime: startTime.toISOString(),
        patientId: selectedPatientId,
      }));
      setLocation(`/prontuarios/${selectedPatientId}?tab=evolucoes&newEvolution=true`);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          Carregando pacientes...
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation("/")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Dashboard
      </Button>

      {!selectedPatientId ? (
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Nova Sessão</CardTitle>
            <CardDescription>
              Selecione um paciente para iniciar o timer de sessão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Paciente</label>

                {/* Custom dropdown sem Radix UI para evitar bug removeChild no mobile */}
                <div className="relative" ref={dropdownRef}>
                  {/* Trigger */}
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onClick={() => {
                      setIsDropdownOpen(!isDropdownOpen);
                      if (!isDropdownOpen) {
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }
                    }}
                  >
                    <span className={selectedPatient ? "text-foreground" : "text-muted-foreground"}>
                      {selectedPatient ? selectedPatient.name : "Selecione um paciente"}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown panel */}
                  {isDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
                      {/* Search input */}
                      <div className="flex items-center border-b border-border px-3 py-2 gap-2">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          ref={inputRef}
                          type="text"
                          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          placeholder="Buscar paciente..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery("")}>
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>

                      {/* Patient list */}
                      <div className="max-h-64 overflow-y-auto py-1">
                        {filteredPatients.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                            Nenhum paciente encontrado
                          </div>
                        ) : (
                          filteredPatients.map((patient: any) => (
                            <button
                              key={patient.id}
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-left transition-colors"
                              onClick={() => handleSelectPatient(patient.id, patient.name)}
                            >
                              <User className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span>{patient.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedPatientId && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setLocation(`/session/${selectedPatientId}`)}
                    className="flex-1"
                  >
                    Continuar
                  </Button>
                  <Button variant="outline" onClick={handleClearSelection}>
                    Limpar
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : selectedPatient ? (
        <SessionTimer
          patientId={selectedPatient.id}
          patientName={selectedPatient.name}
          onSessionEnd={handleSessionEnd}
        />
      ) : (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Paciente não encontrado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
