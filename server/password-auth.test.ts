import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(): { ctx: TrpcContext; cookies: Map<string, string> } {
  const cookies = new Map<string, string>();
  
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => {
        cookies.set(name, value);
      },
    } as TrpcContext["res"],
  };

  return { ctx, cookies };
}

function createAuthContext(user: AuthenticatedUser): { ctx: TrpcContext } {
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

describe("Password Authentication", () => {
  it("can create user with password", async () => {
    const testEmail = `test-${Date.now()}@sapere.com`;
    
    const result = await db.createUser({
      name: "Test User",
      email: testEmail,
      role: "family",
      password: "testpassword123",
    });

    expect(result[0].insertId).toBeDefined();
    
    // Verify user was created
    const user = await db.getUserByEmail(testEmail);
    expect(user).toBeDefined();
    expect(user?.email).toBe(testEmail);
    expect(user?.passwordHash).toBeDefined();
  });

  it("can login with correct email and password", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const testEmail = `login-test-${Date.now()}@sapere.com`;
    const testPassword = "correctpassword123";
    
    // Create user first
    await db.createUser({
      name: "Login Test User",
      email: testEmail,
      role: "therapist",
      password: testPassword,
    });

    // Try to login
    const result = await caller.auth.loginWithPassword({
      email: testEmail,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe(testEmail);
    expect(cookies.size).toBeGreaterThan(0);
  });

  it("cannot login with incorrect password", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    const testEmail = `wrong-pass-${Date.now()}@sapere.com`;
    
    // Create user
    await db.createUser({
      name: "Wrong Password Test",
      email: testEmail,
      role: "family",
      password: "correctpassword",
    });

    // Try to login with wrong password
    await expect(
      caller.auth.loginWithPassword({
        email: testEmail,
        password: "wrongpassword",
      })
    ).rejects.toThrow("Email ou senha inválidos");
  });

  it("cannot login with non-existent email", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithPassword({
        email: "nonexistent@example.com",
        password: "anypassword",
      })
    ).rejects.toThrow("Email ou senha inválidos");
  });

  it("can change password when authenticated", async () => {
    const testEmail = `change-pass-${Date.now()}@sapere.com`;
    const oldPassword = "oldpassword123";
    const newPassword = "newpassword456";
    
    // Create user
    const createResult = await db.createUser({
      name: "Change Password Test",
      email: testEmail,
      role: "family",
      password: oldPassword,
    });
    
    const userId = createResult[0].insertId;
    const user = await db.getUserById(userId);
    
    if (!user) throw new Error("User not found");
    
    const { ctx } = createAuthContext(user as AuthenticatedUser);
    const caller = appRouter.createCaller(ctx);

    // Change password
    const result = await caller.auth.changePassword({
      currentPassword: oldPassword,
      newPassword: newPassword,
    });

    expect(result.success).toBe(true);
    
    // Verify can login with new password
    const { ctx: loginCtx } = createMockContext();
    const loginCaller = appRouter.createCaller(loginCtx);
    
    const loginResult = await loginCaller.auth.loginWithPassword({
      email: testEmail,
      password: newPassword,
    });
    
    expect(loginResult.success).toBe(true);
  });

  it("cannot change password with wrong current password", async () => {
    const testEmail = `wrong-current-${Date.now()}@sapere.com`;
    const correctPassword = "correctpassword";
    
    // Create user
    const createResult = await db.createUser({
      name: "Wrong Current Password Test",
      email: testEmail,
      role: "family",
      password: correctPassword,
    });
    
    const userId = createResult[0].insertId;
    const user = await db.getUserById(userId);
    
    if (!user) throw new Error("User not found");
    
    const { ctx } = createAuthContext(user as AuthenticatedUser);
    const caller = appRouter.createCaller(ctx);

    // Try to change with wrong current password
    await expect(
      caller.auth.changePassword({
        currentPassword: "wrongcurrent",
        newPassword: "newpassword",
      })
    ).rejects.toThrow("Senha atual incorreta");
  });

  it("enforces minimum password length", async () => {
    const testEmail = `short-pass-${Date.now()}@sapere.com`;
    
    // Create user
    const createResult = await db.createUser({
      name: "Short Password Test",
      email: testEmail,
      role: "family",
      password: "validpassword",
    });
    
    const userId = createResult[0].insertId;
    const user = await db.getUserById(userId);
    
    if (!user) throw new Error("User not found");
    
    const { ctx } = createAuthContext(user as AuthenticatedUser);
    const caller = appRouter.createCaller(ctx);

    // Try to set password that's too short
    await expect(
      caller.auth.changePassword({
        currentPassword: "validpassword",
        newPassword: "short",
      })
    ).rejects.toThrow();
  });
});
