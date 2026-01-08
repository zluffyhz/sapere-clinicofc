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
    const uniqueTime = new Date();
    uniqueTime.setFullYear(2030); // Far future to avoid conflicts
    uniqueTime.setMilliseconds(Date.now() % 1000); // Add uniqueness
    const startTime = uniqueTime;
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
    ).rejects.toThrow("Acesso restrito a terapeutas");
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

describe("Anamnesis Router", () => {
  it("therapist can create anamnesis", async () => {
    const { ctx } = createTherapistContext();
    const caller = appRouter.createCaller(ctx);

    // Create a patient first
    const patientResult = await caller.patients.create({
      name: "Paciente para Anamnese",
      familyUserId: 2,
    });

    const result = await caller.anamnesis.create({
      patientId: patientResult.id,
      mainComplaints: "Queixas principais de teste",
      allergies: "Nenhuma alergia conhecida",
      currentMedications: "Medicamento X",
      therapyGoals: "Objetivos terapêuticos de teste",
      additionalNotes: "Observações adicionais",
    });

    expect(result.success).toBe(true);
  });

  it("family user cannot create anamnesis", async () => {
    const { ctx } = createFamilyContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.anamnesis.create({
        patientId: 1,
        mainComplaint: "Teste",
      })
    ).rejects.toThrow("Acesso restrito a terapeutas");
  });
});
