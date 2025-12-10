import { useState, useEffect } from "react";
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

  const [anamnesisData, setAnamnesisData] = useState({
    mainComplaint: "",
    medicalHistory: "",
    familyHistory: "",
    developmentHistory: "",
    currentMedications: "",
    allergies: "",
    previousTherapies: "",
    therapyGoals: "",
    additionalNotes: "",
  });

  const [sessionRecordData, setSessionRecordData] = useState({
    appointmentId: 0,
    sessionDate: new Date().toISOString().split("T")[0],
    sessionSummary: "",
    patientMood: "" as any,
    patientBehavior: "",
    goalsAchieved: "",
    nextSessionPlan: "",
  });

  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [documentData, setDocumentData] = useState({
    title: "",
    description: "",
    documentType: "relatorio_evolucao" as any,
    file: null as File | null,
  });

  const utils = trpc.useUtils();

  const { data: patient } = trpc.patients.getById.useQuery(
    { id: patientId! },
    { enabled: !!patientId }
  );

  const { data: anamnesis } = trpc.anamnesis.getByPatient.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId }
  );

  const { data: sessionRecords } = trpc.sessionRecords.listByPatient.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId }
  );

  const { data: documents } = trpc.documents.listByPatient.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId }
  );

  const { data: appointments } = trpc.appointments.listByPatient.useQuery(
    { patientId: patientId! },
    { enabled: !!patientId }
  );

  // Load anamnesis data when available
  useEffect(() => {
    if (anamnesis) {
      setAnamnesisData({
        mainComplaint: anamnesis.mainComplaint || "",
        medicalHistory: anamnesis.medicalHistory || "",
        familyHistory: anamnesis.familyHistory || "",
        developmentHistory: anamnesis.developmentHistory || "",
        currentMedications: anamnesis.currentMedications || "",
        allergies: anamnesis.allergies || "",
        previousTherapies: anamnesis.previousTherapies || "",
        therapyGoals: anamnesis.therapyGoals || "",
        additionalNotes: anamnesis.additionalNotes || "",
      });
    }
  }, [anamnesis]);

  const createAnamnesisMutation = trpc.anamnesis.create.useMutation({
    onSuccess: () => {
      utils.anamnesis.getByPatient.invalidate({ patientId: patientId! });
      toast.success("Anamnese criada com sucesso");
    },
  });

  const updateAnamnesisMutation = trpc.anamnesis.update.useMutation({
    onSuccess: () => {
      utils.anamnesis.getByPatient.invalidate({ patientId: patientId! });
      toast.success("Anamnese atualizada com sucesso");
    },
  });

  const createSessionRecordMutation = trpc.sessionRecords.create.useMutation({
    onSuccess: () => {
      utils.sessionRecords.listByPatient.invalidate({ patientId: patientId! });
      setIsSessionDialogOpen(false);
      setSessionRecordData({
        appointmentId: 0,
        sessionDate: new Date().toISOString().split("T")[0],
        sessionSummary: "",
        patientMood: "",
        patientBehavior: "",
        goalsAchieved: "",
        nextSessionPlan: "",
      });
      toast.success("Registro de sessão criado com sucesso");
    },
  });

  const uploadDocumentMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.listByPatient.invalidate({ patientId: patientId! });
      setIsDocumentDialogOpen(false);
      setDocumentData({
        title: "",
        description: "",
        documentType: "relatorio_evolucao",
        file: null,
      });
      toast.success("Documento enviado com sucesso");
    },
  });

  const handleSaveAnamnesis = () => {
    if (!patientId) return;

    if (anamnesis) {
      updateAnamnesisMutation.mutate({
        patientId,
        ...anamnesisData,
      });
    } else {
      createAnamnesisMutation.mutate({
        patientId,
        ...anamnesisData,
      });
    }
  };

  const handleCreateSessionRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    createSessionRecordMutation.mutate({
      ...sessionRecordData,
      patientId,
      sessionDate: new Date(sessionRecordData.sessionDate),
      patientMood: sessionRecordData.patientMood || undefined,
    });
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !documentData.file) {
      toast.error("Selecione um arquivo");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result?.toString().split(",")[1];
      if (base64) {
        uploadDocumentMutation.mutate({
          patientId,
          title: documentData.title,
          description: documentData.description,
          documentType: documentData.documentType,
          fileData: base64,
          fileName: documentData.file!.name,
          mimeType: documentData.file!.type,
        });
      }
    };
    reader.readAsDataURL(documentData.file);
  };

  if (!patientId) {
    return <div>Paciente não encontrado</div>;
  }

  const moodLabels: Record<string, string> = {
    muito_bem: "Muito Bem",
    bem: "Bem",
    neutro: "Neutro",
    ansioso: "Ansioso",
    irritado: "Irritado",
    triste: "Triste",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Prontuário - {patient?.name}
        </h1>
        <p className="text-muted-foreground mt-2">
          Anamnese, registros de sessão e documentos
        </p>
      </div>

      <Tabs defaultValue="anamnese" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="anamnese">Anamnese</TabsTrigger>
          <TabsTrigger value="sessoes">Registros de Sessão</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        {/* Anamnese Tab */}
        <TabsContent value="anamnese" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Anamnese</CardTitle>
              <CardDescription>
                Formulário de avaliação inicial do paciente (com autosave)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mainComplaint">Queixa Principal</Label>
                <Textarea
                  id="mainComplaint"
                  value={anamnesisData.mainComplaint}
                  onChange={(e) =>
                    setAnamnesisData({ ...anamnesisData, mainComplaint: e.target.value })
                  }
                  rows={3}
                  placeholder="Descreva a queixa principal..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="medicalHistory">Histórico Médico</Label>
                  <Textarea
                    id="medicalHistory"
                    value={anamnesisData.medicalHistory}
                    onChange={(e) =>
                      setAnamnesisData({
                        ...anamnesisData,
                        medicalHistory: e.target.value,
                      })
                    }
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="familyHistory">Histórico Familiar</Label>
                  <Textarea
                    id="familyHistory"
                    value={anamnesisData.familyHistory}
                    onChange={(e) =>
                      setAnamnesisData({ ...anamnesisData, familyHistory: e.target.value })
                    }
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="developmentHistory">Histórico de Desenvolvimento</Label>
                <Textarea
                  id="developmentHistory"
                  value={anamnesisData.developmentHistory}
                  onChange={(e) =>
                    setAnamnesisData({
                      ...anamnesisData,
                      developmentHistory: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currentMedications">Medicações Atuais</Label>
                  <Textarea
                    id="currentMedications"
                    value={anamnesisData.currentMedications}
                    onChange={(e) =>
                      setAnamnesisData({
                        ...anamnesisData,
                        currentMedications: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Alergias</Label>
                  <Textarea
                    id="allergies"
                    value={anamnesisData.allergies}
                    onChange={(e) =>
                      setAnamnesisData({ ...anamnesisData, allergies: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="previousTherapies">Terapias Anteriores</Label>
                <Textarea
                  id="previousTherapies"
                  value={anamnesisData.previousTherapies}
                  onChange={(e) =>
                    setAnamnesisData({
                      ...anamnesisData,
                      previousTherapies: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="therapyGoals">Objetivos Terapêuticos</Label>
                <Textarea
                  id="therapyGoals"
                  value={anamnesisData.therapyGoals}
                  onChange={(e) =>
                    setAnamnesisData({ ...anamnesisData, therapyGoals: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Observações Adicionais</Label>
                <Textarea
                  id="additionalNotes"
                  value={anamnesisData.additionalNotes}
                  onChange={(e) =>
                    setAnamnesisData({
                      ...anamnesisData,
                      additionalNotes: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSaveAnamnesis}
                disabled={
                  createAnamnesisMutation.isPending || updateAnamnesisMutation.isPending
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {anamnesis ? "Atualizar Anamnese" : "Salvar Anamnese"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Records Tab */}
        <TabsContent value="sessoes" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isSessionDialogOpen} onOpenChange={setIsSessionDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Registro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Registro de Sessão</DialogTitle>
                  <DialogDescription>
                    Registre a evolução da sessão de terapia
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSessionRecord} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="appointmentId">Agendamento</Label>
                      <Select
                        value={sessionRecordData.appointmentId.toString()}
                        onValueChange={(value) =>
                          setSessionRecordData({
                            ...sessionRecordData,
                            appointmentId: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {appointments?.map((apt) => (
                            <SelectItem key={apt.id} value={apt.id.toString()}>
                              {format(new Date(apt.startTime), "PP", { locale: ptBR })}
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
                          setSessionRecordData({
                            ...sessionRecordData,
                            sessionDate: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionSummary">Resumo da Sessão *</Label>
                    <Textarea
                      id="sessionSummary"
                      value={sessionRecordData.sessionSummary}
                      onChange={(e) =>
                        setSessionRecordData({
                          ...sessionRecordData,
                          sessionSummary: e.target.value,
                        })
                      }
                      rows={4}
                      required
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
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="muito_bem">Muito Bem</SelectItem>
                        <SelectItem value="bem">Bem</SelectItem>
                        <SelectItem value="neutro">Neutro</SelectItem>
                        <SelectItem value="ansioso">Ansioso</SelectItem>
                        <SelectItem value="irritado">Irritado</SelectItem>
                        <SelectItem value="triste">Triste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patientBehavior">Comportamento</Label>
                    <Textarea
                      id="patientBehavior"
                      value={sessionRecordData.patientBehavior}
                      onChange={(e) =>
                        setSessionRecordData({
                          ...sessionRecordData,
                          patientBehavior: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="goalsAchieved">Metas Atingidas</Label>
                    <Textarea
                      id="goalsAchieved"
                      value={sessionRecordData.goalsAchieved}
                      onChange={(e) =>
                        setSessionRecordData({
                          ...sessionRecordData,
                          goalsAchieved: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nextSessionPlan">Plano para Próxima Sessão</Label>
                    <Textarea
                      id="nextSessionPlan"
                      value={sessionRecordData.nextSessionPlan}
                      onChange={(e) =>
                        setSessionRecordData({
                          ...sessionRecordData,
                          nextSessionPlan: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSessionDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createSessionRecordMutation.isPending}
                    >
                      Salvar Registro
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registros de Sessão</CardTitle>
              <CardDescription>Histórico de evoluções</CardDescription>
            </CardHeader>
            <CardContent>
              {!sessionRecords || sessionRecords.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum registro de sessão encontrado
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessionRecords.map((record) => (
                    <div key={record.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">
                            {format(new Date(record.sessionDate), "PPP", {
                              locale: ptBR,
                            })}
                          </p>
                          {record.patientMood && (
                            <p className="text-sm text-muted-foreground">
                              Humor: {moodLabels[record.patientMood]}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="font-medium">Resumo:</p>
                          <p className="text-muted-foreground">
                            {record.sessionSummary}
                          </p>
                        </div>
                        {record.patientBehavior && (
                          <div>
                            <p className="font-medium">Comportamento:</p>
                            <p className="text-muted-foreground">
                              {record.patientBehavior}
                            </p>
                          </div>
                        )}
                        {record.goalsAchieved && (
                          <div>
                            <p className="font-medium">Metas Atingidas:</p>
                            <p className="text-muted-foreground">
                              {record.goalsAchieved}
                            </p>
                          </div>
                        )}
                        {record.nextSessionPlan && (
                          <div>
                            <p className="font-medium">Próxima Sessão:</p>
                            <p className="text-muted-foreground">
                              {record.nextSessionPlan}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documentos" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar Documento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar Documento</DialogTitle>
                  <DialogDescription>
                    Faça upload de relatórios, laudos ou outros documentos
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUploadDocument} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={documentData.title}
                      onChange={(e) =>
                        setDocumentData({ ...documentData, title: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={documentData.description}
                      onChange={(e) =>
                        setDocumentData({
                          ...documentData,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="documentType">Tipo de Documento</Label>
                    <Select
                      value={documentData.documentType}
                      onValueChange={(value: any) =>
                        setDocumentData({ ...documentData, documentType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relatorio_evolucao">
                          Relatório de Evolução
                        </SelectItem>
                        <SelectItem value="laudo">Laudo</SelectItem>
                        <SelectItem value="anamnese">Anamnese</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">Arquivo *</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={(e) =>
                        setDocumentData({
                          ...documentData,
                          file: e.target.files?.[0] || null,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDocumentDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={uploadDocumentMutation.isPending}>
                      Enviar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <CardDescription>Arquivos anexados ao prontuário</CardDescription>
            </CardHeader>
            <CardContent>
              {!documents || documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum documento encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.createdAt), "PP", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.fileUrl, "_blank")}
                      >
                        Baixar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
