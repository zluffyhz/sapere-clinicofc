import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { sendNewDocumentEmail, sendScheduleChangeEmail, sendNewSessionRecordEmail } from "./email";

// Middleware for therapist-only procedures
const therapistProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'therapist' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a terapeutas' });
  }
  return next({ ctx });
});

// Middleware for family-only procedures
const familyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'family' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a famílias' });
  }
  return next({ ctx });
});

// Middleware for admin-only procedures
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    
    loginWithPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByEmail(input.email);
        
        if (!user || !user.passwordHash) {
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Email ou senha inválidos' 
          });
        }
        
        const bcrypt = await import('bcrypt');
        const isValid = await bcrypt.compare(input.password, user.passwordHash);
        
        if (!isValid) {
          throw new TRPCError({ 
            code: 'UNAUTHORIZED', 
            message: 'Email ou senha inválidos' 
          });
        }
        
        // Update last signed in
        await db.upsertUser({ 
          openId: user.openId, 
          lastSignedIn: new Date() 
        });
        
        // Create session using SDK (same as OAuth)
        const { sdk } = await import('./_core/sdk');
        const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
        return { 
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        };
      }),
    
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().optional(),
        newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }
        
        // If user has a password, verify current password
        if (user.passwordHash && input.currentPassword) {
          const bcrypt = await import('bcrypt');
          const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
          
          if (!isValid) {
            throw new TRPCError({ 
              code: 'UNAUTHORIZED', 
              message: 'Senha atual incorreta' 
            });
          }
        }
        
        // Hash new password
        const bcrypt = await import('bcrypt');
        const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
        
        await db.updateUserPassword(ctx.user.id, newPasswordHash);
        
        return { success: true };
      }),
  }),
  // ============ PATIENT ROUTER ============
  patients: router({
    create: therapistProcedure
      .input(z.object({
        name: z.string().min(1),
        dateOfBirth: z.date().optional(),
        familyUserId: z.number(),
        diagnosis: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createPatient({
          ...input,
          therapistUserId: ctx.user.id,
        });
        return { success: true, id: result[0].insertId };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'admin') {
        return await db.getAllPatients();
      } else if (ctx.user.role === 'therapist') {
        return await db.getAllPatients(); // Terapeutas veem todos os pacientes
      } else {
        return await db.getPatientsByFamily(ctx.user.id);
      }
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const patient = await db.getPatientById(input.id);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Paciente não encontrado' });
        }
        
        // Check access rights
        if (ctx.user.role === 'family' && patient.familyUserId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar este paciente' });
        }
        if (ctx.user.role === 'therapist' && patient.therapistUserId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar este paciente' });
        }
        
        return patient;
      }),

    update: therapistProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        dateOfBirth: z.date().optional(),
        familyUserId: z.number().optional(),
        diagnosis: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        console.log("[patients.update] Received data:", { id, data });
        const result = await db.updatePatient(id, data);
        console.log("[patients.update] Update result:", result);
        return { success: true };
      }),

    delete: therapistProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePatient(input.id);
        return { success: true };
      }),
  }),

  // ============ APPOINTMENT ROUTER ============
  appointments: router({
    create: therapistProcedure
      .input(z.object({
        patientId: z.number(),
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "outro"]),
        startTime: z.date(),
        endTime: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check for scheduling conflicts
        const conflicts = await db.checkScheduleConflicts(
          input.startTime,
          input.endTime,
          ctx.user.id,
          input.patientId
        );

        if (conflicts.therapistConflict) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Conflito de horário: O terapeuta já possui outro agendamento neste horário.',
          });
        }

        if (conflicts.patientConflict) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Conflito de horário: O paciente já possui outro agendamento neste horário.',
          });
        }

        const result = await db.createAppointment({
          ...input,
          therapistUserId: ctx.user.id,
          status: 'scheduled',
        });
        
        // Create notification for family
        const patient = await db.getPatientById(input.patientId);
        if (patient) {
          await db.createNotification({
            userId: patient.familyUserId,
            type: 'schedule_change',
            title: 'Nova sessão agendada',
            message: `Uma nova sessão de ${input.therapyType} foi agendada para ${input.startTime.toLocaleDateString('pt-BR')}`,
            relatedId: result[0].insertId,
          });
          
          // Send email notification
          const familyUser = await db.getUserById(patient.familyUserId);
          if (familyUser?.email) {
            sendScheduleChangeEmail(
              familyUser.email,
              patient.name,
              input.therapyType,
              input.startTime
            ).catch(err => console.error('[Email] Failed to send schedule change email:', err));
          }
        }
        
        return { success: true, id: result[0].insertId };
      }),

    listByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        patientId: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === 'admin') {
          return await db.getAppointmentsByDateRange(input.startDate, input.endDate);
        } else if (ctx.user.role === 'therapist') {
          return await db.getAppointmentsByDateRange(input.startDate, input.endDate); // Terapeutas veem todos os agendamentos
        } else {
          // For families, get appointments for their patients
          const patients = await db.getPatientsByFamily(ctx.user.id);
          const patientIds = patients.map(p => p.id);
          const allAppointments = await db.getAppointmentsByDateRange(input.startDate, input.endDate);
          return allAppointments.filter(apt => patientIds.includes(apt.patientId));
        }
      }),

    listByPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAppointmentsByPatient(input.patientId);
      }),

    update: therapistProcedure
      .input(z.object({
        id: z.number(),
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "outro"]).optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Check for scheduling conflicts if time is being updated
        if (data.startTime && data.endTime) {
          const appointment = await db.getAppointmentById(id);
          if (appointment) {
            const conflicts = await db.checkScheduleConflicts(
              data.startTime,
              data.endTime,
              appointment.therapistUserId,
              appointment.patientId,
              id // Exclude current appointment from conflict check
            );

            if (conflicts.therapistConflict) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Conflito de horário: O terapeuta já possui outro agendamento neste horário.',
              });
            }

            if (conflicts.patientConflict) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Conflito de horário: O paciente já possui outro agendamento neste horário.',
              });
            }
          }
        }
        
        await db.updateAppointment(id, data);
        
        // Notify family if schedule changed
        if (data.startTime || data.endTime || data.status) {
          const appointment = await db.getAppointmentById(id);
          if (appointment) {
            const patient = await db.getPatientById(appointment.patientId);
            if (patient) {
              await db.createNotification({
                userId: patient.familyUserId,
                type: 'schedule_change',
                title: 'Alteração na agenda',
                message: `A sessão de ${appointment.therapyType} foi atualizada`,
                relatedId: id,
              });
              
              // Send email notification
              const familyUser = await db.getUserById(patient.familyUserId);
              if (familyUser?.email && data.startTime) {
                sendScheduleChangeEmail(
                  familyUser.email,
                  patient.name,
                  appointment.therapyType,
                  data.startTime
                ).catch(err => console.error('[Email] Failed to send schedule change email:', err));
              }
            }
          }
        }
        
        return { success: true };
      }),

    delete: therapistProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAppointment(input.id);
        return { success: true };
      }),
  }),

  // ============ DOCUMENT ROUTER ============
  documents: router({
    upload: therapistProcedure
      .input(z.object({
        patientId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        documentType: z.enum(["relatorio_evolucao", "laudo", "anamnese", "outros"]),
        fileData: z.string(), // base64 encoded
        fileName: z.string(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileKey = `documents/${input.patientId}/${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        const result = await db.createDocument({
          patientId: input.patientId,
          uploadedByUserId: ctx.user.id,
          title: input.title,
          description: input.description,
          documentType: input.documentType,
          fileKey,
          fileUrl: url,
          mimeType: input.mimeType,
          fileSize: buffer.length,
        });
        
        // Create notification for family
        const patient = await db.getPatientById(input.patientId);
        if (patient) {
          await db.createNotification({
            userId: patient.familyUserId,
            type: 'new_document',
            title: 'Novo documento disponível',
            message: `Um novo documento "${input.title}" foi adicionado`,
            relatedId: result[0].insertId,
          });
          
          // Send email notification
          const familyUser = await db.getUserById(patient.familyUserId);
          if (familyUser?.email) {
            sendNewDocumentEmail(
              familyUser.email,
              patient.name,
              input.title
            ).catch(err => console.error('[Email] Failed to send new document email:', err));
          }
        }
        
        return { success: true, id: result[0].insertId, url };
      }),

    listByPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Paciente não encontrado' });
        }
        
        // Check access rights
        if (ctx.user.role === 'family' && patient.familyUserId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        if (ctx.user.role === 'therapist' && patient.therapistUserId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return await db.getDocumentsByPatient(input.patientId);
      }),

    delete: therapistProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDocument(input.id);
        return { success: true };
      }),
  }),

  // ============ ANAMNESIS ROUTER ============
  patientData: router({
    create: therapistProcedure
      .input(z.object({
        patientId: z.number(),
        mainComplaint: z.string().optional(),
        medicalHistory: z.string().optional(),
        familyHistory: z.string().optional(),
        developmentHistory: z.string().optional(),
        currentMedications: z.string().optional(),
        allergies: z.string().optional(),
        previousTherapies: z.string().optional(),
        therapyGoals: z.string().optional(),
        additionalNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createAnamnesis({
          ...input,
          therapistUserId: ctx.user.id,
        });
        return { success: true, id: result[0].insertId };
      }),

    getByPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input, ctx }) => {
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        // Check access rights
        if (ctx.user.role === 'family' && patient.familyUserId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return await db.getAnamnesisForPatient(input.patientId);
      }),

    update: therapistProcedure
      .input(z.object({
        patientId: z.number(),
        mainComplaint: z.string().optional(),
        medicalHistory: z.string().optional(),
        familyHistory: z.string().optional(),
        developmentHistory: z.string().optional(),
        currentMedications: z.string().optional(),
        allergies: z.string().optional(),
        previousTherapies: z.string().optional(),
        therapyGoals: z.string().optional(),
        additionalNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { patientId, ...data } = input;
        await db.updateAnamnesis(patientId, data);
        return { success: true };
      }),
  }),

  // ============ EVOLUTIONS ROUTER (Private - Therapists & Admins Only) ============
  evolutions: router({
    create: therapistProcedure
      .input(z.object({
        appointmentId: z.number(),
        patientId: z.number(),
        sessionDate: z.date(),
        sessionSummary: z.string().min(1),
        patientMood: z.enum(["muito_bem", "bem", "neutro", "ansioso", "irritado", "triste"]).optional(),
        patientBehavior: z.string().optional(),
        goalsAchieved: z.string().optional(),
        nextSessionPlan: z.string().optional(),
        collaborationLevel: z.enum(["full", "partial", "none"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createSessionRecord({
          ...input,
          therapistUserId: ctx.user.id,
        });
        
        // Send collaboration notification to family
        const patient = await db.getPatientById(input.patientId);
        if (patient) {
          const collaborationMessages = {
            full: `${patient.name} colaborou durante toda a sessão de hoje! 🎉`,
            partial: `${patient.name} colaborou durante parte da sessão de hoje.`,
            none: `${patient.name} não colaborou durante a sessão de hoje. A terapeuta está disponível para conversar.`
          };
          
          await db.createNotification({
            userId: patient.familyUserId,
            type: 'attendance',
            title: 'Atualização da Sessão',
            message: collaborationMessages[input.collaborationLevel],
            relatedId: result[0].insertId,
          });
        }
        
        return { success: true, id: result[0].insertId };
      }),

    listByPatient: therapistProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        // Evolutions are private - only therapists and admins can view
        return await db.getSessionRecordsByPatient(input.patientId);
      }),

    update: therapistProcedure
      .input(z.object({
        id: z.number(),
        sessionSummary: z.string().optional(),
        patientMood: z.enum(["muito_bem", "bem", "neutro", "ansioso", "irritado", "triste"]).optional(),
        patientBehavior: z.string().optional(),
        goalsAchieved: z.string().optional(),
        nextSessionPlan: z.string().optional(),
        collaborationLevel: z.enum(["full", "partial", "none"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSessionRecord(id, data);
        return { success: true };
      }),

    getCollaborationHistory: therapistProcedure
      .input(z.object({
        familyUserId: z.number(),
        days: z.number().default(30),
        patientId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        // Only therapists and admins can view collaboration history
        return await db.getCollaborationHistory(input.familyUserId, input.days, input.patientId);
      }),
  }),

  // ============ NOTIFICATIONS ROUTER ============
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getNotificationsByUser(ctx.user.id);
    }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const unread = await db.getUnreadNotificationsByUser(ctx.user.id);
      return { count: unread.length };
    }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),

    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ============ ATTENDANCE ROUTER ============
  attendance: router({
    // Mark attendance (admin/reception only)
    mark: adminProcedure
      .input(z.object({
        appointmentId: z.number(),
        patientId: z.number(),
        familyUserId: z.number(),
        therapistUserId: z.number(),
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "outro"]),
        scheduledDate: z.date(),
        status: z.enum(["present", "absent"]).default("present"),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if attendance already exists for this appointment
        const existing = await db.getAttendanceByAppointment(input.appointmentId);
        
        // Get appointment and patient info for notification
        const appointment = await db.getAppointmentById(input.appointmentId);
        const patient = appointment ? await db.getPatientById(appointment.patientId) : null;
        
        if (existing) {
          // Update existing attendance
          await db.updateAttendance(existing.id, {
            status: input.status,
            notes: input.notes,
            markedByUserId: ctx.user.id,
          });
        } else {
          // Create new attendance
          await db.createAttendance({
            ...input,
            markedByUserId: ctx.user.id,
          });
        }
        
        // Send notification to therapist
        if (appointment && patient) {
          const statusText = input.status === 'present' ? 'presente' : 'ausente';
          await db.createNotification({
            userId: appointment.therapistUserId,
            title: `Presença marcada: ${patient.name}`,
            message: `O paciente ${patient.name} foi marcado como ${statusText} na sessão de hoje.`,
            type: 'attendance',
            isRead: false,
          });
        }
        
        return { success: true, id: existing?.id || 0, updated: !!existing };
      }),

    // Update attendance status
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["present", "absent"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateAttendance(input.id, {
          status: input.status,
          notes: input.notes,
          markedByUserId: ctx.user.id,
        });
        return { success: true };
      }),

    // Get today's appointments for attendance marking (admin)
    todayAppointments: adminProcedure.query(async () => {
      const appointments = await db.getTodayAppointmentsForAttendance();
      
      // Enrich with patient and attendance info
      const enriched = await Promise.all(
        appointments.map(async (apt) => {
          const patient = await db.getPatientById(apt.patientId);
          const existingAttendance = await db.getAttendanceByAppointment(apt.id);
          return {
            ...apt,
            patientName: patient?.name || 'Paciente não encontrado',
            familyUserId: patient?.familyUserId || 0,
            attendance: existingAttendance,
          };
        })
      );
      
      return enriched;
    }),

    // Get attendance by patient (for therapists/admin)
    byPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAttendanceByPatient(input.patientId);
      }),

    // Get attendance for family portal (family sees their children's attendance)
    myFamilyAttendance: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'family') {
        return await db.getAttendanceByFamily(ctx.user.id);
      }
      // Admin can see all
      if (ctx.user.role === 'admin') {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return await db.getAttendanceByDateRange(thirtyDaysAgo, today);
      }
      return [];
    }),

    // Get attendance statistics for family dashboard
    familyStats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'family' && ctx.user.role !== 'admin') {
        return { total: 0, present: 0, absent: 0, attendanceRate: 0 };
      }
      
      const records = ctx.user.role === 'family' 
        ? await db.getAttendanceByFamily(ctx.user.id)
        : await db.getAttendanceByDateRange(
            new Date(new Date().setDate(new Date().getDate() - 90)),
            new Date()
          );
      
      const total = records.length;
      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;
      
      return { total, present, absent, attendanceRate };
    }),

    // Get achievements/badges for gamification
    achievements: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'family' && ctx.user.role !== 'admin') {
        return { badges: [], streak: 0, longestStreak: 0, totalSessions: 0, perfectMonths: 0 };
      }
      
      const records = ctx.user.role === 'family' 
        ? await db.getAttendanceByFamily(ctx.user.id)
        : [];
      
      // Sort records by date (newest first)
      const sortedRecords = [...records].sort(
        (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
      );
      
      // Calculate current streak
      let currentStreak = 0;
      for (const record of sortedRecords) {
        if (record.status === 'present') {
          currentStreak++;
        } else {
          break;
        }
      }
      
      // Calculate longest streak
      let longestStreak = 0;
      let tempStreak = 0;
      const chronologicalRecords = [...records].sort(
        (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      );
      
      for (const record of chronologicalRecords) {
        if (record.status === 'present') {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
      
      // Calculate perfect months (100% attendance in a month)
      const monthlyRecords: Record<string, { present: number; total: number }> = {};
      for (const record of records) {
        const monthKey = new Date(record.scheduledDate).toISOString().slice(0, 7);
        if (!monthlyRecords[monthKey]) {
          monthlyRecords[monthKey] = { present: 0, total: 0 };
        }
        monthlyRecords[monthKey].total++;
        if (record.status === 'present') {
          monthlyRecords[monthKey].present++;
        }
      }
      
      const perfectMonths = Object.values(monthlyRecords).filter(
        m => m.total > 0 && m.present === m.total
      ).length;
      
      const totalSessions = records.filter(
        r => r.status === 'present'
      ).length;
      
      // Define badges
      const badges = [];
      
      // Streak badges
      if (currentStreak >= 5) badges.push({ id: 'streak_5', name: 'Iniciante Dedicado', description: '5 sessões consecutivas', icon: 'flame', tier: 'bronze', unlocked: true });
      if (currentStreak >= 10) badges.push({ id: 'streak_10', name: 'Comprometido', description: '10 sessões consecutivas', icon: 'flame', tier: 'silver', unlocked: true });
      if (currentStreak >= 25) badges.push({ id: 'streak_25', name: 'Super Dedicado', description: '25 sessões consecutivas', icon: 'flame', tier: 'gold', unlocked: true });
      if (currentStreak >= 50) badges.push({ id: 'streak_50', name: 'Campeão da Consistência', description: '50 sessões consecutivas', icon: 'trophy', tier: 'platinum', unlocked: true });
      if (currentStreak >= 100) badges.push({ id: 'streak_100', name: 'Lendário', description: '100 sessões consecutivas', icon: 'crown', tier: 'diamond', unlocked: true });
      
      // Total sessions badges
      if (totalSessions >= 1) badges.push({ id: 'first_session', name: 'Primeiro Passo', description: 'Primeira sessão comparecida', icon: 'star', tier: 'bronze', unlocked: true });
      if (totalSessions >= 10) badges.push({ id: 'sessions_10', name: 'Progresso Constante', description: '10 sessões no total', icon: 'target', tier: 'bronze', unlocked: true });
      if (totalSessions >= 25) badges.push({ id: 'sessions_25', name: 'Evolução Notável', description: '25 sessões no total', icon: 'trending-up', tier: 'silver', unlocked: true });
      if (totalSessions >= 50) badges.push({ id: 'sessions_50', name: 'Marco Importante', description: '50 sessões no total', icon: 'award', tier: 'gold', unlocked: true });
      if (totalSessions >= 100) badges.push({ id: 'sessions_100', name: 'Centenário', description: '100 sessões no total', icon: 'medal', tier: 'platinum', unlocked: true });
      
      // Perfect month badges
      if (perfectMonths >= 1) badges.push({ id: 'perfect_month_1', name: 'Mês Perfeito', description: '1 mês com 100% de presença', icon: 'calendar-check', tier: 'silver', unlocked: true });
      if (perfectMonths >= 3) badges.push({ id: 'perfect_month_3', name: 'Trimestre de Ouro', description: '3 meses perfeitos', icon: 'calendar-check', tier: 'gold', unlocked: true });
      if (perfectMonths >= 6) badges.push({ id: 'perfect_month_6', name: 'Semestre Impecável', description: '6 meses perfeitos', icon: 'calendar-check', tier: 'platinum', unlocked: true });
      if (perfectMonths >= 12) badges.push({ id: 'perfect_month_12', name: 'Ano de Excelência', description: '12 meses perfeitos', icon: 'calendar-check', tier: 'diamond', unlocked: true });
      
      // Locked badges (show what can be achieved)
      const lockedBadges = [];
      if (currentStreak < 5) lockedBadges.push({ id: 'streak_5', name: 'Iniciante Dedicado', description: '5 sessões consecutivas', icon: 'flame', tier: 'bronze', unlocked: false, progress: currentStreak, target: 5 });
      else if (currentStreak < 10) lockedBadges.push({ id: 'streak_10', name: 'Comprometido', description: '10 sessões consecutivas', icon: 'flame', tier: 'silver', unlocked: false, progress: currentStreak, target: 10 });
      else if (currentStreak < 25) lockedBadges.push({ id: 'streak_25', name: 'Super Dedicado', description: '25 sessões consecutivas', icon: 'flame', tier: 'gold', unlocked: false, progress: currentStreak, target: 25 });
      else if (currentStreak < 50) lockedBadges.push({ id: 'streak_50', name: 'Campeão da Consistência', description: '50 sessões consecutivas', icon: 'trophy', tier: 'platinum', unlocked: false, progress: currentStreak, target: 50 });
      else if (currentStreak < 100) lockedBadges.push({ id: 'streak_100', name: 'Lendário', description: '100 sessões consecutivas', icon: 'crown', tier: 'diamond', unlocked: false, progress: currentStreak, target: 100 });
      
      if (totalSessions < 10) lockedBadges.push({ id: 'sessions_10', name: 'Progresso Constante', description: '10 sessões no total', icon: 'target', tier: 'bronze', unlocked: false, progress: totalSessions, target: 10 });
      else if (totalSessions < 25) lockedBadges.push({ id: 'sessions_25', name: 'Evolução Notável', description: '25 sessões no total', icon: 'trending-up', tier: 'silver', unlocked: false, progress: totalSessions, target: 25 });
      else if (totalSessions < 50) lockedBadges.push({ id: 'sessions_50', name: 'Marco Importante', description: '50 sessões no total', icon: 'award', tier: 'gold', unlocked: false, progress: totalSessions, target: 50 });
      else if (totalSessions < 100) lockedBadges.push({ id: 'sessions_100', name: 'Centenário', description: '100 sessões no total', icon: 'medal', tier: 'platinum', unlocked: false, progress: totalSessions, target: 100 });
      
      return { 
        badges: [...badges, ...lockedBadges],
        streak: currentStreak, 
        longestStreak, 
        totalSessions, 
        perfectMonths 
      };
    }),

    // Generate frequency report PDF
    generateReport: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { generateFrequencyReportPDF } = await import('./generateFrequencyReport');
        
        // Get patient info
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Paciente não encontrado' });
        }
        
        // Check permissions
        if (ctx.user.role === 'family' && patient.familyUserId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        // Get attendance records for the specified month
        const startDate = new Date(input.year, input.month - 1, 1);
        const endDate = new Date(input.year, input.month, 0, 23, 59, 59);
        
        const allRecords = await db.getAttendanceByDateRange(startDate, endDate);
        const records = allRecords.filter(r => r.patientId === input.patientId);
        
        const totalSessions = records.length;
        const presentSessions = records.filter(r => r.status === 'present').length;
        const absentSessions = records.filter(r => r.status === 'absent').length;
        const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0;
        
        // Generate PDF
        const pdfBuffer = await generateFrequencyReportPDF({
          patientName: patient.name,
          month: input.month,
          year: input.year,
          totalSessions,
          presentSessions,
          absentSessions,
          attendanceRate,
          records: records.map(r => ({
            id: r.id,
            date: new Date(r.scheduledDate),
            status: r.status,
            therapyType: r.therapyType,
          })),
        });
        
        // Upload to S3
        const fileName = `relatorio-frequencia-${patient.name.replace(/\s+/g, '-')}-${input.month}-${input.year}.pdf`;
        const { url } = await storagePut(
          `reports/${input.patientId}/${fileName}`,
          pdfBuffer,
          'application/pdf'
        );
        
        return { success: true, url };
      }),
  }),

  // ============ ADMIN ROUTER ============
  admin: router({
    listUsers: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    
    createUser: adminProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().email(),
        role: z.enum(['family', 'therapist', 'admin']),
      }))
      .mutation(async ({ input }) => {
        // Generate temporary password
        const { generateTemporaryPassword } = await import('./auth-helpers');
        const tempPassword = generateTemporaryPassword();
        
        const result = await db.createUser({
          ...input,
          password: tempPassword,
        });
        
        return { 
          success: true, 
          id: result[0].insertId,
          temporaryPassword: tempPassword,
        };
      }),
    
    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['family', 'therapist', 'admin']),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    
    deleteUser: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteUser(input.userId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
