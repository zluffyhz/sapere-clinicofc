import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

describe("Incomplete Evolutions Notification System", () => {
  it("should detect incomplete evolution (missing fields)", async () => {
    const incompleteEvolution = {
      sessionSummary: "Teste",
      patientMood: "bem",
      patientBehavior: "", // Missing
      goalsAchieved: "", // Missing
      nextSessionPlan: "", // Missing
      collaborationLevel: "full",
    };
    
    const isComplete = db.isEvolutionComplete(incompleteEvolution);
    expect(isComplete).toBe(false);
  });

  it("should detect complete evolution (all fields filled)", async () => {
    const completeEvolution = {
      sessionSummary: "Sessão produtiva",
      patientMood: "bem",
      patientBehavior: "Colaborativo",
      goalsAchieved: "Objetivos atingidos",
      nextSessionPlan: "Continuar trabalhando",
      collaborationLevel: "full",
    };
    
    const isComplete = db.isEvolutionComplete(completeEvolution);
    expect(isComplete).toBe(true);
  });

  it("should return false for evolution with empty strings", async () => {
    const evolutionWithEmptyStrings = {
      sessionSummary: "Teste",
      patientMood: "bem",
      patientBehavior: "   ", // Only whitespace
      goalsAchieved: "",
      nextSessionPlan: "Plano",
      collaborationLevel: "full",
    };
    
    const isComplete = db.isEvolutionComplete(evolutionWithEmptyStrings);
    expect(isComplete).toBe(false);
  });

  it("should return false for evolution with null values", async () => {
    const evolutionWithNulls = {
      sessionSummary: "Teste",
      patientMood: null,
      patientBehavior: "Comportamento",
      goalsAchieved: "Objetivos",
      nextSessionPlan: "Plano",
      collaborationLevel: "full",
    };
    
    const isComplete = db.isEvolutionComplete(evolutionWithNulls);
    expect(isComplete).toBe(false);
  });

  it("should return false for evolution without collaborationLevel", async () => {
    const evolutionWithoutCollaboration = {
      sessionSummary: "Teste",
      patientMood: "bem",
      patientBehavior: "Comportamento",
      goalsAchieved: "Objetivos",
      nextSessionPlan: "Plano",
      collaborationLevel: null,
    };
    
    const isComplete = db.isEvolutionComplete(evolutionWithoutCollaboration);
    expect(isComplete).toBe(false);
  });
});
