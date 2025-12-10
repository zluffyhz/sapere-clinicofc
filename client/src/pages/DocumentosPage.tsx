import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function DocumentosPage() {
  const { user } = useAuth();
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const { data: patients, isLoading: patientsLoading } = trpc.patients.list.useQuery();

  const { data: documents, isLoading: documentsLoading } = trpc.documents.listByPatient.useQuery(
    { patientId: selectedPatientId! },
    { enabled: !!selectedPatientId }
  );

  const documentTypeLabels: Record<string, string> = {
    relatorio_evolucao: "Relatório de Evolução",
    laudo: "Laudo",
    anamnese: "Anamnese",
    outros: "Outros",
  };

  const documentTypeColors: Record<string, string> = {
    relatorio_evolucao: "bg-blue-100 text-blue-700",
    laudo: "bg-purple-100 text-purple-700",
    anamnese: "bg-green-100 text-green-700",
    outros: "bg-gray-100 text-gray-700",
  };

  const handleDownload = (url: string, title: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Acesse relatórios de evolução, laudos e outros documentos
        </p>
      </div>

      {/* Patient Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Selecione um Paciente</CardTitle>
          <CardDescription>
            Escolha o paciente para visualizar seus documentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patientsLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Carregando pacientes...
            </div>
          ) : !patients || patients.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum paciente cadastrado
              </p>
            </div>
          ) : (
            <Select
              value={selectedPatientId?.toString() || ""}
              onValueChange={(value) => setSelectedPatientId(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id.toString()}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      {selectedPatientId && (
        <Card>
          <CardHeader>
            <CardTitle>Documentos Disponíveis</CardTitle>
            <CardDescription>
              {patients?.find((p) => p.id === selectedPatientId)?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documentsLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando documentos...
              </div>
            ) : !documents || documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum documento disponível para este paciente
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">{doc.title}</h3>
                        </div>
                        
                        {doc.description && (
                          <p className="text-sm text-muted-foreground">
                            {doc.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <Badge
                            className={documentTypeColors[doc.documentType] || ""}
                            variant="secondary"
                          >
                            {documentTypeLabels[doc.documentType] || doc.documentType}
                          </Badge>
                          
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(doc.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </span>

                          {doc.fileSize && (
                            <span className="text-muted-foreground">
                              {(doc.fileSize / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleDownload(doc.fileUrl, doc.title)}
                        size="sm"
                        className="shrink-0"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {selectedPatientId && documents && documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 rounded-lg border">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold mt-2">{documents.length}</p>
                <p className="text-xs text-muted-foreground mt-1">documentos</p>
              </div>
              {Object.entries(
                documents.reduce((acc, doc) => {
                  acc[doc.documentType] = (acc[doc.documentType] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <div key={type} className="p-4 rounded-lg border">
                  <p className="text-sm font-medium text-muted-foreground">
                    {documentTypeLabels[type] || type}
                  </p>
                  <p className="text-2xl font-bold mt-2">{count}</p>
                  <p className="text-xs text-muted-foreground mt-1">documento(s)</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
