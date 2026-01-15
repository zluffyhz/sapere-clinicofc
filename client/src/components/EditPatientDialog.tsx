import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface EditPatientDialogProps {
  patient: {
    id: number;
    name: string;
    dateOfBirth?: Date | null;
    familyUserId: number;
    diagnosis?: string | null;
    notes?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPatientDialog({ patient, open, onOpenChange, onSuccess }: EditPatientDialogProps) {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [familyUserId, setFamilyUserId] = useState<number | undefined>();
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const utils = trpc.useUtils();
  const { data: allUsers } = trpc.admin.listUsers.useQuery();
  const familyUsers = allUsers?.filter(u => u.role === "family");

  const updateMutation = trpc.patients.update.useMutation({
    onSuccess: () => {
      toast.success("Paciente atualizado com sucesso!");
      utils.patients.list.invalidate();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar paciente: ${error.message}`);
    },
  });

  const deleteMutation = trpc.patients.delete.useMutation({
    onSuccess: () => {
      toast.success("Paciente excluído com sucesso!");
      utils.patients.list.invalidate();
      onSuccess();
      onOpenChange(false);
      setShowDeleteConfirm(false);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir paciente: ${error.message}`);
    },
  });

  // Populate form when patient changes
  useEffect(() => {
    if (patient) {
      setName(patient.name);
      setDateOfBirth(patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : "");
      setFamilyUserId(patient.familyUserId);
      setDiagnosis(patient.diagnosis || "");
      setNotes(patient.notes || "");
    }
  }, [patient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;

    updateMutation.mutate({
      id: patient.id,
      name,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      familyUserId,
      diagnosis: diagnosis || undefined,
      notes: notes || undefined,
    });
  };

  const handleDelete = () => {
    if (!patient) return;
    deleteMutation.mutate({ id: patient.id });
  };

  if (!patient) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
            <DialogDescription>
              Atualize as informações do paciente. Todos os campos são opcionais exceto o nome.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do paciente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Data de Nascimento</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="familyUser">Responsável (Usuário Família)</Label>
              <Select
                value={familyUserId?.toString()}
                onValueChange={(value) => setFamilyUserId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {familyUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email}) - ID: {user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnóstico</Label>
              <Input
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="Ex: TEA, TDAH, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais sobre o paciente"
                rows={3}
              />
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={updateMutation.isPending || deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Paciente
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={updateMutation.isPending || deleteMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending || deleteMutation.isPending}
                >
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o paciente <strong>{patient.name}</strong>?
              Esta ação não pode ser desfeita e todos os dados relacionados (agendamentos, evoluções, documentos) serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
