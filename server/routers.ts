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

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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
      if (ctx.user.role === 'therapist' || ctx.user.role === 'admin') {
        return await db.getPatientsByTherapist(ctx.user.id);
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
        diagnosis: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePatient(id, data);
        return { success: true };
      }),
  }),

  // ============ APPOINTMENT ROUTER ============
  appointments: router({
    create: therapistProcedure
      .input(z.object({
        patientId: z.number(),
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "outro"]),
        startTime: z.date(),
        endTime: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
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
        if (ctx.user.role === 'therapist' || ctx.user.role === 'admin') {
          return await db.getAppointmentsByTherapist(ctx.user.id, input.startDate, input.endDate);
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
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "outro"]).optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
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
  anamnesis: router({
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
        
        return await db.getAnamnesisByPatient(input.patientId);
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

  // ============ SESSION RECORDS ROUTER ============
  sessionRecords: router({
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
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createSessionRecord({
          ...input,
          therapistUserId: ctx.user.id,
        });
        
        // Create notification for family
        const patient = await db.getPatientById(input.patientId);
        if (patient) {
          await db.createNotification({
            userId: patient.familyUserId,
            type: 'new_session_record',
            title: 'Novo registro de sessão',
            message: `Um novo registro de sessão foi adicionado para ${patient.name}`,
            relatedId: result[0].insertId,
          });
          
          // Send email notification
          const familyUser = await db.getUserById(patient.familyUserId);
          if (familyUser?.email) {
            sendNewSessionRecordEmail(
              familyUser.email,
              patient.name,
              input.sessionDate
            ).catch(err => console.error('[Email] Failed to send new session record email:', err));
          }
        }
        
        return { success: true, id: result[0].insertId };
      }),

    listByPatient: protectedProcedure
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
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSessionRecord(id, data);
        return { success: true };
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
});

export type AppRouter = typeof appRouter;
