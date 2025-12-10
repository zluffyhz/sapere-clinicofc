import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-test",
    email: "admin@sapere.com",
    name: "Administrador",
    loginMethod: "manus",
    role: "admin",
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

function createNonAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "therapist-test",
    email: "therapist@sapere.com",
    name: "Terapeuta",
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

describe("Admin Router", () => {
  it("admin can list all users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const users = await caller.admin.listUsers();
    expect(Array.isArray(users)).toBe(true);
  });

  it("admin can create a new user", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.createUser({
      name: "Novo Usuário Teste",
      email: "novo@teste.com",
      role: "family",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("admin can update user role", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // First create a user
    const createResult = await caller.admin.createUser({
      name: "Usuário para Atualizar",
      email: "atualizar@teste.com",
      role: "family",
    });

    // Then update their role
    const updateResult = await caller.admin.updateUserRole({
      userId: createResult.id,
      role: "therapist",
    });

    expect(updateResult.success).toBe(true);
  });

  it("admin can delete a user", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // First create a user
    const createResult = await caller.admin.createUser({
      name: "Usuário para Deletar",
      email: "deletar@teste.com",
      role: "family",
    });

    // Then delete them
    const deleteResult = await caller.admin.deleteUser({
      userId: createResult.id,
    });

    expect(deleteResult.success).toBe(true);
  });

  it("non-admin cannot list users", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.listUsers()).rejects.toThrow(
      "Acesso restrito a administradores"
    );
  });

  it("non-admin cannot create users", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createUser({
        name: "Teste",
        email: "teste@teste.com",
        role: "family",
      })
    ).rejects.toThrow("Acesso restrito a administradores");
  });

  it("non-admin cannot update user roles", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.updateUserRole({
        userId: 1,
        role: "admin",
      })
    ).rejects.toThrow("Acesso restrito a administradores");
  });

  it("non-admin cannot delete users", async () => {
    const { ctx } = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.deleteUser({
        userId: 1,
      })
    ).rejects.toThrow("Acesso restrito a administradores");
  });
});
