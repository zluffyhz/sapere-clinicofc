import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database, Trash2, AlertTriangle, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function AdminDataManagementPage() {
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const { data: patients, refetch: refetchPatients } = trpc.patients.listAll.useQuery();
  const deletePatientsMutation = trpc.patients.bulkDelete.useMutation();

  const handleSelectPatient = (patientId: number, checked: boolean) => {
    if (checked) {
      setSelectedPatientIds([...selectedPatientIds, patientId]);
    } else {
      setSelectedPatientIds(selectedPatientIds.filter(id => id !== patientId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && patients) {
      setSelectedPatientIds(patients.map((p: any) => p.id));
    } else {
      setSelectedPatientIds([]);
    }
  };

  const selectedPatients = patients?.filter((p: any) => selectedPatientIds.includes(p.id)) || [];

  const handleDeleteConfirm = async () => {
    if (confirmationText !== "CONFIRMAR") {
      toast.error("Digite 'CONFIRMAR' para prosseguir com a remoção");
      return;
    }

    if (selectedPatientIds.length === 0) {
      toast.error("Nenhum paciente selecionado");
      return;
    }

    try {
      await deletePatientsMutation.mutateAsync({ patientIds: selectedPatientIds });
      toast.success(`${selectedPatientIds.length} paciente(s) removido(s) com sucesso`);
      setSelectedPatientIds([]);
      setConfirmationText("");
      setIsDeleteDialogOpen(false);
      setShowPreview(false);
      refetchPatients();
    } catch (error: any) {
      toast.error(`Erro ao remover pacientes: ${error.message}`);
    }
  };

  const handleShowPreview = () => {
    if (selectedPatientIds.length === 0) {
      toast.error("Selecione pelo menos um paciente");
      return;
    }
    setShowPreview(true);
  };

  const handleProceedToDelete = () => {
    setShowPreview(false);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de Dados</h1>
        <p className="text-muted-foreground">
          Ferramentas administrativas para gerenciar dados do sistema com segurança
        </p>
      </div>

      {/* Alerta de Segurança */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Atenção:</strong> As operações nesta página são irreversíveis. 
          Certifique-se de fazer backup antes de remover dados importantes.
        </AlertDescription>
      </Alert>

      {/* Card de Remoção Segura de Pacientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Remoção Segura de Pacientes
          </CardTitle>
          <CardDescription>
            Selecione pacientes para remoção. Todos os dados relacionados (agendamentos, evoluções, documentos) serão removidos permanentemente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estatísticas */}
          <div className="flex gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total de Pacientes</p>
              <p className="text-2xl font-bold">{patients?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Selecionados</p>
              <p className="text-2xl font-bold text-destructive">{selectedPatientIds.length}</p>
            </div>
          </div>

          {/* Tabela de Pacientes */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedPatientIds.length === patients?.length && patients?.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data de Nascimento</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients && patients.length > 0 ? (
                  patients.map((patient: any) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPatientIds.includes(patient.id)}
                          onCheckedChange={(checked) => handleSelectPatient(patient.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>
                        {patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </TableCell>
                      <TableCell>{patient.diagnosis || "-"}</TableCell>
                      <TableCell>
                        {patient.createdAt ? format(new Date(patient.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum paciente cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleShowPreview}
              disabled={selectedPatientIds.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remover Selecionados ({selectedPatientIds.length})
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedPatientIds([])}
              disabled={selectedPatientIds.length === 0}
            >
              Limpar Seleção
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Prévia */}
      <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Prévia de Remoção
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os seguintes pacientes e TODOS os seus dados relacionados serão removidos permanentemente:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {selectedPatients.map((patient: any) => (
                <div key={patient.id} className="p-3 border rounded-lg">
                  <p className="font-medium">{patient.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {patient.dateOfBirth ? format(new Date(patient.dateOfBirth), "dd/MM/yyyy", { locale: ptBR }) : "-"} • {patient.diagnosis}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Dados que serão removidos:</strong>
              <ul className="list-disc list-inside mt-2">
                <li>Informações do paciente</li>
                <li>Todos os agendamentos</li>
                <li>Registros de presença</li>
                <li>Evoluções clínicas</li>
                <li>Documentos anexados</li>
                <li>Vinculações com terapeutas</li>
              </ul>
            </AlertDescription>
          </Alert>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={handleProceedToDelete}>
              Prosseguir com Remoção
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação Final */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmação Final
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>IRREVERSÍVEL</strong>. {selectedPatientIds.length} paciente(s) e todos os seus dados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                Digite <code className="px-2 py-1 bg-muted rounded">CONFIRMAR</code> para prosseguir:
              </p>
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Digite CONFIRMAR"
                className="font-mono"
              />
            </div>

            {confirmationText && confirmationText !== "CONFIRMAR" && (
              <Alert variant="destructive">
                <AlertDescription>
                  Texto incorreto. Digite exatamente "CONFIRMAR" (em maiúsculas).
                </AlertDescription>
              </Alert>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationText("")}>
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={confirmationText !== "CONFIRMAR" || deletePatientsMutation.isPending}
            >
              {deletePatientsMutation.isPending ? "Removendo..." : "Confirmar Remoção"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Card de Backup (placeholder para próxima fase) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup do Banco de Dados
          </CardTitle>
          <CardDescription>
            Sistema de backup automático e manual do banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <Download className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">Backup Automático Configurado</p>
              <p className="text-sm text-muted-foreground">
                Backups diários às 03:00 • Retenção de 7 dias
              </p>
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Backup Manual
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
