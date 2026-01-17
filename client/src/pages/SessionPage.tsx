import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { SessionTimer } from "@/components/SessionTimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, User } from "lucide-react";

export default function SessionPage() {
  const [, params] = useRoute("/session/:patientId");
  const [, setLocation] = useLocation();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    params?.patientId ? parseInt(params.patientId) : null
  );

  const { data: patients, isLoading } = trpc.patients.list.useQuery();

  const selectedPatient = patients?.find((p: any) => p.id === selectedPatientId);

  useEffect(() => {
    if (params?.patientId) {
      setSelectedPatientId(parseInt(params.patientId));
    }
  }, [params]);

  const handleSessionEnd = (durationMinutes: number, startTime: Date) => {
    // Redirect to prontuario with session data after session ends
    if (selectedPatientId) {
      // Store session data in sessionStorage for the evolution form
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
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation("/inicio")}
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
                <Select
                  value={selectedPatientId?.toString() || ""}
                  onValueChange={(value) => setSelectedPatientId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients?.map((patient: any) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {patient.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPatientId && (
                <Button
                  onClick={() => setLocation(`/session/${selectedPatientId}`)}
                  className="w-full"
                >
                  Continuar
                </Button>
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
