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
        imageAuthorization: z.boolean().default(false),
        therapistUserId: z.number().optional(),
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "aplicadora_denver_aba", "outro"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Admin pode especificar um terapeuta; terapeuta usa a si mesmo
        const resolvedTherapistId = ctx.user.role === 'admin'
          ? (input.therapistUserId ?? null)
          : ctx.user.id;

        const { therapistUserId: _t, therapyType, ...patientData } = input;
        const result = await db.createPatient({
          ...patientData,
          therapistUserId: resolvedTherapistId,
        });
        const patientId = result[0].insertId;

        // Criar vínculo na tabela de assignments se terapeuta e tipo de terapia foram informados
        if (resolvedTherapistId && therapyType) {
          await db.createPatientTherapistAssignment({
            patientId,
            therapistUserId: resolvedTherapistId,
            therapyType,
            isActive: true,
          });
        }

        return { success: true, id: patientId };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'admin') {
        return await db.getAllPatients();
      } else if (ctx.user.role === 'therapist') {
        // Terapeutas veem apenas pacientes vinculados a eles
        return await db.getTherapistPatients(ctx.user.id);
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
        if (ctx.user.role === 'therapist') {
          // Check if therapist has assignment with this patient
          const assignments = await db.getPatientTherapistAssignments(input.id);
          const hasAssignment = assignments.some((a: any) => a.therapistUserId === ctx.user.id);
          if (!hasAssignment) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão para acessar este paciente' });
          }
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
        imageAuthorization: z.boolean().optional(),
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

    listAll: adminProcedure.query(async () => {
      return await db.getAllPatients();
    }),

    bulkDelete: adminProcedure
      .input(z.object({ patientIds: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        if (input.patientIds.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nenhum paciente selecionado' });
        }
        
        // Remover dados relacionados e pacientes
        for (const patientId of input.patientIds) {
          await db.deletePatient(patientId);
        }
        
        return { success: true, deletedCount: input.patientIds.length };
      }),

    // Patient-Therapist Assignments
    createAssignment: therapistProcedure
      .input(z.object({
        patientId: z.number(),
        therapistUserId: z.number(),
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "aplicadora_denver_aba", "outro"]),
      }))
      .mutation(async ({ input }) => {
        await db.createPatientTherapistAssignment(input);
        return { success: true };
      }),

    getAssignments: therapistProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPatientTherapistAssignments(input.patientId);
      }),

    getMyPatients: therapistProcedure
      .query(async ({ ctx }) => {
        return await db.getTherapistPatients(ctx.user.id);
      }),

    deleteAssignment: therapistProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePatientTherapistAssignment(input.id);
        return { success: true };
      }),
  }),

  // ============ APPOINTMENT ROUTER ============
  appointments: router({
    create: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        therapistUserId: z.number().optional(), // Admin can specify therapist, therapist defaults to self
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "aplicadora_denver_aba", "outro"]),
        startTime: z.date(),
        endTime: z.date(),
        notes: z.string().optional(),
        replicateWeekly: z.boolean().optional(), // Admin only: replicate weekly for 30 days
      }))
      .mutation(async ({ input, ctx }) => {
        try {
          // Determine therapist: admin can specify, therapist uses self, family not allowed
          if (ctx.user.role === 'family') {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Famílias não podem criar agendamentos diretamente' });
          }
          const therapistUserId = input.therapistUserId || ctx.user.id;

          // Generate seriesId if replicating weekly
          const seriesId = (input.replicateWeekly && ctx.user.role === 'admin') 
            ? `series-${Date.now()}-${Math.random().toString(36).substring(7)}`
            : undefined;
          
          // Create the first appointment
          const result = await db.createAppointment({
            ...input,
            therapistUserId,
            status: 'scheduled',
            seriesId,
          });
          const firstId = result[0].insertId;
          
          // Fetch patient data (needed for notifications)
          const patient = await db.getPatientById(input.patientId);

          // --- Build notification tasks for the first appointment ---
          const firstNotifTasks: Promise<unknown>[] = [];
          if (patient?.familyUserId) {
            firstNotifTasks.push(
              db.createNotification({
                userId: patient.familyUserId,
                type: 'schedule_change',
                title: 'Nova sessão agendada',
                message: `Uma nova sessão de ${input.therapyType} foi agendada para ${input.startTime.toLocaleDateString('pt-BR')}`,
                relatedId: firstId,
              }).catch(err => console.error('[Notif] family notif failed:', err))
            );
          }
          if (therapistUserId !== ctx.user.id) {
            firstNotifTasks.push(
              db.createNotification({
                userId: therapistUserId,
                type: 'schedule_change',
                title: 'Nova sessão agendada',
                message: `Uma nova sessão de ${input.therapyType} foi agendada com ${patient?.name || 'paciente'} em ${input.startTime.toLocaleDateString('pt-BR')} às ${input.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                relatedId: firstId,
              }).catch(err => console.error('[Notif] therapist notif failed:', err))
            );
          }
          // Fire-and-forget email (never blocks the HTTP response)
          if (patient?.familyUserId) {
            setImmediate(() => {
              db.getUserById(patient.familyUserId)
                .then(familyUser => {
                  if (familyUser?.email) {
                    sendScheduleChangeEmail(
                      familyUser.email,
                      patient.name,
                      input.therapyType,
                      input.startTime
                    ).catch(err => console.error('[Email] schedule change email failed:', err));
                  }
                })
                .catch(err => console.error('[Email] getUserById failed:', err));
            });
          }

          // --- Replicate weekly if requested (admin only) ---
          const createdIds = [firstId];
          
          if (input.replicateWeekly && ctx.user.role === 'admin') {
            const currentDate = new Date(input.startTime);
            const durationMs = input.endTime.getTime() - input.startTime.getTime();

            // Build all 4 weekly appointments data
            const weeksData = Array.from({ length: 4 }, (_, i) => {
              const week = i + 1;
              const newStartTime = new Date(currentDate);
              newStartTime.setDate(currentDate.getDate() + week * 7);
              const newEndTime = new Date(newStartTime.getTime() + durationMs);
              return {
                patientId: input.patientId,
                therapistUserId,
                therapyType: input.therapyType,
                startTime: newStartTime,
                endTime: newEndTime,
                notes: input.notes,
                status: 'scheduled' as const,
                seriesId,
              };
            });

            // Create all 4 appointments in parallel
            const weekResults = await Promise.all(
              weeksData.map(apt => db.createAppointment(apt))
            );
            const weekIds = weekResults.map(r => r[0].insertId);
            createdIds.push(...weekIds);

            // Fire-and-forget all notifications for replicated appointments
            setImmediate(() => {
              const notifTasks: Promise<unknown>[] = [];
              weekIds.forEach((weekId, idx) => {
                const apt = weeksData[idx];
                if (patient?.familyUserId) {
                  notifTasks.push(
                    db.createNotification({
                      userId: patient.familyUserId,
                      type: 'schedule_change',
                      title: 'Nova sessão agendada',
                      message: `Uma nova sessão de ${apt.therapyType} foi agendada para ${apt.startTime.toLocaleDateString('pt-BR')}`,
                      relatedId: weekId,
                    }).catch(err => console.error('[Notif] replicated family notif failed:', err))
                  );
                }
                if (therapistUserId !== ctx.user.id) {
                  notifTasks.push(
                    db.createNotification({
                      userId: therapistUserId,
                      type: 'schedule_change',
                      title: 'Nova sessão agendada',
                      message: `Uma nova sessão de ${apt.therapyType} foi agendada com ${patient?.name || 'paciente'} em ${apt.startTime.toLocaleDateString('pt-BR')} às ${apt.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                      relatedId: weekId,
                    }).catch(err => console.error('[Notif] replicated therapist notif failed:', err))
                  );
                }
              });
              Promise.allSettled(notifTasks).catch(err => console.error('[Notif] batch failed:', err));
            });
          }

          // Wait for first-appointment notifications before responding
          await Promise.allSettled(firstNotifTasks);
          
          return { 
            success: true, 
            id: firstId,
            replicatedCount: createdIds.length - 1,
            totalCreated: createdIds.length,
          };
        } catch (err) {
          if (err instanceof TRPCError) throw err;
          console.error('[appointments.create] Unexpected error:', err);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao criar agendamento. Tente novamente.' });
        }
      }),

    listByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        patientId: z.number().optional(),
        showAllPatients: z.boolean().optional(), // Para terapeutas escolherem ver todos ou apenas seus pacientes
      }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role === 'admin') {
          return await db.getAppointmentsByDateRange(input.startDate, input.endDate);
        } else if (ctx.user.role === 'therapist') {
          // Terapeutas podem escolher ver todos ou apenas seus agendamentos
          if (input.showAllPatients) {
            return await db.getAppointmentsByDateRange(input.startDate, input.endDate);
          } else {
            // Busca agendamentos onde o terapeuta é principal OU co-terapeuta
            return await db.getAppointmentsByDateRange(input.startDate, input.endDate, ctx.user.id, 'therapist');
          }
        } else {
          // For families, get appointments for their patients
          const patients = await db.getPatientsByFamily(ctx.user.id);
          const patientIds = patients.map(p => p.id);
          const allAppointments = await db.getAppointmentsByDateRange(input.startDate, input.endDate);
          return allAppointments.filter(apt => patientIds.includes(apt.patientId));
        }
      }),

    listByPatient: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        todayOnly: z.boolean().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const allApts = await db.getAppointmentsByPatient(input.patientId);
        let filtered = allApts;

        // If therapist (not admin), filter to only their appointments
        if (ctx.user.role === 'therapist') {
          filtered = filtered.filter((apt) => apt.therapistUserId === ctx.user.id);
        }

        // If todayOnly, filter to today's appointments in BRT timezone (America/Sao_Paulo)
        // IMPORTANT: Use BRT timezone to avoid day-boundary bugs (server runs in UTC)
        if (input.todayOnly) {
          const BRT = 'America/Sao_Paulo';
          const nowBRT = new Date().toLocaleString('en-US', { timeZone: BRT });
          const todayBRT = new Date(nowBRT);
          const todayDateStr = `${todayBRT.getFullYear()}-${String(todayBRT.getMonth() + 1).padStart(2, '0')}-${String(todayBRT.getDate()).padStart(2, '0')}`;
          filtered = filtered.filter((apt) => {
            const aptBRT = new Date(apt.startTime).toLocaleString('en-US', { timeZone: BRT });
            const aptDateBRT = new Date(aptBRT);
            const aptDateStr = `${aptDateBRT.getFullYear()}-${String(aptDateBRT.getMonth() + 1).padStart(2, '0')}-${String(aptDateBRT.getDate()).padStart(2, '0')}`;
            return aptDateStr === todayDateStr &&
              (apt.status === 'scheduled' || apt.status === 'completed' || apt.status === 'cancelled');
          });
        }

        return filtered;
      }),

    update: therapistProcedure
      .input(z.object({
        id: z.number(),
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "aplicadora_denver_aba", "outro"]).optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
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

    updateSeries: therapistProcedure
      .input(z.object({
        seriesId: z.string(),
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "aplicadora_denver_aba", "outro"]).optional(),
        notes: z.string().optional(),
        status: z.enum(["scheduled", "completed", "cancelled", "rescheduled"]).optional(),
        // New time: when provided, shift ALL appointments in the series to this time-of-day
        startTime: z.date().optional(),
        endTime: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { seriesId, startTime: newStart, endTime: newEnd, ...rest } = input;
        
        // Get all appointments in the series
        const seriesAppointments = await db.getAppointmentsBySeries(seriesId);
        
        if (seriesAppointments.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Série de agendamentos não encontrada',
          });
        }
        
        // Update all appointments in the series
        for (const appointment of seriesAppointments) {
          const updates: Record<string, any> = { ...rest };

          // If new times provided, keep the same calendar date but apply the new time-of-day
          if (newStart) {
            const apptDate = new Date(appointment.startTime);
            const shifted = new Date(apptDate);
            shifted.setUTCHours(newStart.getUTCHours(), newStart.getUTCMinutes(), 0, 0);
            updates.startTime = shifted;
          }
          if (newEnd) {
            const apptDate = new Date(appointment.endTime);
            const shifted = new Date(apptDate);
            shifted.setUTCHours(newEnd.getUTCHours(), newEnd.getUTCMinutes(), 0, 0);
            updates.endTime = shifted;
          }

          await db.updateAppointment(appointment.id, updates);
        }
        
        return { success: true, updatedCount: seriesAppointments.length };
      }),

    cancelSeries: therapistProcedure
      .input(z.object({ seriesId: z.string() }))
      .mutation(async ({ input, ctx }) => {
        // Get all appointments in the series
        const seriesAppointments = await db.getAppointmentsBySeries(input.seriesId);
        
        if (seriesAppointments.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Série de agendamentos não encontrada',
          });
        }
        
        // Cancel all appointments in the series
        for (const appointment of seriesAppointments) {
          await db.updateAppointment(appointment.id, { status: 'cancelled' });
          
          // Notify family about cancellation
          const patient = await db.getPatientById(appointment.patientId);
          if (patient) {
            await db.createNotification({
              userId: patient.familyUserId,
              type: 'schedule_change',
              title: 'Sessão cancelada',
              message: `A sessão de ${appointment.therapyType} agendada para ${appointment.startTime.toLocaleDateString('pt-BR')} foi cancelada`,
              relatedId: appointment.id,
            });
          }
        }
        
        return { success: true, cancelledCount: seriesAppointments.length };
      }),

    // ---- Dual session (atendimento em dupla - dois pacientes) ----
    createDual: therapistProcedure
      .input(z.object({
        // First patient appointment data
        patientId: z.number(),
        therapistUserId: z.number().optional(),
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "aplicadora_denver_aba", "outro"]),
        startTime: z.date(),
        endTime: z.date(),
        notes: z.string().optional(),
        // Second patient
        secondPatientId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const therapistUserId = input.therapistUserId || ctx.user.id;
        const { secondPatientId, ...baseData } = input;

        // Create first appointment (isDualSession=true)
        const result1 = await db.createAppointment({
          ...baseData,
          therapistUserId,
          status: 'scheduled',
          isDualSession: true,
        } as any);
        const appointmentId1 = result1[0].insertId;

        // Create second appointment with same data but different patient
        const result2 = await db.createAppointment({
          patientId: secondPatientId,
          therapistUserId,
          therapyType: baseData.therapyType,
          startTime: baseData.startTime,
          endTime: baseData.endTime,
          notes: baseData.notes,
          status: 'scheduled',
          isDualSession: true,
        } as any);
        const appointmentId2 = result2[0].insertId;

        // Link the two appointments as a dual session
        await db.createDualSessionLink(appointmentId1, appointmentId2);

        // Notify families of both patients
        const [patient1, patient2] = await Promise.all([
          db.getPatientById(input.patientId),
          db.getPatientById(secondPatientId),
        ]);

        const brtDate = new Date(input.startTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const dateStr = brtDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = brtDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const therapyLabel = input.therapyType.charAt(0).toUpperCase() + input.therapyType.slice(1);

        if (patient1) {
          await db.createNotification({
            userId: patient1.familyUserId,
            type: 'schedule_change',
            title: 'Nova sessão agendada',
            message: `Uma nova sessão de ${therapyLabel} foi agendada para ${patient1.name} — ${dateStr} às ${timeStr}.`,
            relatedId: appointmentId1,
          });
        }
        if (patient2) {
          await db.createNotification({
            userId: patient2.familyUserId,
            type: 'schedule_change',
            title: 'Nova sessão agendada',
            message: `Uma nova sessão de ${therapyLabel} foi agendada para ${patient2.name} — ${dateStr} às ${timeStr}.`,
            relatedId: appointmentId2,
          });
        }

        // Notify therapist if someone else created
        if (therapistUserId !== ctx.user.id) {
          await db.createNotification({
            userId: therapistUserId,
            type: 'schedule_change',
            title: 'Nova sessão em dupla agendada',
            message: `Sessão em dupla de ${therapyLabel} com ${patient1?.name || 'paciente'} e ${patient2?.name || 'paciente'} — ${dateStr} às ${timeStr}.`,
            relatedId: appointmentId1,
          });
        }

        return { success: true, appointmentId1, appointmentId2 };
      }),

    getDualPartner: protectedProcedure
      .input(z.object({ appointmentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDualPartner(input.appointmentId);
      }),

    // ---- Co-therapists (atendimento em conjunto) ----
    getCoTherapists: protectedProcedure
      .input(z.object({ appointmentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCoTherapistsByAppointment(input.appointmentId);
      }),

    syncCoTherapists: therapistProcedure
      .input(z.object({
        appointmentId: z.number(),
        therapistUserIds: z.array(z.number()),
        isJointSession: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        // Update isJointSession flag on the appointment
        await db.updateAppointment(input.appointmentId, { isJointSession: input.isJointSession } as any);
        
        // Get existing co-therapists BEFORE syncing to detect removals
        const existingCoTherapists = await db.getCoTherapistsByAppointment(input.appointmentId);
        const existingIds = new Set(existingCoTherapists.map((ct: any) => ct.therapistUserId));
        const newIds = new Set(input.therapistUserIds);
        
        // Sync co-therapists list
        await db.syncCoTherapists(input.appointmentId, input.therapistUserIds);
        
        // Notify each co-therapist about the appointment
        const appointment = await db.getAppointmentById(input.appointmentId);
        if (appointment) {
          const patient = await db.getPatientById(appointment.patientId);
          
          // Format date/time in Brasilia timezone
          const brtDate = new Date(appointment.startTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
          const dateStr = brtDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
          const timeStr = brtDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const therapyLabel = appointment.therapyType.charAt(0).toUpperCase() + appointment.therapyType.slice(1);
          const patientName = patient?.name || 'paciente';
          
          // Notify newly added co-therapists
          const addedIds = input.therapistUserIds.filter(tid => !existingIds.has(tid));
          for (const tid of addedIds) {
            await db.createNotification({
              userId: tid,
              type: 'schedule_change',
              title: '🤝 Atendimento em Conjunto',
              message: `Você foi adicionada como co-terapeuta na sessão de ${therapyLabel} com ${patientName} — ${dateStr} às ${timeStr}.`,
              relatedId: input.appointmentId,
            });
          }
          
          // Notify removed co-therapists
          const removedIds = Array.from(existingIds).filter(tid => !newIds.has(tid as number)) as number[];
          for (const tid of removedIds) {
            await db.createNotification({
              userId: tid,
              type: 'schedule_change',
              title: '❌ Removida do Atendimento em Conjunto',
              message: `Você foi removida do atendimento em conjunto de ${therapyLabel} com ${patientName} — ${dateStr} às ${timeStr}.`,
              relatedId: input.appointmentId,
            });
          }
        }
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
        appointmentId: z.number().optional(), // Optional: backend auto-matches if not provided
        patientId: z.number(),
        sessionDate: z.date(),
        sessionSummary: z.string().optional().default(""),
        patientMood: z.enum(["muito_bem", "bem", "neutro", "ansioso", "irritado", "triste"]).optional(),
        patientBehavior: z.string().optional(),
        goalsAchieved: z.string().optional(),
        nextSessionPlan: z.string().optional(),
        collaborationLevel: z.enum(["full", "partial", "none"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const BRT = 'America/Sao_Paulo';
        
        // Resolve appointmentId: use provided value, or auto-match from today's appointments
        let resolvedAppointmentId = input.appointmentId && input.appointmentId > 0 ? input.appointmentId : 0;
        
        if (!resolvedAppointmentId) {
          // Auto-match: find a scheduled appointment for this patient on the session date (using BRT)
          const allApts = await db.getAppointmentsByPatient(input.patientId);
          const sessionDateBRT = input.sessionDate.toLocaleString('en-US', { timeZone: BRT });
          const sessionDateObj = new Date(sessionDateBRT);
          const sessionDateStr = `${sessionDateObj.getFullYear()}-${String(sessionDateObj.getMonth() + 1).padStart(2, '0')}-${String(sessionDateObj.getDate()).padStart(2, '0')}`;
          
          // Filter to therapist's own appointments
          const therapistApts = allApts.filter((apt: any) => apt.therapistUserId === ctx.user.id);
          
          const matchingApt = therapistApts.find((apt: any) => {
            const aptBRT = new Date(apt.startTime).toLocaleString('en-US', { timeZone: BRT });
            const aptDateObj = new Date(aptBRT);
            const aptDateStr = `${aptDateObj.getFullYear()}-${String(aptDateObj.getMonth() + 1).padStart(2, '0')}-${String(aptDateObj.getDate()).padStart(2, '0')}`;
            return aptDateStr === sessionDateStr && apt.status === 'scheduled';
          });
          
          if (matchingApt) {
            resolvedAppointmentId = matchingApt.id;
          } else {
            // Last resort: use any appointment (scheduled or completed) on that day
            const anyApt = therapistApts.find((apt: any) => {
              const aptBRT = new Date(apt.startTime).toLocaleString('en-US', { timeZone: BRT });
              const aptDateObj = new Date(aptBRT);
              const aptDateStr = `${aptDateObj.getFullYear()}-${String(aptDateObj.getMonth() + 1).padStart(2, '0')}-${String(aptDateObj.getDate()).padStart(2, '0')}`;
              return aptDateStr === sessionDateStr;
            });
            if (anyApt) resolvedAppointmentId = anyApt.id;
          }
        }
        
        // If still no appointment found, throw a clear error
        if (!resolvedAppointmentId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nenhum agendamento encontrado para este paciente nesta data. Verifique a agenda.',
          });
        }
        
        const result = await db.createSessionRecord({
          ...input,
          appointmentId: resolvedAppointmentId,
          therapistUserId: ctx.user.id,
        });
        
        // Update appointment status to completed
        await db.updateAppointmentStatus(resolvedAppointmentId, 'completed');
        
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
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Only the therapist who created the evolution or admins can edit it
        const evolution = await db.getSessionRecordById(id);
        if (!evolution) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evolução não encontrada' });
        }
        
        if (ctx.user.role !== 'admin' && evolution.therapistUserId !== ctx.user.id) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Apenas a terapeuta que criou esta evolução pode editá-la' 
          });
        }
        
        await db.updateSessionRecord(id, data);
        
        // Check if evolution is now complete and mark notifications as read
        const updatedEvolution = await db.getSessionRecordById(id);
        if (updatedEvolution && db.isEvolutionComplete(updatedEvolution)) {
          await db.markEvolutionNotificationsAsRead(id);
        }
        
        return { 
          success: true,
          isComplete: updatedEvolution ? db.isEvolutionComplete(updatedEvolution) : false 
        };
      }),

    getCollaborationHistory: protectedProcedure
      .input(z.object({
        days: z.number().default(30),
        patientId: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const allHistory: any[] = [];
        
        if (ctx.user.role === 'admin') {
          // Admins see all patients
          const allPatients = await db.getAllPatients();
          for (const patient of allPatients) {
            const patientHistory = await db.getCollaborationHistoryByPatient(patient.id, input.days);
            allHistory.push(...patientHistory);
          }
        } else if (ctx.user.role === 'therapist') {
          // Therapists see only their assigned patients
          const therapistPatients = await db.getPatientsByTherapist(ctx.user.id);
          for (const patient of therapistPatients) {
            const patientHistory = await db.getCollaborationHistoryByPatient(patient.id, input.days);
            allHistory.push(...patientHistory);
          }
        } else if (ctx.user.role === 'family') {
          // Families see only their children
          const familyPatients = await db.getPatientsByFamily(ctx.user.id);
          for (const patient of familyPatients) {
            const patientHistory = await db.getCollaborationHistoryByPatient(patient.id, input.days);
            allHistory.push(...patientHistory);
          }
        }
        
        // Filter by patientId if specified
        if (input.patientId) {
          return allHistory.filter(h => h.patientId === input.patientId);
        }
        
        // Sort by date descending
        return allHistory.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
      }),

    // ENDPOINT REMOVIDO: Evoluções clínicas NUNCA podem ser deletadas (requisito legal)
    // delete: adminProcedure
    //   .input(z.object({ id: z.number() }))
    //   .mutation(async ({ input }) => {
    //     // Only admins can delete evolutions
    //     await db.deleteSessionRecord(input.id);
    //     return { success: true };
    //   }),
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

    // Get incomplete evolutions for therapist
    getIncompleteEvolutions: therapistProcedure.query(async ({ ctx }) => {
      const incompleteEvos = await db.getIncompleteEvolutionsByTherapist(ctx.user.id);
      
      // Get patient names for each evolution
      const evosWithPatients = await Promise.all(
        incompleteEvos.map(async (evo) => {
          const patient = await db.getPatientById(evo.patientId);
          return {
            ...evo,
            patientName: patient?.name || 'Paciente Desconhecido',
          };
        })
      );
      
      return evosWithPatients;
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
        therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "aplicadora_denver_aba", "outro"]),
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

    // Get month's appointments for attendance marking (admin)
    monthAppointments: adminProcedure
      .input(z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020).max(2030),
      }))
      .query(async ({ input }) => {
      const appointments = await db.getMonthAppointmentsForAttendance(input.month, input.year);
      
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
      
      // Sort alphabetically by patient name
      enriched.sort((a, b) => a.patientName.localeCompare(b.patientName, 'pt-BR'));
      
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
        specialties: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        // Generate temporary password
        const { generateTemporaryPassword } = await import('./auth-helpers');
        const tempPassword = generateTemporaryPassword();
        
        const result = await db.createUser({
          ...input,
          password: tempPassword,
        });
        
        const userId = result[0].insertId;
        
        // Save specialties if provided
        if (input.specialties && input.specialties.length > 0) {
          await db.updateUserSpecialties(userId, input.specialties);
        }
        
        return { 
          success: true, 
          id: userId,
          temporaryPassword: tempPassword,
        };
      }),

    // Cria usuário família + múltiplos pacientes vinculados de forma atômica
    createUserWithPatient: adminProcedure
      .input(z.object({
        // Dados do responsável
        name: z.string().min(1),
        email: z.string().email(),
        // Lista de filhos (opcional, múltiplos)
        patients: z.array(z.object({
          name: z.string().min(1),
          dateOfBirth: z.date().optional(),
          diagnosis: z.string().optional(),
          notes: z.string().optional(),
          imageAuthorization: z.boolean().default(false),
          // Vínculo terapêutico opcional
          therapyType: z.enum(["fonoaudiologia", "psicologia", "terapia_ocupacional", "psicopedagogia", "musicoterapia", "fisioterapia", "neuropsicopedagogia", "nutricao", "psicomotricidade", "aplicadora_denver_aba", "outro"]).optional(),
          therapistUserId: z.number().int().positive().optional(),
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        // Validar email duplicado antes de criar
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Já existe um usuário cadastrado com este email.',
          });
        }

        const { generateTemporaryPassword } = await import('./auth-helpers');
        const tempPassword = generateTemporaryPassword();

        // Criar usuário família
        const userResult = await db.createUser({
          name: input.name,
          email: input.email,
          role: 'family',
          password: tempPassword,
        });
        const userId = userResult[0].insertId;

        const patientIds: number[] = [];
        const assignmentCount = { created: 0 };

        // Criar todos os pacientes vinculados
        if (input.patients && input.patients.length > 0) {
          for (const patient of input.patients) {
            const patientResult = await db.createPatient({
              name: patient.name,
              dateOfBirth: patient.dateOfBirth,
              diagnosis: patient.diagnosis,
              notes: patient.notes,
              imageAuthorization: patient.imageAuthorization ?? false,
              familyUserId: userId,
              // Salvar terapeuta principal no campo do paciente se informado
              therapistUserId: patient.therapistUserId ?? null,
            });
            const patientId = patientResult[0].insertId;
            patientIds.push(patientId);

            // Criar vínculo na tabela patient_therapist_assignments se terapia E terapeuta informados
            if (patient.therapyType && patient.therapistUserId) {
              try {
                await db.createPatientTherapistAssignment({
                  patientId,
                  therapistUserId: patient.therapistUserId,
                  therapyType: patient.therapyType,
                  isActive: true,
                });
                assignmentCount.created++;
              } catch (err) {
                // Não bloquear o cadastro se o vínculo falhar
                console.error('[createUserWithPatient] Erro ao criar vínculo terapêutico:', err);
              }
            }
          }
        }

        return {
          success: true,
          id: userId,
          temporaryPassword: tempPassword,
          patientIds,
          patientCount: patientIds.length,
          assignmentCount: assignmentCount.created,
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

    exportBackup: adminProcedure.query(async () => {
      return await db.exportFullBackup();
    }),

    bulkDeleteUsers: adminProcedure
      .input(z.object({
        userIds: z.array(z.number()).min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // Prevent deleting yourself
        if (input.userIds.includes(ctx.user.id)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Você não pode excluir sua própria conta.',
          });
        }

        // Prevent deleting all admins — ensure at least one admin remains
        const allUsers = await db.getAllUsers();
        const remainingAdmins = allUsers.filter(
          (u) => u.role === 'admin' && !input.userIds.includes(u.id)
        );
        if (remainingAdmins.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Não é possível excluir todos os administradores. Pelo menos um administrador deve permanecer.',
          });
        }

        for (const userId of input.userIds) {
          await db.deleteUser(userId);
        }
        return { success: true, deleted: input.userIds.length };
      }),
  }),

  // Analytics - Análise de Atendimentos
  analytics: router({
    atendimentosMensal: adminProcedure
      .input(z.object({
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2026),
      }))
      .query(async ({ input }) => {
        const { month, year } = input;
        const { eq, and, gte, lte, asc } = await import("drizzle-orm");
        const { evolutions: evolutionsTable, users: usersTable, patients: patientsTable, appointments: appointmentsTable } = await import("../drizzle/schema");
        
        // Calcular início e fim do mês em UTC
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        // Buscar todas as evoluções do mês com join em pacientes e terapeutas
        const dbConn = await db.getDb();
        if (!dbConn) return { records: [], totalCount: 0 };

        const records = await dbConn
          .select({
            id: evolutionsTable.id,
            appointmentId: evolutionsTable.appointmentId,
            patientId: evolutionsTable.patientId,
            therapistUserId: evolutionsTable.therapistUserId,
            sessionDate: evolutionsTable.sessionDate,
            appointmentStartTime: appointmentsTable.startTime,
            therapyType: appointmentsTable.therapyType,
            therapistName: usersTable.name,
            patientName: patientsTable.name,
          })
          .from(evolutionsTable)
          .leftJoin(usersTable, eq(evolutionsTable.therapistUserId, usersTable.id))
          .leftJoin(patientsTable, eq(evolutionsTable.patientId, patientsTable.id))
          .leftJoin(appointmentsTable, eq(evolutionsTable.appointmentId, appointmentsTable.id))
          .where(
            and(
              gte(evolutionsTable.sessionDate, startDate),
              lte(evolutionsTable.sessionDate, endDate)
            )
          )
          .orderBy(asc(evolutionsTable.sessionDate));

        // Filtrar apenas registros com dados reais (terapeuta e paciente existentes)
        const formattedRecords = records
          .filter(r => r.therapistName && r.patientName)
          .map(r => ({
            id: r.id,
            appointmentId: r.appointmentId,
            patientId: r.patientId,
            therapistUserId: r.therapistUserId,
            // Usar startTime do agendamento como horário real; fallback para sessionDate
            sessionDate: r.appointmentStartTime ?? r.sessionDate,
            therapyType: r.therapyType ?? "outro",
            therapistName: r.therapistName!,
            patientName: r.patientName!,
          }));

        return {
          records: formattedRecords,
          totalCount: formattedRecords.length,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
