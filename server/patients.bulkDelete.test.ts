import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

describe("patients.bulkDelete", () => {
  let adminContext: any;
  let therapistContext: any;
  let testPatientIds: number[] = [];

  beforeAll(async () => {
    // Get users from database
    const allUsers = await db.getAllUsers();
    
    const adminUser = allUsers.find((u: any) => u.role === 'admin');
    if (!adminUser) {
      throw new Error("Admin user not found");
    }
    adminContext = {
      user: adminUser,
      req: {} as any,
      res: {} as any,
    };

    const therapistUser = allUsers.find((u: any) => u.role === 'therapist');
    if (!therapistUser) {
      throw new Error("Therapist user not found");
    }
    therapistContext = {
      user: therapistUser,
      req: {} as any,
      res: {} as any,
    };

    // Create test patients
    const familyUser = allUsers.find((u: any) => u.role === 'family');
    if (!familyUser) {
      throw new Error("Family user not found");
    }

    const patient1 = await db.createPatient({
      name: "Paciente Teste Bulk 1",
      dateOfBirth: new Date("2020-01-01"),
      familyUserId: familyUser.id,
      therapistUserId: therapistUser.id,
      diagnosis: "Teste",
      notes: "Paciente de teste para bulk delete",
      imageAuthorization: false,
    });
    testPatientIds.push(patient1[0].insertId);

    const patient2 = await db.createPatient({
      name: "Paciente Teste Bulk 2",
      dateOfBirth: new Date("2020-02-01"),
      familyUserId: familyUser.id,
      therapistUserId: therapistUser.id,
      diagnosis: "Teste",
      notes: "Paciente de teste para bulk delete",
      imageAuthorization: false,
    });
    testPatientIds.push(patient2[0].insertId);
  });

  afterAll(async () => {
    // Cleanup: delete test patients if they still exist
    for (const patientId of testPatientIds) {
      try {
        await db.deletePatient(patientId);
      } catch (error) {
        // Patient may already be deleted by tests
      }
    }
  });

  it("should allow admin to bulk delete patients", async () => {
    const caller = appRouter.createCaller(adminContext);
    
    const result = await caller.patients.bulkDelete({
      patientIds: testPatientIds,
    });

    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2);

    // Verify patients were deleted
    for (const patientId of testPatientIds) {
      const patient = await db.getPatientById(patientId);
      expect(patient).toBeUndefined();
    }
  });

  it("should reject empty patient list", async () => {
    const caller = appRouter.createCaller(adminContext);
    
    await expect(
      caller.patients.bulkDelete({ patientIds: [] })
    ).rejects.toThrow("Nenhum paciente selecionado");
  });

  it("should reject non-admin users", async () => {
    const caller = appRouter.createCaller(therapistContext);
    
    await expect(
      caller.patients.bulkDelete({ patientIds: [1, 2] })
    ).rejects.toThrow("Acesso restrito a administradores");
  });

  it("should handle non-existent patient IDs gracefully", async () => {
    const caller = appRouter.createCaller(adminContext);
    
    // Try to delete non-existent patients (IDs 999999, 999998)
    const result = await caller.patients.bulkDelete({
      patientIds: [999999, 999998],
    });

    // Should not throw error, just complete successfully
    expect(result.success).toBe(true);
    expect(result.deletedCount).toBe(2);
  });
});

describe("patients.listAll", () => {
  let adminContext: any;
  let therapistContext: any;

  beforeAll(async () => {
    // Get users from database
    const allUsers = await db.getAllUsers();
    
    const adminUser = allUsers.find((u: any) => u.role === 'admin');
    if (!adminUser) {
      throw new Error("Admin user not found");
    }
    adminContext = {
      user: adminUser,
      req: {} as any,
      res: {} as any,
    };

    const therapistUser = allUsers.find((u: any) => u.role === 'therapist');
    if (!therapistUser) {
      throw new Error("Therapist user not found");
    }
    therapistContext = {
      user: therapistUser,
      req: {} as any,
      res: {} as any,
    };
  });

  it("should allow admin to list all patients", async () => {
    const caller = appRouter.createCaller(adminContext);
    
    const patients = await caller.patients.listAll();

    expect(Array.isArray(patients)).toBe(true);
    expect(patients.length).toBeGreaterThan(0);
    
    // Verify patient structure
    if (patients.length > 0) {
      const patient = patients[0];
      expect(patient).toHaveProperty("id");
      expect(patient).toHaveProperty("name");
      expect(patient).toHaveProperty("dateOfBirth");
    }
  });

  it("should reject non-admin users", async () => {
    const caller = appRouter.createCaller(therapistContext);
    
    await expect(
      caller.patients.listAll()
    ).rejects.toThrow("Acesso restrito a administradores");
  });
});
