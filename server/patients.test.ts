import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTherapistContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "therapist-test",
    email: "therapist@sapere.com",
    name: "Dr. Terapeuta",
    loginMethod: "manus",
    role: "therapist",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

function createFamilyContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "family-test",
    email: "family@sapere.com",
    name: "Família Teste",
    loginMethod: "manus",
    role: "family",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Patients Router", () => {
  it("therapist can create a patient", async () => {
    const { ctx } = createTherapistContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.patients.create({
      name: "Paciente Teste",
      familyUserId: 2,
      diagnosis: "Teste de diagnóstico",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("family user cannot create a patient", async () => {
    const { ctx } = createFamilyContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.patients.create({
        name: "Paciente Teste",
        familyUserId: 2,
      })
    ).rejects.toThrow("Acesso restrito a terapeutas");
  });

  it("therapist can list their patients", async () => {
    const { ctx } = createTherapistContext();
    const caller = appRouter.createCaller(ctx);

    const patients = await caller.patients.list();
    expect(Array.isArray(patients)).toBe(true);
  });

  it("family can list their patients", async () => {
    const { ctx } = createFamilyContext();
    const caller = appRouter.createCaller(ctx);

    const patients = await caller.patients.list();
    expect(Array.isArray(patients)).toBe(true);
  });
});

describe("Appointments Router", () => {
  it("therapist can create an appointment", async () => {
    const { ctx } = createTherapistContext();
    const caller = appRouter.createCaller(ctx);

    // First create a patient
    const patientResult = await caller.patients.create({
      name: "Paciente para Agendamento",
      familyUserId: 2,
    });

    // Use unique timestamp to avoid conflicts with other tests
    // MySQL TIMESTAMP max is 2038-01-19, use 2037 with unique day/hour
    const ts = Date.now();
    const uniqueDay = (ts % 28) + 1; // 1-28
    const uniqueHour = Math.floor(Math.random() * 20); // 0-19
    const startTime = new Date(2037, 5, uniqueDay, uniqueHour, 0, 0, 0); // June 2037
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);

    const result = await caller.appointments.create({
      patientId: patientResult.id,
      therapyType: "psicologia",
      startTime,
      endTime,
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("family user cannot create an appointment", async () => {
    const { ctx } = createFamilyContext();
    const caller = appRouter.createCaller(ctx);

    const startTime = new Date();
    const endTime = new Date();

    await expect(
      caller.appointments.create({
        patientId: 1,
        therapyType: "psicologia",
        startTime,
        endTime,
      })
    ).rejects.toThrow("Famílias não podem criar agendamentos diretamente");
  });
});

describe("Notifications Router", () => {
  it("user can list their notifications", async () => {
    const { ctx } = createFamilyContext();
    const caller = appRouter.createCaller(ctx);

    const notifications = await caller.notifications.list();
    expect(Array.isArray(notifications)).toBe(true);
  });

  it("user can get unread notification count", async () => {
    const { ctx } = createFamilyContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notifications.unreadCount();
    expect(result.count).toBeDefined();
    expect(typeof result.count).toBe("number");
  });
});

describe("Patient Data Router", () => {
  it("therapist can create patient data", async () => {
    const { ctx } = createTherapistContext();
    const caller = appRouter.createCaller(ctx);

    // Create a patient first
    const patientResult = await caller.patients.create({
      name: "Paciente para Anamnese",
      familyUserId: 2,
    });

    const result = await caller.patientData.create({
      patientId: patientResult.id,
      mainComplaints: "Queixas principais de teste",
      allergies: "Nenhuma alergia conhecida",
      currentMedications: "Medicamento X",
      therapyGoals: "Objetivos terapêuticos de teste",
      additionalNotes: "Observações adicionais",
    });

    expect(result.success).toBe(true);
  });

  it("family user cannot create patient data", async () => {
    const { ctx } = createFamilyContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.patientData.create({
        patientId: 1,
        mainComplaint: "Teste",
      })
    ).rejects.toThrow("Acesso restrito a terapeutas");
  });
});
