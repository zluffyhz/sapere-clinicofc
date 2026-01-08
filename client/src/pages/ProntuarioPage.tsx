import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Save, Plus, Calendar, Upload } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProntuarioPage() {
  const [, params] = useRoute("/prontuarios/:id");
  const patientId = params?.id ? parseInt(params.id) : null;

  const [patientData, setPatientData] = useState({
    mainComplaints: "",
    allergies: "",
    currentMedications: "",
    therapyGoals: "",
    additionalNotes: "",
  });

  const [sessionRecordData, setSessionRecordData] = useState({
    appointmentId: 0,
    sessionDate: new Date().toISOString().split("T")[0],
    sessionSummary: "",
    patientMood: "" as any,
    activitiesPerformed: "",
    progressNotes: "",
    nextSessionGoals: "",
  });

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    documentType: "outros" as any,
    file: null as File | null,
  });

  const utils = trpc.useUtils();
  const { data: patient, isLoading: patientLoading } = trpc.patients.getById.useQuery(
    { id: patientId! },
    { enabled: !!patientId }
  );

  const { data: anamnesis, isLoading: anamnesisLoading } = trpc.anamnesis.getByPatient.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId }
  );

  const { data: sessionRecords, isLoading: sessionRecordsLoading } =
    trpc.sessionRecords.listByPatient.useQuery(
      { patientId: patientId! },
      { enabled: !!patientId }
    );

  const { data: documents, isLoading: documentsLoading } = trpc.documents.listByPatient.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId }
  );

  const { data: appointments } = trpc.appointments.listByPatient.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId }
  );

  const createAnamnesisMutation = trpc.anamnesis.create.useMutation({
    onSuccess: () => {
      utils.anamnesis.getByPatient.invalidate({ patientId: patientId! });
      toast.success("Dados do paciente salvos com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar dados: " + error.message);
    },
  });

  const updateAnamnesisMutation = trpc.anamnesis.update.useMutation({
    onSuccess: () => {
      utils.anamnesis.getByPatient.invalidate({ patientId: patientId! });
      toast.success("Dados do paciente atualizados com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar dados: " + error.message);
    },
  });

  const createSessionRecordMutation = trpc.sessionRecords.create.useMutation({
    onSuccess: () => {
      utils.sessionRecords.listByPatient.invalidate({ patientId: patientId! });
      toast.success("Registro de sessão salvo com sucesso!");
      setSessionRecordData({
        appointmentId: 0,
        sessionDate: new Date().toISOString().split("T")[0],
        sessionSummary: "",
        patientMood: "",
        activitiesPerformed: "",
        progressNotes: "",
        nextSessionGoals: "",
      });
    },
    onError: (error) => {
      toast.error("Erro ao salvar registro: " + error.message);
    },
  });

  const uploadDocumentMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.listByPatient.invalidate({ patientId: patientId! });
      toast.success("Documento enviado com sucesso!");
      setUploadDialogOpen(false);
      setUploadData({
        title: "",
        description: "",
        documentType: "outros",
        file: null,
      });
    },
    onError: (error) => {
      toast.error("Erro ao enviar documento: " + error.message);
    },
  });

  // Load existing anamnesis data
  useState(() => {
    if (anamnesis) {
      setPatientData({
        mainComplaints: anamnesis.mainComplaints || "",
        allergies: anamnesis.allergies || "",
        currentMedications: anamnesis.currentMedications || "",
        therapyGoals: anamnesis.therapyGoals || "",
        additionalNotes: anamnesis.additionalNotes || "",
      });
    }
  });

  const handleSavePatientData = () => {
    if (!patientId) return;

    if (anamnesis) {
      updateAnamnesisMutation.mutate({
        patientId,
        ...patientData,
      });
    } else {
      createAnamnesisMutation.mutate({
        patientId,
        ...patientData,
      });
    }
  };

  const handleSaveSessionRecord = () => {
    if (!patientId || !sessionRecordData.appointmentId) {
      toast.error("Selecione uma sessão");
      return;
    }

    createSessionRecordMutation.mutate({
      ...sessionRecordData,
      patientId,
      sessionDate: new Date(sessionRecordData.sessionDate),
    });
  };

  const handleFileUpload = async () => {
    if (!patientId || !uploadData.file) {
      toast.error("Selecione um arquivo");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      uploadDocumentMutation.mutate({
        patientId,
        title: uploadData.title,
        description: uploadData.description,
        documentType: uploadData.documentType,
        fileData: base64,
        fileName: uploadData.file!.name,
        mimeType: uploadData.file!.type,
      });
    };
    reader.readAsDataURL(uploadData.file);
  };

  if (patientLoading) {
    return <div className="container py-8">Carregando...</div>;
  }

  if (!patient) {
    return <div className="container py-8">Paciente não encontrado</div>;
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Prontuário</h1>
        <p className="text-gray-600">
          Paciente: <span className="font-semibold">{patient.name}</span>
        </p>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dados">Dados do Paciente</TabsTrigger>
          <TabsTrigger value="sessoes">Registros de Sessões</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        {/* Dados do Paciente */}
        <TabsContent value="dados">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Paciente</CardTitle>
              <CardDescription>
                Informações básicas sobre o paciente. Anamneses completas devem ser enviadas como documentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mainComplaints">Queixas Principais</Label>
                <Textarea
                  id="mainComplaints"
                  value={patientData.mainComplaints}
                  onChange={(e) =>
                    setPatientData({ ...patientData, mainComplaints: e.target.value })
                  }
                  placeholder="Descreva as queixas principais do paciente..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies">Alergias</Label>
                <Textarea
                  id="allergies"
                  value={patientData.allergies}
                  onChange={(e) => setPatientData({ ...patientData, allergies: e.target.value })}
                  placeholder="Liste as alergias conhecidas..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentMedications">Medicação Atual</Label>
                <Textarea
                  id="currentMedications"
                  value={patientData.currentMedications}
                  onChange={(e) =>
                    setPatientData({ ...patientData, currentMedications: e.target.value })
                  }
                  placeholder="Liste os medicamentos em uso..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="therapyGoals">Objetivos Terapêuticos</Label>
                <Textarea
                  id="therapyGoals"
                  value={patientData.therapyGoals}
                  onChange={(e) =>
                    setPatientData({ ...patientData, therapyGoals: e.target.value })
                  }
                  placeholder="Defina os objetivos do tratamento..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Observações Adicionais</Label>
                <Textarea
                  id="additionalNotes"
                  value={patientData.additionalNotes}
                  onChange={(e) =>
                    setPatientData({ ...patientData, additionalNotes: e.target.value })
                  }
                  placeholder="Outras informações relevantes..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSavePatientData}
                disabled={createAnamnesisMutation.isPending || updateAnamnesisMutation.isPending}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {anamnesis ? "Atualizar Dados" : "Salvar Dados"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registros de Sessões */}
        <TabsContent value="sessoes">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Novo Registro de Sessão</CardTitle>
                <CardDescription>Registre o resumo de uma sessão realizada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment">Sessão</Label>
                  <Select
                    value={sessionRecordData.appointmentId.toString()}
                    onValueChange={(value) =>
                      setSessionRecordData({ ...sessionRecordData, appointmentId: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a sessão" />
                    </SelectTrigger>
                    <SelectContent>
                      {appointments?.map((apt) => (
                        <SelectItem key={apt.id} value={apt.id.toString()}>
                          {format(new Date(apt.startTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionDate">Data da Sessão</Label>
                  <Input
                    id="sessionDate"
                    type="date"
                    value={sessionRecordData.sessionDate}
                    onChange={(e) =>
                      setSessionRecordData({ ...sessionRecordData, sessionDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patientMood">Humor do Paciente</Label>
                  <Select
                    value={sessionRecordData.patientMood}
                    onValueChange={(value) =>
                      setSessionRecordData({ ...sessionRecordData, patientMood: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o humor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="happy">Feliz</SelectItem>
                      <SelectItem value="calm">Calmo</SelectItem>
                      <SelectItem value="anxious">Ansioso</SelectItem>
                      <SelectItem value="irritated">Irritado</SelectItem>
                      <SelectItem value="sad">Triste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionSummary">Resumo da Sessão</Label>
                  <Textarea
                    id="sessionSummary"
                    value={sessionRecordData.sessionSummary}
                    onChange={(e) =>
                      setSessionRecordData({ ...sessionRecordData, sessionSummary: e.target.value })
                    }
                    placeholder="Descreva o que foi trabalhado na sessão..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activitiesPerformed">Atividades Realizadas</Label>
                  <Textarea
                    id="activitiesPerformed"
                    value={sessionRecordData.activitiesPerformed}
                    onChange={(e) =>
                      setSessionRecordData({
                        ...sessionRecordData,
                        activitiesPerformed: e.target.value,
                      })
                    }
                    placeholder="Liste as atividades realizadas..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="progressNotes">Notas de Progresso</Label>
                  <Textarea
                    id="progressNotes"
                    value={sessionRecordData.progressNotes}
                    onChange={(e) =>
                      setSessionRecordData({ ...sessionRecordData, progressNotes: e.target.value })
                    }
                    placeholder="Observações sobre o progresso do paciente..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextSessionGoals">Objetivos para Próxima Sessão</Label>
                  <Textarea
                    id="nextSessionGoals"
                    value={sessionRecordData.nextSessionGoals}
                    onChange={(e) =>
                      setSessionRecordData({
                        ...sessionRecordData,
                        nextSessionGoals: e.target.value,
                      })
                    }
                    placeholder="Defina os objetivos para a próxima sessão..."
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handleSaveSessionRecord}
                  disabled={createSessionRecordMutation.isPending}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Registro
                </Button>
              </CardContent>
            </Card>

            {/* Lista de registros anteriores */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Registros Anteriores</h3>
              {sessionRecordsLoading ? (
                <p className="text-gray-500">Carregando registros...</p>
              ) : sessionRecords && sessionRecords.length > 0 ? (
                sessionRecords.map((record) => (
                  <Card key={record.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {format(new Date(record.sessionDate), "dd/MM/yyyy", { locale: ptBR })}
                      </CardTitle>
                      <CardDescription>
                        Humor: {record.patientMood || "Não informado"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {record.sessionSummary}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-gray-500">Nenhum registro de sessão encontrado</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Documentos</CardTitle>
                    <CardDescription>
                      Anamneses, laudos, relatórios e outros documentos
                    </CardDescription>
                  </div>
                  <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="w-4 h-4 mr-2" />
                        Enviar Documento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Enviar Documento</DialogTitle>
                        <DialogDescription>
                          Faça upload de um documento para o prontuário do paciente
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Título</Label>
                          <Input
                            id="title"
                            value={uploadData.title}
                            onChange={(e) =>
                              setUploadData({ ...uploadData, title: e.target.value })
                            }
                            placeholder="Ex: Anamnese Inicial"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="documentType">Tipo de Documento</Label>
                          <Select
                            value={uploadData.documentType}
                            onValueChange={(value) =>
                              setUploadData({ ...uploadData, documentType: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="anamnese">Anamnese</SelectItem>
                              <SelectItem value="relatorio_evolucao">Relatório de Evolução</SelectItem>
                              <SelectItem value="laudo">Laudo</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Descrição</Label>
                          <Textarea
                            id="description"
                            value={uploadData.description}
                            onChange={(e) =>
                              setUploadData({ ...uploadData, description: e.target.value })
                            }
                            placeholder="Descrição opcional do documento..."
                            rows={2}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="file">Arquivo</Label>
                          <Input
                            id="file"
                            type="file"
                            onChange={(e) =>
                              setUploadData({
                                ...uploadData,
                                file: e.target.files?.[0] || null,
                              })
                            }
                          />
                        </div>

                        <Button
                          onClick={handleFileUpload}
                          disabled={uploadDocumentMutation.isPending}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadDocumentMutation.isPending ? "Enviando..." : "Enviar"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {documentsLoading ? (
                  <p className="text-gray-500">Carregando documentos...</p>
                ) : documents && documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-sm text-gray-500">
                              {format(new Date(doc.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, "_blank")}
                        >
                          Abrir
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Nenhum documento enviado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
