import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, Square, Clock } from "lucide-react";
import { toast } from "sonner";

interface SessionTimerProps {
  patientId: number;
  patientName: string;
  onSessionEnd?: (durationMinutes: number, startTime: Date) => void;
}

export function SessionTimer({ patientId, patientName, onSessionEnd }: SessionTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleEnd = () => {
    const durationMinutes = Math.round(elapsedSeconds / 60);
    const sessionStartTime = startTime || new Date();

    toast.success(`Sessão finalizada! Duração: ${durationMinutes} minutos`);
    
    // Reset timer
    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setStartTime(null);

    // Call parent callback with session data
    if (onSessionEnd) {
      onSessionEnd(durationMinutes, sessionStartTime);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          Cronômetro de Sessão
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
              >
                <Square className="h-4 w-4" />
                Finalizar
              </Button>
            </>
          )}
        </div>

        {!isRunning && (
          <p className="text-sm text-center text-muted-foreground">
            Clique em "Iniciar Sessão" para começar o cronômetro. Ao finalizar, você poderá preencher a evolução completa.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
