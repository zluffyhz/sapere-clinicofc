import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Analytics - Atendimentos Mensal", () => {
  const adminCaller = appRouter.createCaller({
    user: { id: 1, name: "Admin", email: "admin@test.com", role: "admin", openId: "admin-open-id" },
  } as any);

  const therapistCaller = appRouter.createCaller({
    user: { id: 2, name: "Terapeuta", email: "terapeuta@test.com", role: "therapist", openId: "therapist-open-id" },
  } as any);

  it("should return atendimentos for admin user", async () => {
    const result = await adminCaller.analytics.atendimentosMensal({
      month: 5,
      year: 2026,
    });

    expect(result).toHaveProperty("records");
    expect(result).toHaveProperty("totalCount");
    expect(Array.isArray(result.records)).toBe(true);
    expect(typeof result.totalCount).toBe("number");
    expect(result.totalCount).toBe(result.records.length);
  });

  it("should return records with correct structure", async () => {
    const result = await adminCaller.analytics.atendimentosMensal({
      month: 5,
      year: 2026,
    });

    if (result.records.length > 0) {
      const record = result.records[0];
      expect(record).toHaveProperty("id");
      expect(record).toHaveProperty("therapistUserId");
      expect(record).toHaveProperty("sessionDate");
      expect(record).toHaveProperty("therapyType");
      expect(record).toHaveProperty("therapistName");
      expect(record).toHaveProperty("patientName");
    }
  });

  it("should reject non-admin users", async () => {
    await expect(
      therapistCaller.analytics.atendimentosMensal({
        month: 5,
        year: 2026,
      })
    ).rejects.toThrow();
  });

  it("should reject invalid month values", async () => {
    await expect(
      adminCaller.analytics.atendimentosMensal({
        month: 13,
        year: 2026,
      })
    ).rejects.toThrow();
  });

  it("should reject year before 2026", async () => {
    await expect(
      adminCaller.analytics.atendimentosMensal({
        month: 5,
        year: 2025,
      })
    ).rejects.toThrow();
  });

  it("should return empty records for future months with no data", async () => {
    const result = await adminCaller.analytics.atendimentosMensal({
      month: 12,
      year: 2026,
    });

    expect(result.records).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});
