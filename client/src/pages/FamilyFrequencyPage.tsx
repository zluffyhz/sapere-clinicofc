import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { OwlBadgeGrid } from "@/components/OwlBadge";
import { 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Calendar,
  Award,
  BarChart3,
  Trophy,
  Flame
} from "lucide-react";

type AttendanceStatus = "present" | "absent";

const statusConfig: Record<AttendanceStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  present: { 
    label: "Presente", 
    color: "text-green-600", 
    bgColor: "bg-green-100",
    icon: <CheckCircle2 className="w-4 h-4" /> 
  },
  absent: { 
    label: "Ausente", 
    color: "text-red-600", 
    bgColor: "bg-red-100",
    icon: <XCircle className="w-4 h-4" /> 
  },
};

const therapyTypeLabels: Record<string, string> = {
  fonoaudiologia: "Fonoaudiologia",
  psicologia: "Psicologia",
  terapia_ocupacional: "Terapia Ocupacional",
  psicopedagogia: "Psicopedagogia",
  neuropsicologia: "Neuropsicologia",
  outro: "Outro",
};

const therapyTypeColors: Record<string, string> = {
  fonoaudiologia: "bg-purple-100 text-purple-700 border-purple-200",
  psicologia: "bg-blue-100 text-blue-700 border-blue-200",
  terapia_ocupacional: "bg-green-100 text-green-700 border-green-200",
  psicopedagogia: "bg-orange-100 text-orange-700 border-orange-200",
  neuropsicologia: "bg-pink-100 text-pink-700 border-pink-200",
  outro: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function FamilyFrequencyPage() {
  const { data: stats, isLoading: statsLoading } = trpc.attendance.familyStats.useQuery();
  const { data: attendanceRecords, isLoading: recordsLoading } = trpc.attendance.myFamilyAttendance.useQuery();
  const { data: achievements, isLoading: achievementsLoading } = trpc.attendance.achievements.useQuery();
  const { data: patients } = trpc.patients.list.useQuery();

  const isLoading = statsLoading || recordsLoading || achievementsLoading;

  // Group attendance by month for the calendar view
  const groupedByMonth = attendanceRecords?.reduce((acc, record) => {
    const date = new Date(record.scheduledDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(record);
    return acc;
  }, {} as Record<string, typeof attendanceRecords>);

  // Get patient name by ID
  const getPatientName = (patientId: number) => {
    const patient = patients?.find(p => p.id === patientId);
    return patient?.name || "Paciente";
  };

  // Calculate streak (consecutive present days)
  const calculateStreak = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) return 0;
    
    const sorted = [...attendanceRecords]
      .filter(r => r.status === "present" || r.status === "late")
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
    
    let streak = 0;
    for (const record of sorted) {
      if (record.status === "present" || record.status === "late") {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Frequência</h1>
            <p className="text-gray-500">Acompanhe a presença nas sessões de terapia</p>
          </div>
        </div>
      </div>

      {/* Main Stats Card */}
      <Card className="bg-gradient-to-br from-orange-50 via-white to-yellow-50 border-orange-200 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Attendance Rate Circle */}
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="url(#gradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(stats?.attendanceRate || 0) * 4.4} 440`}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#eab308" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-gray-900">
                  {stats?.attendanceRate || 0}%
                </span>
                <span className="text-sm text-gray-500">Frequência</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
              <div className="bg-white/80 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Presenças</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats?.present || 0}</p>
              </div>
              
              <div className="bg-white/80 rounded-xl p-4 border border-red-100">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <XCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Faltas</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats?.absent || 0}</p>
              </div>
              

            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak and Total */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700 font-medium mb-1">Sequência Atual</p>
                <p className="text-4xl font-bold text-amber-900">{achievements?.streak || streak}</p>
                <p className="text-sm text-amber-600 mt-1">sessões consecutivas</p>
              </div>
              <div className="p-4 bg-amber-200/50 rounded-full">
                <Flame className="w-10 h-10 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium mb-1">Maior Sequência</p>
                <p className="text-4xl font-bold text-purple-900">{achievements?.longestStreak || 0}</p>
                <p className="text-sm text-purple-600 mt-1">recorde pessoal</p>
              </div>
              <div className="p-4 bg-purple-200/50 rounded-full">
                <Trophy className="w-10 h-10 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-700 font-medium mb-1">Meses Perfeitos</p>
                <p className="text-4xl font-bold text-indigo-900">{achievements?.perfectMonths || 0}</p>
                <p className="text-sm text-indigo-600 mt-1">100% presença</p>
              </div>
              <div className="p-4 bg-indigo-200/50 rounded-full">
                <Award className="w-10 h-10 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements/Badges Section */}
      {achievements && achievements.badges && achievements.badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Conquistas e Medalhas
            </CardTitle>
            <CardDescription>
              Desbloqueie medalhas mantendo sua frequência nas sessões
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OwlBadgeGrid badges={achievements.badges as any} />
          </CardContent>
        </Card>
      )}

      {/* Recent Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            Histórico de Frequência
          </CardTitle>
          <CardDescription>
            Últimas sessões registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!attendanceRecords || attendanceRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhum registro de frequência</p>
              <p className="text-sm">Os registros aparecerão aqui após as sessões</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendanceRecords.slice(0, 10).map((record) => {
                const status = record.status as AttendanceStatus;
                const config = statusConfig[status];
                
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${config.bgColor}`}>
                        <span className={config.color}>{config.icon}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {getPatientName(record.patientId)}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>
                            {new Date(record.scheduledDate).toLocaleDateString("pt-BR", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${therapyTypeColors[record.therapyType] || therapyTypeColors.outro}`}
                          >
                            {therapyTypeLabels[record.therapyType] || record.therapyType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <Badge className={`${config.bgColor} ${config.color} border-0`}>
                      {config.icon}
                      <span className="ml-1">{config.label}</span>
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      {groupedByMonth && Object.keys(groupedByMonth).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-orange-500" />
              Resumo Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(groupedByMonth)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 3)
                .map(([monthKey, records]) => {
                  const [year, month] = monthKey.split('-');
                  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                  });
                  
                  const present = records.filter(r => r.status === "present").length;
                  const total = records.length;
                  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                  
                  return (
                    <div key={monthKey} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {monthName}
                        </span>
                        <span className="text-sm text-gray-500">
                          {present}/{total} sessões ({rate}%)
                        </span>
                      </div>
                      <Progress 
                        value={rate} 
                        className="h-2"
                      />
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
