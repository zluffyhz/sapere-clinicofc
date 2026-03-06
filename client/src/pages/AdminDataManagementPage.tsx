import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
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
import { Database, Trash2, AlertTriangle, Download, Loader2, CheckCircle2, Users, Calendar, FileText, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function AdminDataManagementPage() {
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  const { data: patients, refetch: refetchPatients } = trpc.patients.listAll.useQuery();
  const deletePatientsMutation = trpc.patients.bulkDelete.useMutation();
  const backupQuery = trpc.admin.exportBackup.useQuery(undefined, { enabled: false });

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

  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    try {
      const result = await backupQuery.refetch();
      if (!result.data) {
        toast.error("Não foi possível gerar o backup. Tente novamente.");
        return;
      }

      const backupData = result.data;
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const timestamp = format(now, "yyyy-MM-dd_HH-mm", { locale: ptBR });
      const filename = `sapere-backup-${timestamp}.json`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const timeStr = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      setLastBackupTime(timeStr);

      const { summary } = backupData;
      toast.success(
        `Backup gerado com sucesso! ${summary.totalPatients} pacientes, ${summary.totalAppointments} agendamentos, ${summary.totalEvolutions} evoluções exportados.`
      );
    } catch (error: any) {
      toast.error(`Erro ao gerar backup: ${error.message}`);
    } finally {
      setIsDownloadingBackup(false);
    }
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

      {/* Card de Backup FUNCIONAL */}
      <Card className="border-2 border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-orange-600" />
            Backup do Banco de Dados
          </CardTitle>
          <CardDescription>
            Exporte todos os dados do sistema em formato JSON para armazenamento seguro externo.
            O arquivo inclui pacientes, agendamentos, evoluções, anamneses, presenças e documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo do que será exportado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pacientes</p>
                <p className="font-semibold text-sm">{patients?.length ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
              <Calendar className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Agendamentos</p>
                <p className="font-semibold text-sm">Todos</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
              <ClipboardList className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Evoluções</p>
                <p className="font-semibold text-sm">Todas</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
              <FileText className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Documentos</p>
                <p className="font-semibold text-sm">Metadados</p>
              </div>
            </div>
          </div>

          {lastBackupTime && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                Último backup realizado em <strong>{lastBackupTime}</strong>
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-white border rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-sm">Backup Manual Completo</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gera um arquivo <code className="bg-muted px-1 rounded">.json</code> com todos os dados do sistema.
                Recomendado antes de qualquer operação de remoção.
              </p>
            </div>
            <Button
              onClick={handleDownloadBackup}
              disabled={isDownloadingBackup}
              className="bg-orange-500 hover:bg-orange-600 text-white flex-shrink-0"
            >
              {isDownloadingBackup ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Fazer Backup
                </>
              )}
            </Button>
          </div>

          <Alert>
            <AlertDescription className="text-xs text-muted-foreground">
              <strong>Nota:</strong> O arquivo de backup contém dados sensíveis dos pacientes.
              Armazene-o em local seguro e com acesso restrito. Senhas de usuários <strong>não</strong> são incluídas no backup por segurança.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

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
                      checked={selectedPatientIds.length === patients?.length && (patients?.length ?? 0) > 0}
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
              <strong>Dados que serão removidos:</strong> informações do paciente, agendamentos, registros de presença, evoluções clínicas, documentos anexados e vinculações com terapeutas.
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
    </div>
  );
}
