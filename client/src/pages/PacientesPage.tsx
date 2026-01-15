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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Search, Calendar, FileText, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EditPatientDialog } from "@/components/EditPatientDialog";

export default function PacientesPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [therapyTypeFilter, setTherapyTypeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState<{
    name: string;
    dateOfBirth: string;
    familyUserId: number | undefined;
    diagnosis: string;
    notes: string;
  }>({
    name: "",
    dateOfBirth: "",
    familyUserId: undefined,
    diagnosis: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  const { data: patients, isLoading } = trpc.patients.list.useQuery();
  const { data: familyUsers } = trpc.admin.listUsers.useQuery();
  
  // Get appointments for the last year to determine therapy types
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  const { data: appointments } = trpc.appointments.listByDateRange.useQuery({
    startDate,
    endDate,
  });

  const createPatientMutation = trpc.patients.create.useMutation({
    onSuccess: () => {
      utils.patients.list.invalidate();
      setIsDialogOpen(false);
      setNewPatient({
        name: "",
        dateOfBirth: "",
        familyUserId: undefined,
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

  // Get therapy types for each patient
  const getPatientTherapyTypes = (patientId: number): string[] => {
    if (!appointments) return [];
    const patientAppointments = appointments.filter((apt: any) => apt.patientId === patientId);
    const types = new Set<string>(patientAppointments.map((apt: any) => apt.therapyType as string));
    return Array.from(types);
  };

  // Filter patients by search term and therapy type
  const filteredPatients = patients?.filter((patient) => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (therapyTypeFilter === "all") {
      return matchesSearch;
    }
    
    const patientTherapyTypes = getPatientTherapyTypes(patient.id);
    const matchesTherapy = patientTherapyTypes.includes(therapyTypeFilter);
    
    return matchesSearch && matchesTherapy;
  });

  const isTherapist = user?.role === "therapist" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const hasActiveFilters = searchTerm !== "" || therapyTypeFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setTherapyTypeFilter("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os pacientes sob seus cuidados
          </p>
        </div>
        {isAdmin && (
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
                  <Label htmlFor="familyUserId">Responsável (Família) *</Label>
                  <Select
                    value={newPatient.familyUserId?.toString() || ""}
                    onValueChange={(value) =>
                      setNewPatient({
                        ...newPatient,
                        familyUserId: value ? parseInt(value) : undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {familyUsers
                        ?.filter((u) => u.role === "family")
                        .map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.email}) - ID: {user.id}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Selecione o usuário responsável pelo paciente
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Therapy Type Filter */}
            <div className="w-full md:w-64">
              <Select value={therapyTypeFilter} onValueChange={setTherapyTypeFilter}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Tipo de terapia" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as terapias</SelectItem>
                  <SelectItem value="fonoaudiologia">Fonoaudiologia</SelectItem>
                  <SelectItem value="psicologia">Psicologia</SelectItem>
                  <SelectItem value="terapia_ocupacional">Terapia Ocupacional</SelectItem>
                  <SelectItem value="psicopedagogia">Psicopedagogia</SelectItem>
                  <SelectItem value="musicoterapia">Musicoterapia</SelectItem>
                  <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                  <SelectItem value="neuropsicopedagogia">Neuropsicopedagogia</SelectItem>
                  <SelectItem value="nutricao">Nutrição</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filtros ativos:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Busca: {searchTerm}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchTerm("")}
                  />
                </Badge>
              )}
              {therapyTypeFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {therapyTypeFilter === "fonoaudiologia" && "Fonoaudiologia"}
                  {therapyTypeFilter === "psicologia" && "Psicologia"}
                  {therapyTypeFilter === "terapia_ocupacional" && "Terapia Ocupacional"}
                  {therapyTypeFilter === "psicopedagogia" && "Psicopedagogia"}
                  {therapyTypeFilter === "musicoterapia" && "Musicoterapia"}
                  {therapyTypeFilter === "fisioterapia" && "Fisioterapia"}
                  {therapyTypeFilter === "neuropsicopedagogia" && "Neuropsicopedagogia"}
                  {therapyTypeFilter === "nutricao" && "Nutrição"}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setTherapyTypeFilter("all")}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs"
              >
                Limpar filtros
              </Button>
            </div>
          )}
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
                {hasActiveFilters
                  ? "Nenhum paciente encontrado com os filtros aplicados"
                  : "Nenhum paciente cadastrado"}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-4"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPatients.map((patient) => {
                const therapyTypes = getPatientTherapyTypes(patient.id);
                
                return (
                  <div
                    key={patient.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 
                            className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors"
                            onClick={() => {
                              setEditingPatient(patient);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            {patient.name}
                          </h3>
                          {therapyTypes.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {therapyTypes.map((type) => (
                                <Badge key={type} variant="outline" className="text-xs">
                                  {type === "fonoaudiologia" && "Fono"}
                                  {type === "psicologia" && "Psico"}
                                  {type === "terapia_ocupacional" && "TO"}
                                  {type === "psicopedagogia" && "Psicopedagogia"}
                                  {type === "neuropsicologia" && "Neuropsi"}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EditPatientDialog
        patient={editingPatient}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          utils.patients.list.invalidate();
        }}
      />
    </div>
  );
}
