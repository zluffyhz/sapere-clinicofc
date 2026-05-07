/**
 * Integration test: cadastro de filho para família existente
 * Cria 2 famílias mock, adiciona filhos, verifica integração, depois limpa tudo.
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { getDb } from "./db";
import { users, patients } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

// IDs criados durante o teste (para limpeza)
let mockFamilyIds: number[] = [];
let mockPatientIds: number[] = [];

describe("Add Child to Existing Family Integration", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("DB not available");
  });

  afterAll(async () => {
    if (!db) return;
    // Limpar pacientes mock primeiro (FK)
    if (mockPatientIds.length > 0) {
      await db.delete(patients).where(inArray(patients.id, mockPatientIds));
    }
    // Limpar usuários mock
    if (mockFamilyIds.length > 0) {
      await db.delete(users).where(inArray(users.id, mockFamilyIds));
    }
  });

  it("should create 2 mock family users successfully", async () => {
    const [fam1] = await db!
      .insert(users)
      .values([
        {
          openId: `mock-family-test-001-${Date.now()}`,
          name: "Família Mock Teste 001",
          email: `mock-family-001-${Date.now()}@test.invalid`,
          role: "family",
          lastSignedIn: new Date(),
        },
      ])
      .$returningId();

    const [fam2] = await db!
      .insert(users)
      .values([
        {
          openId: `mock-family-test-002-${Date.now()}`,
          name: "Família Mock Teste 002",
          email: `mock-family-002-${Date.now()}@test.invalid`,
          role: "family",
          lastSignedIn: new Date(),
        },
      ])
      .$returningId();

    mockFamilyIds = [fam1.id, fam2.id];
    expect(mockFamilyIds).toHaveLength(2);
    expect(mockFamilyIds[0]).toBeGreaterThan(0);
    expect(mockFamilyIds[1]).toBeGreaterThan(0);
  });

  it("should add first child to family 1 (initial child)", async () => {
    const [pat] = await db!
      .insert(patients)
      .values([
        {
          name: "Filho Primário Mock 001",
          familyUserId: mockFamilyIds[0],
          dateOfBirth: new Date("2018-03-15"),
          diagnosis: "TEA leve",
          imageAuthorization: false,
        },
      ])
      .$returningId();

    mockPatientIds.push(pat.id);
    expect(pat.id).toBeGreaterThan(0);

    // Verificar que o paciente está vinculado corretamente
    const [saved] = await db!
      .select()
      .from(patients)
      .where(eq(patients.id, pat.id));

    expect(saved.familyUserId).toBe(mockFamilyIds[0]);
    expect(saved.name).toBe("Filho Primário Mock 001");
  });

  it("should add SECOND child to family 1 (the new feature being tested)", async () => {
    // Simula o cenário: família já tem um filho, agora adiciona o irmão
    const [pat] = await db!
      .insert(patients)
      .values([
        {
          name: "Irmão Secundário Mock 001",
          familyUserId: mockFamilyIds[0],
          dateOfBirth: new Date("2021-07-20"),
          diagnosis: "TDAH",
          imageAuthorization: true,
        },
      ])
      .$returningId();

    mockPatientIds.push(pat.id);
    expect(pat.id).toBeGreaterThan(0);

    // Verificar que ambos os filhos estão vinculados à mesma família
    const familyPatients = await db!
      .select()
      .from(patients)
      .where(eq(patients.familyUserId, mockFamilyIds[0]));

    const mockChildren = familyPatients.filter((p) =>
      mockPatientIds.includes(p.id)
    );
    expect(mockChildren).toHaveLength(2);
    expect(mockChildren.map((p) => p.name)).toContain("Filho Primário Mock 001");
    expect(mockChildren.map((p) => p.name)).toContain("Irmão Secundário Mock 001");
  });

  it("should add child to family 2 independently", async () => {
    const [pat] = await db!
      .insert(patients)
      .values([
        {
          name: "Filho Mock Família 002",
          familyUserId: mockFamilyIds[1],
          dateOfBirth: new Date("2019-11-05"),
          imageAuthorization: false,
        },
      ])
      .$returningId();

    mockPatientIds.push(pat.id);
    expect(pat.id).toBeGreaterThan(0);

    const [saved] = await db!
      .select()
      .from(patients)
      .where(eq(patients.id, pat.id));

    expect(saved.familyUserId).toBe(mockFamilyIds[1]);
    // Garantir que não vazou para família 1
    expect(saved.familyUserId).not.toBe(mockFamilyIds[0]);
  });

  it("should list patients per family correctly (no cross-contamination)", async () => {
    const fam1Patients = await db!
      .select()
      .from(patients)
      .where(eq(patients.familyUserId, mockFamilyIds[0]));

    const fam2Patients = await db!
      .select()
      .from(patients)
      .where(eq(patients.familyUserId, mockFamilyIds[1]));

    const fam1Mock = fam1Patients.filter((p) => mockPatientIds.includes(p.id));
    const fam2Mock = fam2Patients.filter((p) => mockPatientIds.includes(p.id));

    // Família 1 deve ter 2 filhos mock
    expect(fam1Mock).toHaveLength(2);
    // Família 2 deve ter 1 filho mock
    expect(fam2Mock).toHaveLength(1);

    // Nenhum paciente da família 1 deve aparecer na família 2 e vice-versa
    const fam1Ids = fam1Mock.map((p) => p.id);
    const fam2Ids = fam2Mock.map((p) => p.id);
    const overlap = fam1Ids.filter((id) => fam2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it("should verify familyUserId is required (null familyUserId should fail)", async () => {
    // Tenta inserir paciente sem familyUserId — deve falhar por constraint NOT NULL
    await expect(
      db!.insert(patients).values([
        {
          name: "Paciente Sem Família",
          familyUserId: null as any,
          imageAuthorization: false,
        },
      ])
    ).rejects.toThrow();
  });

  it("should confirm patients are visible in patients.list query (admin view)", async () => {
    // Simula a query usada pela PacientesPage (sem filtro de role, admin vê todos)
    const allPatients = await db!.select({ id: patients.id, familyUserId: patients.familyUserId }).from(patients);
    
    for (const mockId of mockPatientIds) {
      const found = allPatients.find((p) => p.id === mockId);
      expect(found).toBeDefined();
      expect(mockFamilyIds).toContain(found!.familyUserId);
    }
  });
});
