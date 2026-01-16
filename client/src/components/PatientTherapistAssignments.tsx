import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface PatientTherapistAssignmentsProps {
  patientId: number;
  patientName: string;
}

const THERAPY_TYPES = [
  { value: "fonoaudiologia", label: "Fonoaudiologia" },
  { value: "psicologia", label: "Psicologia" },
  { value: "terapia_ocupacional", label: "Terapia Ocupacional" },
  { value: "psicopedagogia", label: "Psicopedagogia" },
  { value: "musicoterapia", label: "Musicoterapia" },
  { value: "fisioterapia", label: "Fisioterapia" },
  { value: "neuropsicopedagogia", label: "Neuropsicopedagogia" },
  { value: "nutricao", label: "Nutrição" },
  { value: "outro", label: "Outro" },
];

export function PatientTherapistAssignments({ patientId, patientName }: PatientTherapistAssignmentsProps) {
  const [selectedTherapist, setSelectedTherapist] = useState<number>();
  const [selectedTherapy, setSelectedTherapy] = useState<string>();

  const utils = trpc.useUtils();
  
  // Queries
  const { data: assignments = [], isLoading: loadingAssignments } = trpc.patients.getAssignments.useQuery({ patientId });
  const { data: therapists = [], isLoading: loadingTherapists } = trpc.admin.listUsers.useQuery();

  // Mutations
  const createAssignment = trpc.patients.createAssignment.useMutation({
    onSuccess: async () => {
      await utils.patients.getAssignments.invalidate({ patientId });
      toast.success("Vinculação criada com sucesso!");
      setSelectedTherapist(undefined);
      setSelectedTherapy(undefined);
    },
    onError: (error) => {
      toast.error(`Erro ao criar vinculação: ${error.message}`);
    },
  });

  const deleteAssignment = trpc.patients.deleteAssignment.useMutation({
    onSuccess: async () => {
      await utils.patients.getAssignments.invalidate({ patientId });
      toast.success("Vinculação removida com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao remover vinculação: ${error.message}`);
    },
  });

  const therapistsList = therapists.filter(u => u.role === 'therapist' || u.role === 'admin');

  const handleCreateAssignment = () => {
    if (!selectedTherapist || !selectedTherapy) {
      toast.error("Selecione um terapeuta e uma terapia");
      return;
    }

    createAssignment.mutate({
      patientId,
      therapistUserId: selectedTherapist,
      therapyType: selectedTherapy as any,
    });
  };

  const handleDeleteAssignment = (assignmentId: number) => {
    if (confirm("Tem certeza que deseja remover esta vinculação?")) {
      deleteAssignment.mutate({ id: assignmentId });
    }
  };

  const getTherapyLabel = (value: string) => {
    return THERAPY_TYPES.find(t => t.value === value)?.label || value;
  };

  const getTherapistName = (therapistUserId: number) => {
    return therapistsList.find(t => t.id === therapistUserId)?.name || "Terapeuta não encontrado";
  };

  if (loadingAssignments || loadingTherapists) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Terapias e Terapeutas de {patientName}</h3>
      
      {/* Lista de vinculações existentes */}
      <div className="space-y-3 mb-6">
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma terapia vinculada ainda.</p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{getTherapyLabel(assignment.therapyType)}</p>
                <p className="text-sm text-muted-foreground">{getTherapistName(assignment.therapistUserId)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteAssignment(assignment.id)}
                disabled={deleteAssignment.isPending}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Formulário para adicionar nova vinculação */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium text-sm">Adicionar Nova Terapia</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Terapia</label>
            <Select value={selectedTherapy} onValueChange={setSelectedTherapy}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a terapia" />
              </SelectTrigger>
              <SelectContent>
                {THERAPY_TYPES.map((therapy) => (
                  <SelectItem key={therapy.value} value={therapy.value}>
                    {therapy.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Terapeuta</label>
            <Select value={selectedTherapist?.toString()} onValueChange={(v) => setSelectedTherapist(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o terapeuta" />
              </SelectTrigger>
              <SelectContent>
                {therapistsList.map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id.toString()}>
                    {therapist.name} ({therapist.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleCreateAssignment}
          disabled={createAssignment.isPending || !selectedTherapist || !selectedTherapy}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Vinculação
        </Button>
      </div>
    </Card>
  );
}
