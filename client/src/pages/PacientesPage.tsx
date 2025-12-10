import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Plus, Search, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { toast } from "sonner";

export default function PacientesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    dateOfBirth: "",
    familyUserId: 0,
    diagnosis: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: patients, isLoading } = trpc.patients.list.useQuery();

  const createPatientMutation = trpc.patients.create.useMutation({
    onSuccess: () => {
      utils.patients.list.invalidate();
      setIsDialogOpen(false);
      setNewPatient({
        name: "",
        dateOfBirth: "",
        familyUserId: 0,
        diagnosis: "",
        notes: "",
      });
      toast.success("Paciente cadastrado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar paciente: ${error.message}`);
    },
  });

  const handleCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPatient.name || !newPatient.familyUserId) {
      toast.error("Nome e ID da família são obrigatórios");
      return;
    }

    createPatientMutation.mutate({
      name: newPatient.name,
      dateOfBirth: newPatient.dateOfBirth ? new Date(newPatient.dateOfBirth) : undefined,
      familyUserId: newPatient.familyUserId,
      diagnosis: newPatient.diagnosis || undefined,
      notes: newPatient.notes || undefined,
    });
  };

  const filteredPatients = patients?.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isTherapist = user?.role === "therapist" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os pacientes sob seus cuidados
          </p>
        </div>
        {isTherapist && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
                <DialogDescription>
                  Preencha as informações do paciente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePatient} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={newPatient.name}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, name: e.target.value })
                    }
                    placeholder="Nome do paciente"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Data de Nascimento</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={newPatient.dateOfBirth}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, dateOfBirth: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="familyUserId">ID do Usuário da Família *</Label>
                  <Input
                    id="familyUserId"
                    type="number"
                    value={newPatient.familyUserId || ""}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        familyUserId: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="ID do responsável"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    ID do usuário responsável pelo paciente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnóstico</Label>
                  <Textarea
                    id="diagnosis"
                    value={newPatient.diagnosis}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, diagnosis: e.target.value })
                    }
                    placeholder="Diagnóstico inicial"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={newPatient.notes}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, notes: e.target.value })
                    }
                    placeholder="Observações gerais"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createPatientMutation.isPending}>
                    {createPatientMutation.isPending ? "Cadastrando..." : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
          <CardDescription>
            {filteredPatients?.length || 0} paciente(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando pacientes...
            </div>
          ) : !filteredPatients || filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Nenhum paciente encontrado com esse nome"
                  : "Nenhum paciente cadastrado"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg">{patient.name}</h3>
                      
                      <div className="grid gap-2 text-sm text-muted-foreground">
                        {patient.dateOfBirth && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Nascimento:{" "}
                              {format(new Date(patient.dateOfBirth), "PP", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        )}
                        
                        {patient.diagnosis && (
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 mt-0.5" />
                            <span>Diagnóstico: {patient.diagnosis}</span>
                          </div>
                        )}
                      </div>

                      {patient.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {patient.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/prontuarios/${patient.id}`}>
                        <Button variant="default" size="sm">
                          Ver Prontuário
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
