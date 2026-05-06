import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { gerarRelatorioPDF } from "../pdf-relatorio";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // REST: Relatório PDF de atendimentos (admin only)
  app.get("/api/atendimentos/relatorio-pdf", async (req, res) => {
    try {
      const { sdk } = await import("./sdk");
      const user = await sdk.authenticateRequest(req as any);
      if (!user || user.role !== "admin") {
        res.status(403).json({ error: "Acesso negado" });
        return;
      }

      const monthParam = parseInt(String(req.query.month));
      const yearParam = parseInt(String(req.query.year));

      if (!monthParam || !yearParam || monthParam < 1 || monthParam > 12 || yearParam < 2026) {
        res.status(400).json({ error: "Parâmetros inválidos" });
        return;
      }

      const dbModule = await import("../db");
      const dbConn = await dbModule.getDb();
      if (!dbConn) {
        res.status(500).json({ error: "Erro de conexão com banco" });
        return;
      }

      const { eq: eqOp, and: andOp, gte: gteOp, lte: lteOp, asc: ascOp } = await import("drizzle-orm");
      const { evolutions: evo, users: usr, patients: pat, appointments: appt } = await import("../../drizzle/schema");

      const startDate = new Date(Date.UTC(yearParam, monthParam - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(yearParam, monthParam, 0, 23, 59, 59, 999));

      const records = await dbConn
        .select({
          id: evo.id,
          therapistName: usr.name,
          patientName: pat.name,
          sessionDate: evo.sessionDate,
          therapyType: appt.therapyType,
        })
        .from(evo)
        .leftJoin(usr, eqOp(evo.therapistUserId, usr.id))
        .leftJoin(pat, eqOp(evo.patientId, pat.id))
        .leftJoin(appt, eqOp(evo.appointmentId, appt.id))
        .where(andOp(gteOp(evo.sessionDate, startDate), lteOp(evo.sessionDate, endDate)))
        .orderBy(ascOp(evo.sessionDate));

      const filtered = records
        .filter(r => r.therapistName && r.patientName)
        .map(r => ({
          id: r.id,
          therapistName: r.therapistName!,
          patientName: r.patientName!,
          sessionDate: r.sessionDate,
          therapyType: r.therapyType ?? "outro",
        }));

      gerarRelatorioPDF(res, filtered, monthParam, yearParam);
    } catch (err) {
      console.error("[PDF] Erro ao gerar relatório:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Erro ao gerar PDF" });
      }
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
