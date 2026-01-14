import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Play, Pause, Square, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface SessionTimerProps {
  patientId: number;
  patientName: string;
  onSessionEnd?: () => void;
}

export function SessionTimer({ patientId, patientName, onSessionEnd }: SessionTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createSessionMutation = trpc.evolutions.create.useMutation();

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  // Autosave notes
  useEffect(() => {
    if (notes && isRunning) {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }

      autosaveTimeoutRef.current = setTimeout(() => {
        // Autosave logic here (optional - could save draft to localStorage)
        console.log("Autosaving notes...");
      }, 2000);
    }

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [notes, isRunning]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    if (!startTime) {
      setStartTime(new Date());
    }
    toast.success("Sessão iniciada");
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    toast.info(isPaused ? "Sessão retomada" : "Sessão pausada");
  };

  const handleEnd = async () => {
    if (!notes.trim()) {
      toast.error("Por favor, adicione notas da evolução antes de finalizar");
      return;
    }

    try {
      const durationMinutes = Math.round(elapsedSeconds / 60);

      await createSessionMutation.mutateAsync({
        appointmentId: 0, // Will be updated to link to specific appointment if needed
        patientId,
        sessionDate: startTime || new Date(),
        sessionSummary: notes.trim(),
        collaborationLevel: "partial", // Valor padrão para sessões via timer
        patientMood: "neutro",
        goalsAchieved: `Duração: ${durationMinutes} minutos`,
      });

      toast.success("Sessão finalizada e salva no prontuário");
      
      // Reset timer
      setIsRunning(false);
      setIsPaused(false);
      setElapsedSeconds(0);
      setNotes("");
      setStartTime(null);

      if (onSessionEnd) {
        onSessionEnd();
      }
    } catch (error) {
      console.error("Error saving session:", error);
      toast.error("Erro ao salvar sessão");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          Sessão em Andamento
        </CardTitle>
        <CardDescription>
          Paciente: <span className="font-semibold text-foreground">{patientName}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timer Display */}
        <div className="flex flex-col items-center justify-center p-8 bg-muted rounded-lg">
          <div className="text-6xl font-bold font-mono text-orange-500 mb-4">
            {formatTime(elapsedSeconds)}
          </div>
          <div className="text-sm text-muted-foreground">
            {isRunning && !isPaused && "Sessão em andamento..."}
            {isRunning && isPaused && "Sessão pausada"}
            {!isRunning && "Pronto para iniciar"}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 justify-center">
          {!isRunning && (
            <Button onClick={handleStart} size="lg" className="gap-2">
              <Play className="h-4 w-4" />
              Iniciar Sessão
            </Button>
          )}

          {isRunning && (
            <>
              <Button onClick={handlePause} variant="outline" size="lg" className="gap-2">
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4" />
                    Retomar
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" />
                    Pausar
                  </>
                )}
              </Button>

              <Button
                onClick={handleEnd}
                variant="destructive"
                size="lg"
                className="gap-2"
                disabled={createSessionMutation.isPending}
              >
                <Square className="h-4 w-4" />
                {createSessionMutation.isPending ? "Salvando..." : "Finalizar"}
              </Button>
            </>
          )}
        </div>

        {/* Evolution Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Evolução da Sessão
            {isRunning && (
              <span className="ml-2 text-xs text-muted-foreground">(salvamento automático ativado)</span>
            )}
          </label>
          <Textarea
            placeholder="Descreva a evolução do paciente durante esta sessão..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={10}
            className="resize-none"
            disabled={!isRunning}
          />
          <p className="text-xs text-muted-foreground">
            {notes.length} caracteres
          </p>
        </div>

        {!isRunning && (
          <p className="text-sm text-center text-muted-foreground">
            Clique em "Iniciar Sessão" para começar o cronômetro e registrar a evolução
          </p>
        )}
      </CardContent>
    </Card>
  );
}
