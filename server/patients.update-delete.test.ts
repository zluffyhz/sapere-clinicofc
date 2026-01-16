import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";
import bcrypt from "bcrypt";

describe("Patients Update and Delete", () => {
  let therapistUserId: number;
  let familyUserId: number;
  let patientId: number;

  beforeAll(async () => {
    // Create therapist user
    const therapistHash = await bcrypt.hash("test123", 10);
    const therapistResult = await db.createUser({
      openId: `test-therapist-update-${Date.now()}`,
      name: "Test Therapist Update",
      email: `therapist-update-${Date.now()}@test.com`,
      role: "therapist",
      passwordHash: therapistHash,
    });
    therapistUserId = therapistResult[0].insertId;

    // Create family user
    const familyHash = await bcrypt.hash("test123", 10);
    const familyResult = await db.createUser({
      openId: `test-family-update-${Date.now()}`,
      name: "Test Family Update",
      email: `family-update-${Date.now()}@test.com`,
      role: "family",
      passwordHash: familyHash,
    });
    familyUserId = familyResult[0].insertId;

    // Create patient
    const patientResult = await db.createPatient({
      name: "Test Patient for Update",
      dateOfBirth: new Date("2020-01-01"),
      familyUserId,
      therapistUserId,
      diagnosis: "Initial Diagnosis",
      notes: "Initial notes",
    });
    patientId = patientResult[0].insertId;
  });

  it("should update patient name", async () => {
    await db.updatePatient(patientId, {
      name: "Updated Patient Name",
    });

    const patient = await db.getPatientById(patientId);
    expect(patient?.name).toBe("Updated Patient Name");
  });

  it("should update patient date of birth", async () => {
    const newDate = new Date("2021-06-15");
    console.log("[TEST] Updating patient with date:", newDate);
    
    await db.updatePatient(patientId, {
      dateOfBirth: newDate,
    });

    const patient = await db.getPatientById(patientId);
    console.log("[TEST] Retrieved patient:", patient);
    
    expect(patient?.dateOfBirth).toEqual(newDate);
  });

  it("should update patient date of birth with string input", async () => {
    // Simulating what happens when date comes from HTML input
    const dateString = "2022-03-20";
    const newDate = new Date(dateString);
    console.log("[TEST] Updating patient with date from string:", { dateString, newDate });
    
    await db.updatePatient(patientId, {
      dateOfBirth: newDate,
    });

    const patient = await db.getPatientById(patientId);
    console.log("[TEST] Retrieved patient after string date:", patient);
    
    // Compare just the date part (ignore time)
    const expectedDate = new Date(dateString);
    expect(patient?.dateOfBirth?.toISOString().split('T')[0]).toBe(expectedDate.toISOString().split('T')[0]);
  });

  it("should update patient diagnosis and notes", async () => {
    await db.updatePatient(patientId, {
      diagnosis: "Updated Diagnosis",
      notes: "Updated notes with more details",
    });

    const patient = await db.getPatientById(patientId);
    expect(patient?.diagnosis).toBe("Updated Diagnosis");
    expect(patient?.notes).toBe("Updated notes with more details");
  });

  it("should update multiple fields at once", async () => {
    await db.updatePatient(patientId, {
      name: "Final Patient Name",
      diagnosis: "Final Diagnosis",
      notes: "Final notes",
    });

    const patient = await db.getPatientById(patientId);
    expect(patient?.name).toBe("Final Patient Name");
    expect(patient?.diagnosis).toBe("Final Diagnosis");
    expect(patient?.notes).toBe("Final notes");
  });

  it("should delete patient", async () => {
    // Create a new patient to delete
    const deletePatientResult = await db.createPatient({
      name: "Patient to Delete",
      familyUserId,
      therapistUserId,
    });
    const deletePatientId = deletePatientResult[0].insertId;

    // Verify patient exists
    let patient = await db.getPatientById(deletePatientId);
    expect(patient).toBeDefined();

    // Delete patient
    await db.deletePatient(deletePatientId);

    // Verify patient no longer exists
    patient = await db.getPatientById(deletePatientId);
    expect(patient).toBeUndefined();
  });
});
