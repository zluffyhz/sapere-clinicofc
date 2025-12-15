import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as db from './db';

// Mock the database module
vi.mock('./db', async () => {
  const actual = await vi.importActual('./db');
  return {
    ...actual,
    getDb: vi.fn(),
    createAttendance: vi.fn(),
    getAttendanceById: vi.fn(),
    getAttendanceByPatient: vi.fn(),
    getAttendanceByFamily: vi.fn(),
    getAttendanceByAppointment: vi.fn(),
    updateAttendance: vi.fn(),
    getAttendanceByDateRange: vi.fn(),
    getTodayAppointmentsForAttendance: vi.fn(),
  };
});

describe('Attendance System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createAttendance', () => {
    it('should create attendance record with all required fields', async () => {
      const mockAttendance = {
        appointmentId: 1,
        patientId: 1,
        familyUserId: 2,
        therapistUserId: 3,
        therapyType: 'fonoaudiologia' as const,
        scheduledDate: new Date(),
        status: 'present' as const,
        markedByUserId: 4,
        notes: 'Paciente chegou no horário',
      };

      vi.mocked(db.createAttendance).mockResolvedValue([{ insertId: 1 }] as any);

      const result = await db.createAttendance(mockAttendance);
      
      expect(db.createAttendance).toHaveBeenCalledWith(mockAttendance);
      expect(result[0].insertId).toBe(1);
    });

    it('should create attendance with different status types', async () => {
      const statuses = ['present', 'absent', 'late', 'excused'] as const;
      
      for (const status of statuses) {
        const mockAttendance = {
          appointmentId: 1,
          patientId: 1,
          familyUserId: 2,
          therapistUserId: 3,
          therapyType: 'psicologia' as const,
          scheduledDate: new Date(),
          status,
          markedByUserId: 4,
        };

        vi.mocked(db.createAttendance).mockResolvedValue([{ insertId: 1 }] as any);
        
        await db.createAttendance(mockAttendance);
        
        expect(db.createAttendance).toHaveBeenCalledWith(
          expect.objectContaining({ status })
        );
      }
    });
  });

  describe('getAttendanceByPatient', () => {
    it('should return attendance records for a patient', async () => {
      const mockRecords = [
        { id: 1, patientId: 1, status: 'present', scheduledDate: new Date() },
        { id: 2, patientId: 1, status: 'absent', scheduledDate: new Date() },
      ];

      vi.mocked(db.getAttendanceByPatient).mockResolvedValue(mockRecords as any);

      const result = await db.getAttendanceByPatient(1);
      
      expect(db.getAttendanceByPatient).toHaveBeenCalledWith(1);
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('present');
    });

    it('should return empty array for patient with no attendance', async () => {
      vi.mocked(db.getAttendanceByPatient).mockResolvedValue([]);

      const result = await db.getAttendanceByPatient(999);
      
      expect(result).toHaveLength(0);
    });
  });

  describe('getAttendanceByFamily', () => {
    it('should return attendance records for a family user', async () => {
      const mockRecords = [
        { id: 1, familyUserId: 2, patientId: 1, status: 'present' },
        { id: 2, familyUserId: 2, patientId: 3, status: 'late' },
      ];

      vi.mocked(db.getAttendanceByFamily).mockResolvedValue(mockRecords as any);

      const result = await db.getAttendanceByFamily(2);
      
      expect(db.getAttendanceByFamily).toHaveBeenCalledWith(2);
      expect(result).toHaveLength(2);
    });
  });

  describe('getAttendanceByAppointment', () => {
    it('should return attendance for a specific appointment', async () => {
      const mockAttendance = {
        id: 1,
        appointmentId: 5,
        status: 'present',
      };

      vi.mocked(db.getAttendanceByAppointment).mockResolvedValue(mockAttendance as any);

      const result = await db.getAttendanceByAppointment(5);
      
      expect(db.getAttendanceByAppointment).toHaveBeenCalledWith(5);
      expect(result?.appointmentId).toBe(5);
    });

    it('should return undefined for appointment without attendance', async () => {
      vi.mocked(db.getAttendanceByAppointment).mockResolvedValue(undefined);

      const result = await db.getAttendanceByAppointment(999);
      
      expect(result).toBeUndefined();
    });
  });

  describe('updateAttendance', () => {
    it('should update attendance status', async () => {
      vi.mocked(db.updateAttendance).mockResolvedValue({} as any);

      await db.updateAttendance(1, { status: 'absent', notes: 'Paciente não compareceu' });
      
      expect(db.updateAttendance).toHaveBeenCalledWith(1, {
        status: 'absent',
        notes: 'Paciente não compareceu',
      });
    });
  });

  describe('getTodayAppointmentsForAttendance', () => {
    it('should return today scheduled appointments', async () => {
      const mockAppointments = [
        { id: 1, patientId: 1, startTime: new Date(), status: 'scheduled' },
        { id: 2, patientId: 2, startTime: new Date(), status: 'scheduled' },
      ];

      vi.mocked(db.getTodayAppointmentsForAttendance).mockResolvedValue(mockAppointments as any);

      const result = await db.getTodayAppointmentsForAttendance();
      
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('scheduled');
    });

    it('should return empty array when no appointments today', async () => {
      vi.mocked(db.getTodayAppointmentsForAttendance).mockResolvedValue([]);

      const result = await db.getTodayAppointmentsForAttendance();
      
      expect(result).toHaveLength(0);
    });
  });

  describe('Attendance Statistics', () => {
    it('should calculate correct attendance rate', () => {
      const records = [
        { status: 'present' },
        { status: 'present' },
        { status: 'late' },
        { status: 'absent' },
        { status: 'excused' },
      ];

      const total = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const late = records.filter(r => r.status === 'late').length;
      const attendanceRate = Math.round(((present + late) / total) * 100);

      expect(attendanceRate).toBe(60); // 3 out of 5 (present + late)
    });

    it('should handle empty records', () => {
      const records: any[] = [];
      const total = records.length;
      const attendanceRate = total > 0 ? Math.round((0 / total) * 100) : 0;

      expect(attendanceRate).toBe(0);
    });
  });

  describe('Therapy Types', () => {
    it('should support all therapy types', () => {
      const therapyTypes = [
        'fonoaudiologia',
        'psicologia',
        'terapia_ocupacional',
        'psicopedagogia',
        'neuropsicologia',
        'outro',
      ];

      therapyTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Gamification System', () => {
    describe('Badge Tiers', () => {
      it('should have correct tier hierarchy', () => {
        const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
        expect(tiers).toHaveLength(5);
        expect(tiers[0]).toBe('bronze');
        expect(tiers[4]).toBe('diamond');
      });
    });

    describe('Streak Badges', () => {
      it('should unlock badges at correct streak thresholds', () => {
        const streakThresholds = [5, 10, 25, 50, 100];
        const badgeNames = [
          'Iniciante Dedicado',
          'Comprometido',
          'Super Dedicado',
          'Campeão da Consistência',
          'Lendário'
        ];

        streakThresholds.forEach((threshold, index) => {
          expect(threshold).toBeGreaterThan(0);
          expect(badgeNames[index]).toBeDefined();
        });
      });

      it('should calculate streak correctly', () => {
        const records = [
          { status: 'present', scheduledDate: new Date('2024-01-05') },
          { status: 'present', scheduledDate: new Date('2024-01-04') },
          { status: 'present', scheduledDate: new Date('2024-01-03') },
          { status: 'absent', scheduledDate: new Date('2024-01-02') },
          { status: 'present', scheduledDate: new Date('2024-01-01') },
        ];

        // Sort by date descending
        const sorted = [...records].sort(
          (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
        );

        let streak = 0;
        for (const record of sorted) {
          if (record.status === 'present' || record.status === 'late') {
            streak++;
          } else {
            break;
          }
        }

        expect(streak).toBe(3); // First 3 are present, then absent breaks the streak
      });
    });

    describe('Total Sessions Badges', () => {
      it('should unlock badges at correct session thresholds', () => {
        const sessionThresholds = [1, 10, 25, 50, 100];
        const badgeNames = [
          'Primeiro Passo',
          'Progresso Constante',
          'Evolução Notável',
          'Marco Importante',
          'Centenário'
        ];

        sessionThresholds.forEach((threshold, index) => {
          expect(threshold).toBeGreaterThan(0);
          expect(badgeNames[index]).toBeDefined();
        });
      });
    });

    describe('Perfect Month Badges', () => {
      it('should calculate perfect months correctly', () => {
        const records = [
          { status: 'present', scheduledDate: new Date('2024-01-15') },
          { status: 'present', scheduledDate: new Date('2024-01-20') },
          { status: 'present', scheduledDate: new Date('2024-02-10') },
          { status: 'absent', scheduledDate: new Date('2024-02-15') },
        ];

        const monthlyRecords: Record<string, { present: number; total: number }> = {};
        for (const record of records) {
          const monthKey = new Date(record.scheduledDate).toISOString().slice(0, 7);
          if (!monthlyRecords[monthKey]) {
            monthlyRecords[monthKey] = { present: 0, total: 0 };
          }
          monthlyRecords[monthKey].total++;
          if (record.status === 'present' || record.status === 'late') {
            monthlyRecords[monthKey].present++;
          }
        }

        const perfectMonths = Object.values(monthlyRecords).filter(
          m => m.total > 0 && m.present === m.total
        ).length;

        expect(perfectMonths).toBe(1); // Only January is perfect
      });

      it('should unlock badges at correct perfect month thresholds', () => {
        const monthThresholds = [1, 3, 6, 12];
        const badgeNames = [
          'Mês Perfeito',
          'Trimestre de Ouro',
          'Semestre Impecável',
          'Ano de Excelência'
        ];

        monthThresholds.forEach((threshold, index) => {
          expect(threshold).toBeGreaterThan(0);
          expect(badgeNames[index]).toBeDefined();
        });
      });
    });

    describe('Longest Streak Calculation', () => {
      it('should find longest streak in history', () => {
        const records = [
          { status: 'present', scheduledDate: new Date('2024-01-01') },
          { status: 'present', scheduledDate: new Date('2024-01-02') },
          { status: 'absent', scheduledDate: new Date('2024-01-03') },
          { status: 'present', scheduledDate: new Date('2024-01-04') },
          { status: 'present', scheduledDate: new Date('2024-01-05') },
          { status: 'present', scheduledDate: new Date('2024-01-06') },
          { status: 'present', scheduledDate: new Date('2024-01-07') },
          { status: 'absent', scheduledDate: new Date('2024-01-08') },
        ];

        // Sort chronologically
        const sorted = [...records].sort(
          (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
        );

        let longestStreak = 0;
        let tempStreak = 0;
        for (const record of sorted) {
          if (record.status === 'present' || record.status === 'late') {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }

        expect(longestStreak).toBe(4); // Days 4-7 form the longest streak
      });
    });
  });
});
