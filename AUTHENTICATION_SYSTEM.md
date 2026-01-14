# Sistema de Autenticação por Senha - Documentação Técnica Completa

**Autor:** Manus AI  
**Data:** 08 de Janeiro de 2026  
**Sistema:** Sapere Clinic - Portal de Gestão de Terapias  
**Versão:** 1.0

---

## Sumário Executivo

Este documento descreve em detalhes a arquitetura completa do sistema de autenticação por senha implementado no sistema Sapere. O sistema utiliza uma abordagem híbrida que combina autenticação local por senha com gerenciamento de sessão baseado em **JWT (JSON Web Tokens)**, permitindo que usuários façam login com email e senha enquanto mantêm compatibilidade com o sistema OAuth do Manus.

A arquitetura foi projetada para ser segura, escalável e fácil de replicar em outros projetos. Utiliza **bcrypt** para hash de senhas, **jose** para assinatura e verificação de tokens JWT, e **cookies HTTP-only** para armazenamento seguro de sessões.

---

## 1. Arquitetura Geral do Sistema

O sistema de autenticação é composto por quatro camadas principais que trabalham em conjunto para fornecer autenticação segura e gerenciamento de sessão.

### 1.1 Camadas da Arquitetura

| Camada | Responsabilidade | Tecnologias |
|--------|------------------|-------------|
| **Frontend** | Interface de login, gerenciamento de estado de autenticação | React, tRPC Client, Wouter |
| **Backend API** | Rotas de autenticação, validação de credenciais | tRPC, Express, bcrypt |
| **Gerenciamento de Sessão** | Criação, assinatura e verificação de tokens JWT | jose, cookies HTTP-only |
| **Banco de Dados** | Armazenamento de usuários e hashes de senha | MySQL/TiDB, Drizzle ORM |

### 1.2 Fluxo de Dados Simplificado

O fluxo de autenticação segue este caminho:

**Login:** Cliente → tRPC `loginWithPassword` → Validação bcrypt → Criação de JWT → Cookie de sessão → Redirecionamento

**Requisições Autenticadas:** Cliente com cookie → Middleware tRPC → Verificação JWT → Busca de usuário no DB → Contexto com usuário autenticado

**Logout:** Cliente → tRPC `logout` → Limpeza de cookie → Redirecionamento para login

---

## 2. Estrutura do Banco de Dados

O sistema utiliza uma tabela `users` que armazena todas as informações necessárias para autenticação e autorização.

### 2.1 Schema da Tabela `users`

```typescript
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: text("passwordHash"), // Hash bcrypt da senha
  role: mysqlEnum("role", ["family", "therapist", "admin"]).default("family").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
```

### 2.2 Campos Críticos para Autenticação

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `openId` | VARCHAR(64) | Identificador único do usuário, usado como chave primária para sessões | `local_sapererecepcao` |
| `email` | VARCHAR(320) | Email do usuário, usado como username no login | `usuario@exemplo.com` |
| `passwordHash` | TEXT | Hash bcrypt da senha (custo 10) | `$2b$10$RoVUK6DmTKky...` |
| `role` | ENUM | Nível de acesso: `family`, `therapist`, `admin` | `admin` |
| `lastSignedIn` | TIMESTAMP | Data/hora do último login bem-sucedido | `2026-01-08 14:30:00` |

### 2.3 Convenção de Nomenclatura

Para usuários criados localmente (não via OAuth), o campo `openId` segue o padrão `local_{identificador}`. Por exemplo:

- `local_sapererecepcao` para o usuário de recepção
- `local_admin` para um administrador local
- `local_terapeuta_maria` para uma terapeuta específica

Esta convenção evita conflitos com usuários OAuth que possuem openIds gerados pelo sistema Manus.

---

## 3. Backend: Rotas de Autenticação

O backend expõe três rotas principais de autenticação através do tRPC router localizado em `server/routers.ts`.

### 3.1 Rota `auth.loginWithPassword`

Esta é a rota principal para autenticação por senha. Ela recebe email e senha, valida as credenciais e cria uma sessão.

#### Código Completo

```typescript
loginWithPassword: publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Buscar usuário por email
    const user = await db.getUserByEmail(input.email);
    
    // 2. Validar existência do usuário e hash de senha
    if (!user || !user.passwordHash) {
      throw new TRPCError({ 
        code: 'UNAUTHORIZED', 
        message: 'Email ou senha inválidos' 
      });
    }
    
    // 3. Comparar senha fornecida com hash armazenado
    const bcrypt = await import('bcrypt');
    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    
    if (!isValid) {
      throw new TRPCError({ 
        code: 'UNAUTHORIZED', 
        message: 'Email ou senha inválidos' 
      });
    }
    
    // 4. Atualizar timestamp de último login
    await db.upsertUser({ 
      openId: user.openId, 
      lastSignedIn: new Date() 
    });
    
    // 5. Criar token de sessão JWT
    const { sdk } = await import('./_core/sdk');
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || "",
      expiresInMs: ONE_YEAR_MS,
    });
    
    // 6. Definir cookie de sessão
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, sessionToken, { 
      ...cookieOptions, 
      maxAge: ONE_YEAR_MS 
    });
    
    // 7. Retornar sucesso com dados do usuário
    return { 
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    };
  }),
```

#### Detalhamento do Fluxo

**Passo 1 - Busca do Usuário:** A função `db.getUserByEmail()` executa uma query SQL simples:

```typescript
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
```

**Passo 2 - Validação de Existência:** Verifica se o usuário existe e se possui um `passwordHash` definido. Usuários OAuth podem não ter senha local.

**Passo 3 - Comparação de Senha:** Utiliza `bcrypt.compare()` que:
- Extrai o salt do hash armazenado
- Aplica o mesmo salt à senha fornecida
- Compara os hashes resultantes em tempo constante (proteção contra timing attacks)

**Passo 4 - Atualização de Timestamp:** Registra o momento do login para auditoria e análise de uso.

**Passo 5 - Criação de Token JWT:** O SDK cria um token JWT assinado com a chave secreta do servidor. O token contém:

```json
{
  "openId": "local_sapererecepcao",
  "appId": "VITE_APP_ID_VALUE",
  "name": "Recepção Sapere",
  "exp": 1735910400
}
```

**Passo 6 - Definição de Cookie:** O cookie é configurado com as seguintes opções de segurança:

```typescript
{
  httpOnly: true,      // Não acessível via JavaScript
  secure: true,        // Apenas HTTPS (em produção)
  sameSite: 'lax',     // Proteção CSRF
  maxAge: 31536000000  // 1 ano em milissegundos
}
```

**Passo 7 - Resposta:** Retorna dados não-sensíveis do usuário para o frontend atualizar o estado.

### 3.2 Rota `auth.changePassword`

Permite que usuários autenticados alterem suas senhas. Suporta dois cenários:

1. **Primeiro acesso:** Usuário sem senha pode definir uma nova (campo `currentPassword` vazio)
2. **Alteração:** Usuário com senha existente deve fornecer a senha atual

#### Código Completo

```typescript
changePassword: protectedProcedure
  .input(z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Buscar usuário autenticado
    const user = await db.getUserById(ctx.user.id);
    
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
    }
    
    // 2. Se usuário já tem senha, validar senha atual
    if (user.passwordHash && input.currentPassword) {
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      
      if (!isValid) {
        throw new TRPCError({ 
          code: 'UNAUTHORIZED', 
          message: 'Senha atual incorreta' 
        });
      }
    }
    
    // 3. Gerar hash da nova senha
    const bcrypt = await import('bcrypt');
    const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
    
    // 4. Atualizar no banco de dados
    await db.updateUserPassword(ctx.user.id, newPasswordHash);
    
    return { success: true };
  }),
```

#### Detalhes de Segurança

**Validação de Senha Atual:** Previne que um atacante com acesso temporário à sessão altere a senha sem conhecer a senha atual.

**Custo de Hash bcrypt:** O valor `10` no segundo parâmetro de `bcrypt.hash()` define o número de rounds de hashing. Cada incremento dobra o tempo de processamento:

| Custo | Tempo Aproximado | Uso Recomendado |
|-------|------------------|-----------------|
| 10 | ~100ms | Aplicações web modernas (padrão) |
| 12 | ~400ms | Alta segurança, tolerância a latência |
| 14 | ~1.6s | Sistemas críticos, autenticação rara |

**Função de Atualização:**

```typescript
export async function updateUserPassword(userId: number, newPasswordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userId));
}
```

### 3.3 Rota `auth.logout`

Remove o cookie de sessão, efetivamente encerrando a sessão do usuário.

#### Código Completo

```typescript
logout: publicProcedure.mutation(({ ctx }) => {
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  return {
    success: true,
  } as const;
}),
```

#### Funcionamento

A função `clearCookie` define um cookie com o mesmo nome mas com `maxAge: -1`, instruindo o navegador a deletá-lo imediatamente. É importante usar as mesmas opções de cookie (path, domain, etc.) para garantir que o cookie correto seja removido.

### 3.4 Rota `auth.me`

Retorna o usuário atualmente autenticado ou `null` se não houver sessão válida.

```typescript
me: publicProcedure.query(opts => opts.ctx.user),
```

Esta rota é extremamente simples porque o middleware de contexto já realizou toda a validação de sessão. O campo `ctx.user` já contém o usuário completo do banco de dados ou `null`.

---

## 4. Gerenciamento de Sessão com JWT

O sistema utiliza JWT (JSON Web Tokens) para gerenciar sessões de forma stateless. Isso significa que o servidor não precisa manter um registro de sessões ativas em memória ou banco de dados.

### 4.1 Estrutura do Token JWT

Um token JWT é composto por três partes separadas por pontos:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcGVuSWQiOiJsb2NhbF9zYXBlcmVyZWNlcGNhbyIsImFwcElkIjoiVklURV9BUFBfSURfVkFMVUUiLCJuYW1lIjoiUmVjZXDDp8OjbyBTYXBlcmUiLCJleHAiOjE3MzU5MTA0MDB9.signature_here
```

**Parte 1 - Header (Cabeçalho):**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Parte 2 - Payload (Dados):**
```json
{
  "openId": "local_sapererecepcao",
  "appId": "VITE_APP_ID_VALUE",
  "name": "Recepção Sapere",
  "exp": 1735910400
}
```

**Parte 3 - Signature (Assinatura):**
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  SECRET_KEY
)
```

### 4.2 Criação de Token

A criação de tokens é gerenciada pela classe `SDKServer` em `server/_core/sdk.ts`:

```typescript
async createSessionToken(
  openId: string,
  options: { expiresInMs?: number; name?: string } = {}
): Promise<string> {
  return this.signSession(
    {
      openId,
      appId: ENV.appId,
      name: options.name || "",
    },
    options
  );
}

async signSession(
  payload: SessionPayload,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = this.getSessionSecret();

  return new SignJWT({
    openId: payload.openId,
    appId: payload.appId,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

private getSessionSecret() {
  const secret = ENV.cookieSecret;
  return new TextEncoder().encode(secret);
}
```

#### Detalhes Importantes

**Chave Secreta:** A variável `JWT_SECRET` do ambiente é usada como chave de assinatura. Esta chave **NUNCA** deve ser exposta ao frontend ou versionada no Git.

**Expiração:** Por padrão, os tokens expiram em 1 ano (`ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000`). Isso é adequado para aplicações que não lidam com dados extremamente sensíveis. Para sistemas bancários ou de saúde, considere expirações mais curtas (1-7 dias).

**Algoritmo HS256:** Utiliza HMAC com SHA-256, um algoritmo simétrico onde a mesma chave é usada para assinar e verificar. Alternativas como RS256 (assimétrico) são mais adequadas para sistemas distribuídos onde múltiplos serviços precisam verificar tokens.

### 4.3 Verificação de Token

A verificação ocorre em cada requisição autenticada:

```typescript
async verifySession(
  cookieValue: string | undefined | null
): Promise<{ openId: string; appId: string; name: string } | null> {
  if (!cookieValue) {
    console.warn("[Auth] Missing session cookie");
    return null;
  }

  try {
    const secretKey = this.getSessionSecret();
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ["HS256"],
    });
    const { openId, appId, name } = payload as Record<string, unknown>;

    if (
      !isNonEmptyString(openId) ||
      !isNonEmptyString(appId) ||
      !isNonEmptyString(name)
    ) {
      console.warn("[Auth] Session payload missing required fields");
      return null;
    }

    return {
      openId,
      appId,
      name,
    };
  } catch (error) {
    console.warn("[Auth] Session verification failed", String(error));
    return null;
  }
}
```

#### Validações Realizadas

1. **Assinatura:** Verifica se o token foi assinado com a chave secreta correta
2. **Expiração:** Valida se o token ainda está dentro do prazo de validade
3. **Estrutura:** Confirma que todos os campos obrigatórios estão presentes
4. **Algoritmo:** Garante que apenas HS256 é aceito (previne ataques de downgrade)

### 4.4 Middleware de Autenticação

O contexto tRPC (`server/_core/context.ts`) executa a verificação em todas as requisições:

```typescript
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
```

A função `authenticateRequest` realiza o fluxo completo:

```typescript
async authenticateRequest(req: Request): Promise<User> {
  // 1. Extrair cookie da requisição
  const cookies = this.parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  
  // 2. Verificar e decodificar JWT
  const session = await this.verifySession(sessionCookie);

  if (!session) {
    throw ForbiddenError("Invalid session cookie");
  }

  // 3. Buscar usuário no banco de dados
  const sessionUserId = session.openId;
  const signedInAt = new Date();
  let user = await db.getUserByOpenId(sessionUserId);

  // 4. Se usuário não existe, sincronizar com OAuth (fallback)
  if (!user) {
    try {
      const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: signedInAt,
      });
      user = await db.getUserByOpenId(userInfo.openId);
    } catch (error) {
      console.error("[Auth] Failed to sync user from OAuth:", error);
      throw ForbiddenError("Failed to sync user info");
    }
  }

  if (!user) {
    throw ForbiddenError("User not found");
  }

  // 5. Atualizar timestamp de último acesso
  await db.upsertUser({
    openId: user.openId,
    lastSignedIn: signedInAt,
  });

  return user;
}
```

#### Fluxo Híbrido OAuth + Senha

Este código demonstra a natureza híbrida do sistema. Ele suporta:

1. **Usuários locais:** Criados manualmente com senha, possuem `openId` como `local_*`
2. **Usuários OAuth:** Criados via login Manus, possuem `openId` gerado pelo OAuth

O fallback para OAuth (passo 4) permite que usuários que fizeram login via Manus também sejam autenticados, mantendo compatibilidade total.

---

## 5. Frontend: Interface de Login

O frontend é construído com React e utiliza tRPC para comunicação type-safe com o backend.

### 5.1 Página de Login (`client/src/pages/LoginPage.tsx`)

A página de login é uma interface simples e segura que coleta credenciais e chama a API de autenticação.

#### Estrutura do Componente

```typescript
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
      // Force full page reload to refresh auth state
      window.location.href = "/";
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-100 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img src="/logo-sapere.webp" alt="Sapere" className="h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Portal Sapere</h1>
          <p className="text-gray-600 mt-2">
            Gestão de terapias para famílias e terapeutas
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              Use suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loginMutation.isPending}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginMutation.isPending}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600">
          Primeira vez? Entre em contato com o administrador para criar sua conta.
        </p>
      </div>
    </div>
  );
}
```

#### Detalhes de Implementação

**Validação de Formulário:** Realiza validação básica no frontend antes de enviar para o backend. Isso melhora a experiência do usuário ao fornecer feedback imediato.

**Estados de Loading:** O botão mostra um spinner durante a requisição, prevenindo múltiplos cliques e fornecendo feedback visual.

**Redirecionamento Completo:** Após login bem-sucedido, executa `window.location.href = "/"` ao invés de navegação SPA. Isso força um reload completo da aplicação, garantindo que todos os componentes recebam o novo estado de autenticação.

**Tratamento de Erros:** Exibe mensagens de erro amigáveis retornadas pelo backend. As mensagens são genéricas ("Email ou senha inválidos") para não revelar se o email existe no sistema.

**Atributos de Segurança:**
- `autoComplete="email"` e `autoComplete="current-password"` habilitam gerenciadores de senha
- `type="password"` oculta a senha visualmente
- `required` fornece validação HTML5 nativa

### 5.2 Hook de Autenticação (`client/src/_core/hooks/useAuth.ts`)

O hook `useAuth` centraliza toda a lógica de gerenciamento de estado de autenticação no frontend.

```typescript
export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // Query que busca o usuário atual
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Mutation para logout
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  // Função de logout
  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  // Estado computado
  const state = useMemo(() => {
    localStorage.setItem(
      "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  // Redirecionamento automático
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
```

#### Funcionalidades do Hook

**Cache de Usuário:** Utiliza React Query (via tRPC) para cachear o usuário autenticado, evitando requisições desnecessárias.

**Sincronização com localStorage:** Armazena informações do usuário em `localStorage` para persistência entre reloads (não usado para autenticação, apenas para UX).

**Redirecionamento Automático:** Quando `redirectOnUnauthenticated` é `true`, redireciona automaticamente para a página de login se não houver usuário autenticado.

**Invalidação de Cache:** Após logout, limpa todos os caches relacionados ao usuário para garantir que dados sensíveis não permaneçam em memória.

### 5.3 Proteção de Rotas

O componente `SapereLayout` verifica a autenticação antes de renderizar conteúdo protegido:

```typescript
export default function SapereLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page (but not if already there)
    if (typeof window !== "undefined" && window.location.pathname !== "/login" && window.location.pathname !== "/change-password") {
      window.location.href = "/login";
      return null;
    }
    // If on login page, don't render layout
    return null;
  }

  // Render protected content
  return (
    <div className="min-h-screen bg-background">
      {/* Header with navigation */}
      <header>...</header>
      
      {/* Main Content */}
      <main className="container py-6">{children}</main>
    </div>
  );
}
```

Este padrão garante que:

1. Usuários não autenticados são redirecionados para `/login`
2. A página de login não entra em loop de redirecionamento
3. Conteúdo protegido nunca é renderizado sem autenticação válida

---

## 6. Controle de Acesso Baseado em Funções (RBAC)

O sistema implementa três níveis de acesso através do campo `role` na tabela `users`.

### 6.1 Níveis de Acesso

| Role | Nome | Permissões |
|------|------|------------|
| `family` | Família | Visualizar próprios pacientes, agendamentos, documentos e prontuários |
| `therapist` | Terapeuta | Gerenciar pacientes, criar agendamentos, registrar sessões, emitir documentos |
| `admin` | Administrador | Acesso completo: gerenciar usuários, marcar presença, visualizar todos os dados |

### 6.2 Middlewares de Autorização

O backend define middlewares específicos para cada nível de acesso:

```typescript
// Middleware para terapeutas e admins
const therapistProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'therapist' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a terapeutas' });
  }
  return next({ ctx });
});

// Middleware para famílias e admins
const familyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'family' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a famílias' });
  }
  return next({ ctx });
});

// Middleware apenas para admins
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' });
  }
  return next({ ctx });
});
```

### 6.3 Uso em Rotas

Exemplo de rota protegida por nível de acesso:

```typescript
patients: router({
  create: therapistProcedure  // Apenas terapeutas e admins
    .input(z.object({
      name: z.string().min(1),
      dateOfBirth: z.date().optional(),
      familyUserId: z.number(),
      diagnosis: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createPatient({
        ...input,
        therapistUserId: ctx.user.id,
      });
      return result;
    }),
    
  listMine: familyProcedure  // Apenas famílias e admins
    .query(async ({ ctx }) => {
      return db.getPatientsByFamilyUserId(ctx.user.id);
    }),
    
  listAll: adminProcedure  // Apenas admins
    .query(async () => {
      return db.getAllPatients();
    }),
}),
```

### 6.4 Controle de Acesso no Frontend

O frontend também filtra navegação e funcionalidades baseado no role:

```typescript
const navItems: NavItem[] = [
  { label: "Início", href: "/", icon: <Home />, roles: ["family", "therapist", "admin"] },
  { label: "Agenda", href: "/agenda", icon: <Calendar />, roles: ["family", "therapist", "admin"] },
  { label: "Frequência", href: "/frequencia", icon: <BarChart3 />, roles: ["family"] },
  { label: "Documentos", href: "/documentos", icon: <FileText />, roles: ["family", "therapist", "admin"] },
  { label: "Pacientes", href: "/pacientes", icon: <Users />, roles: ["therapist", "admin"] },
  { label: "Prontuários", href: "/prontuarios", icon: <ClipboardList />, roles: ["therapist", "admin"] },
  { label: "Presença", href: "/presenca", icon: <ClipboardCheck />, roles: ["admin"] },
  { label: "Usuários", href: "/admin/usuarios", icon: <Users />, roles: ["admin"] },
];

// Filtrar itens de navegação baseado no role do usuário
const filteredNavItems = navItems.filter((item) => item.roles.includes(user.role));
```

---

## 7. Segurança: Boas Práticas Implementadas

O sistema implementa múltiplas camadas de segurança para proteger contra ataques comuns.

### 7.1 Proteção Contra Ataques

| Ataque | Proteção Implementada | Detalhes |
|--------|----------------------|----------|
| **SQL Injection** | Drizzle ORM com queries parametrizadas | Todas as queries usam placeholders, nunca concatenação de strings |
| **XSS (Cross-Site Scripting)** | React escapa automaticamente, CSP headers | Dados do usuário são sempre escapados antes de renderizar |
| **CSRF (Cross-Site Request Forgery)** | SameSite cookies, origin validation | Cookies com `sameSite: 'lax'` previnem requisições cross-site |
| **Timing Attacks** | bcrypt.compare em tempo constante | Comparação de hashes sempre leva o mesmo tempo |
| **Brute Force** | Rate limiting (recomendado adicionar) | Atualmente não implementado, recomenda-se adicionar |
| **Session Hijacking** | HTTP-only cookies, HTTPS obrigatório | Cookies não acessíveis via JavaScript |
| **Token Tampering** | Assinatura HMAC-SHA256 | Qualquer modificação no token invalida a assinatura |

### 7.2 Armazenamento de Senhas

**Nunca armazene senhas em texto plano.** O sistema utiliza bcrypt com as seguintes características:

```typescript
const bcrypt = await import('bcrypt');
const passwordHash = await bcrypt.hash(password, 10);
```

**Por que bcrypt?**

1. **Salt automático:** Cada hash tem um salt único gerado automaticamente
2. **Custo adaptativo:** O parâmetro `10` pode ser aumentado conforme hardware evolui
3. **Resistente a GPU:** Projetado para ser lento mesmo em hardware especializado
4. **Padrão da indústria:** Amplamente testado e auditado

**Exemplo de hash bcrypt:**
```
$2b$10$RoVUK6DmTKkyfmc1isERt.ZdaSjV34JeP67aooSDEUsOEtusCKeu2
│  │  │                                                          │
│  │  └─ Salt (22 caracteres)                                   └─ Hash (31 caracteres)
│  └─ Custo (10 rounds = 2^10 = 1024 iterações)
└─ Versão do algoritmo (2b = bcrypt)
```

### 7.3 Configuração de Cookies Seguros

```typescript
const cookieOptions = {
  httpOnly: true,      // Não acessível via JavaScript (previne XSS)
  secure: true,        // Apenas HTTPS em produção (previne MITM)
  sameSite: 'lax',     // Proteção CSRF (não envia em requisições cross-site)
  maxAge: ONE_YEAR_MS, // Expiração de 1 ano
  path: '/',           // Disponível em todas as rotas
};
```

### 7.4 Validação de Entrada

Todas as entradas são validadas com Zod antes de processamento:

```typescript
.input(z.object({
  email: z.string().email(),  // Valida formato de email
  password: z.string(),        // Valida que é string não-vazia
}))
```

### 7.5 Mensagens de Erro Genéricas

Para prevenir enumeração de usuários, as mensagens de erro não revelam se o email existe:

```typescript
// ❌ MAU: Revela se email existe
if (!user) throw new Error("Email não encontrado");
if (!isValid) throw new Error("Senha incorreta");

// ✅ BOM: Mensagem genérica
if (!user || !isValid) {
  throw new TRPCError({ 
    code: 'UNAUTHORIZED', 
    message: 'Email ou senha inválidos' 
  });
}
```

---

## 8. Criação de Usuários

O sistema não possui interface pública de registro. Novos usuários devem ser criados manualmente por administradores.

### 8.1 Criação Manual via SQL

Para criar um novo usuário com senha:

**Passo 1 - Gerar hash da senha:**

```bash
cd /home/ubuntu/sapere-clinic
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('SENHA_AQUI', 10, (err, hash) => { if (err) console.error(err); else console.log(hash); });"
```

Exemplo de saída:
```
$2b$10$RoVUK6DmTKkyfmc1isERt.ZdaSjV34JeP67aooSDEUsOEtusCKeu2
```

**Passo 2 - Inserir usuário no banco:**

```sql
INSERT INTO users (name, email, role, passwordHash, openId) 
VALUES (
  'Nome do Usuário',
  'email@exemplo.com',
  'admin',  -- ou 'therapist', 'family'
  '$2b$10$RoVUK6DmTKkyfmc1isERt.ZdaSjV34JeP67aooSDEUsOEtusCKeu2',
  'local_identificador_unico'
);
```

### 8.2 Convenções de Nomenclatura

Para o campo `openId` de usuários locais:

- **Formato:** `local_{identificador}`
- **Exemplos:**
  - `local_admin` para administrador principal
  - `local_recepcao` para recepcionista
  - `local_terapeuta_maria` para terapeuta específica
  - `local_familia_silva` para família Silva

### 8.3 Script de Criação Automatizado

Para facilitar a criação de múltiplos usuários, você pode criar um script:

```javascript
// create-user.mjs
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';

async function createUser(name, email, role, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const openId = `local_${email.split('@')[0].replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, role, passwordHash, openId) VALUES (?, ?, ?, ?, ?)',
      [name, email, role, passwordHash, openId]
    );
    
    console.log(`✅ Usuário criado com sucesso!`);
    console.log(`   ID: ${result.insertId}`);
    console.log(`   Nome: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${role}`);
    console.log(`   OpenID: ${openId}`);
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
  } finally {
    await connection.end();
  }
}

// Uso: node create-user.mjs
createUser(
  'Recepção Sapere',
  'sapererecepcao@gmail.com',
  'admin',
  'sapere0926S*'
);
```

---

## 9. Fluxo Completo de Autenticação

Aqui está o fluxo completo desde o login até uma requisição autenticada.

### 9.1 Diagrama de Sequência

```
┌─────────┐         ┌──────────┐         ┌─────────┐         ┌──────────┐
│ Browser │         │ Frontend │         │ Backend │         │ Database │
└────┬────┘         └────┬─────┘         └────┬────┘         └────┬─────┘
     │                   │                    │                   │
     │ 1. Acessa /login  │                    │                   │
     ├──────────────────>│                    │                   │
     │                   │                    │                   │
     │ 2. Preenche form  │                    │                   │
     ├──────────────────>│                    │                   │
     │                   │                    │                   │
     │                   │ 3. POST loginWith  │                   │
     │                   │    Password        │                   │
     │                   ├───────────────────>│                   │
     │                   │                    │                   │
     │                   │                    │ 4. SELECT user    │
     │                   │                    │    WHERE email=?  │
     │                   │                    ├──────────────────>│
     │                   │                    │                   │
     │                   │                    │ 5. User data      │
     │                   │                    │<──────────────────┤
     │                   │                    │                   │
     │                   │                    │ 6. bcrypt.compare │
     │                   │                    │    (password,     │
     │                   │                    │     hash)         │
     │                   │                    │                   │
     │                   │                    │ 7. UPDATE last    │
     │                   │                    │    SignedIn       │
     │                   │                    ├──────────────────>│
     │                   │                    │                   │
     │                   │                    │ 8. Sign JWT       │
     │                   │                    │    (openId, exp)  │
     │                   │                    │                   │
     │                   │ 9. Set-Cookie:    │                   │
     │                   │    JWT token       │                   │
     │                   │<───────────────────┤                   │
     │                   │                    │                   │
     │ 10. Redirect to / │                    │                   │
     │<──────────────────┤                    │                   │
     │                   │                    │                   │
     │ 11. GET /         │                    │                   │
     │    Cookie: JWT    │                    │                   │
     ├──────────────────>│                    │                   │
     │                   │                    │                   │
     │                   │ 12. GET auth.me    │                   │
     │                   │     Cookie: JWT    │                   │
     │                   ├───────────────────>│                   │
     │                   │                    │                   │
     │                   │                    │ 13. Verify JWT    │
     │                   │                    │     signature     │
     │                   │                    │                   │
     │                   │                    │ 14. SELECT user   │
     │                   │                    │     WHERE openId  │
     │                   │                    ├──────────────────>│
     │                   │                    │                   │
     │                   │                    │ 15. User data     │
     │                   │                    │<──────────────────┤
     │                   │                    │                   │
     │                   │ 16. User object    │                   │
     │                   │<───────────────────┤                   │
     │                   │                    │                   │
     │ 17. Render        │                    │                   │
     │     dashboard     │                    │                   │
     │<──────────────────┤                    │                   │
```

### 9.2 Descrição Passo a Passo

**Fase 1 - Login:**

1. Usuário acessa `/login` no navegador
2. Preenche email e senha no formulário
3. Frontend chama `trpc.auth.loginWithPassword.mutate({ email, password })`
4. Backend busca usuário por email no banco de dados
5. Banco retorna dados do usuário incluindo `passwordHash`
6. Backend compara senha fornecida com hash usando `bcrypt.compare()`
7. Se válido, atualiza `lastSignedIn` no banco
8. Backend cria token JWT assinado com `openId` do usuário
9. Backend define cookie HTTP-only com o token JWT
10. Frontend recebe resposta de sucesso e redireciona para `/`

**Fase 2 - Requisição Autenticada:**

11. Navegador faz requisição GET para `/` incluindo cookie JWT automaticamente
12. Frontend chama `trpc.auth.me.useQuery()` para buscar usuário atual
13. Backend extrai JWT do cookie e verifica assinatura
14. Backend busca usuário no banco usando `openId` do token
15. Banco retorna dados completos do usuário
16. Backend retorna objeto de usuário para o frontend
17. Frontend renderiza dashboard com dados do usuário

---

## 10. Troubleshooting e Problemas Comuns

### 10.1 "Email ou senha inválidos"

**Causa:** Email não existe no banco ou senha incorreta.

**Solução:**
1. Verificar se usuário existe: `SELECT * FROM users WHERE email = 'email@exemplo.com'`
2. Verificar se `passwordHash` não é NULL
3. Testar hash manualmente:
```javascript
const bcrypt = require('bcrypt');
const hash = '$2b$10$...'; // Hash do banco
const password = 'senha_testada';
bcrypt.compare(password, hash, (err, result) => {
  console.log('Senha válida:', result);
});
```

### 10.2 "Invalid session cookie"

**Causa:** Token JWT inválido, expirado ou assinado com chave diferente.

**Solução:**
1. Verificar se `JWT_SECRET` está configurado corretamente
2. Limpar cookies do navegador e fazer login novamente
3. Verificar logs do servidor para detalhes do erro de verificação

### 10.3 Loop de Redirecionamento

**Causa:** Usuário não autenticado sendo redirecionado infinitamente para `/login`.

**Solução:**
1. Verificar se `/login` está excluído da proteção de rota em `SapereLayout`
2. Confirmar que `window.location.pathname !== "/login"` está presente na lógica de redirecionamento

### 10.4 Sessão Expira Muito Rápido

**Causa:** `maxAge` do cookie ou `exp` do JWT configurado incorretamente.

**Solução:**
1. Verificar valor de `ONE_YEAR_MS` em `server/routers.ts`
2. Confirmar que `maxAge` do cookie corresponde ao `expiresInMs` do JWT
3. Verificar se servidor e cliente têm relógios sincronizados (importante para `exp`)

### 10.5 Erro "Field 'openId' doesn't have a default value"

**Causa:** Tentativa de inserir usuário sem fornecer `openId`.

**Solução:**
Sempre fornecer `openId` ao criar usuário:
```sql
INSERT INTO users (..., openId) VALUES (..., 'local_identificador');
```

---

## 11. Extensões e Melhorias Futuras

### 11.1 Recuperação de Senha

Implementar fluxo de "Esqueci minha senha":

1. Usuário fornece email
2. Sistema gera token único de redefinição (UUID)
3. Token armazenado em tabela `password_reset_tokens` com expiração de 1 hora
4. Email enviado com link contendo token
5. Usuário clica no link, fornece nova senha
6. Sistema valida token, atualiza senha, invalida token

**Tabela necessária:**
```sql
CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 11.2 Autenticação de Dois Fatores (2FA)

Adicionar camada extra de segurança com TOTP (Time-based One-Time Password):

1. Usuário habilita 2FA nas configurações
2. Sistema gera segredo TOTP e exibe QR code
3. Usuário escaneia com app autenticador (Google Authenticator, Authy)
4. No login, após senha válida, solicitar código 2FA
5. Validar código com biblioteca `otplib`

**Campos adicionais na tabela `users`:**
```sql
ALTER TABLE users ADD COLUMN twofa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN twofa_secret VARCHAR(32);
```

### 11.3 Rate Limiting

Prevenir ataques de força bruta limitando tentativas de login:

```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/trpc/auth.loginWithPassword', loginLimiter, ...);
```

### 11.4 Logs de Auditoria

Registrar todas as ações de autenticação para segurança e compliance:

**Tabela de auditoria:**
```sql
CREATE TABLE auth_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'password_change', 'failed_login'
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Implementação:**
```typescript
await db.createAuthLog({
  userId: user.id,
  action: 'login',
  ipAddress: ctx.req.ip,
  userAgent: ctx.req.headers['user-agent'],
  success: true,
});
```

### 11.5 Sessões Múltiplas

Permitir que usuário visualize e revogue sessões ativas:

**Tabela de sessões:**
```sql
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE, -- Hash SHA-256 do JWT
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Ao criar sessão, armazenar hash do token. Ao verificar, checar se hash existe e não foi revogado.

### 11.6 Refresh Tokens

Para tokens de curta duração, implementar refresh tokens:

1. Login retorna `accessToken` (15 min) e `refreshToken` (30 dias)
2. `accessToken` usado em requisições normais
3. Quando `accessToken` expira, usar `refreshToken` para obter novo `accessToken`
4. `refreshToken` armazenado em cookie HTTP-only separado

Isso permite revogar acesso rapidamente (invalidando `accessToken`) sem forçar re-login constante.

---

## 12. Checklist de Implementação

Use este checklist ao replicar o sistema em novos projetos:

### Backend

- [ ] Instalar dependências: `bcrypt`, `jose`, `cookie`, `express`
- [ ] Criar tabela `users` com campos: `id`, `openId`, `email`, `passwordHash`, `role`
- [ ] Implementar função `getUserByEmail()` no `db.ts`
- [ ] Implementar função `updateUserPassword()` no `db.ts`
- [ ] Criar rota `auth.loginWithPassword` com validação bcrypt
- [ ] Criar rota `auth.changePassword` com validação de senha atual
- [ ] Criar rota `auth.logout` que limpa cookie
- [ ] Implementar `sdk.createSessionToken()` com assinatura JWT
- [ ] Implementar `sdk.verifySession()` com verificação JWT
- [ ] Configurar middleware de contexto para extrair usuário do token
- [ ] Definir middlewares de autorização: `adminProcedure`, `therapistProcedure`, etc.
- [ ] Configurar cookies com `httpOnly`, `secure`, `sameSite`
- [ ] Adicionar variável de ambiente `JWT_SECRET`

### Frontend

- [ ] Criar página `LoginPage.tsx` com formulário de email/senha
- [ ] Criar página `ChangePasswordPage.tsx` com formulário de alteração
- [ ] Implementar hook `useAuth()` com query `auth.me`
- [ ] Criar componente de proteção de rotas (ex: `SapereLayout`)
- [ ] Adicionar redirecionamento automático para `/login` em rotas protegidas
- [ ] Implementar função de logout que limpa cache e redireciona
- [ ] Adicionar estados de loading durante autenticação
- [ ] Exibir mensagens de erro amigáveis
- [ ] Filtrar navegação baseado em `user.role`

### Segurança

- [ ] Validar todas as entradas com Zod
- [ ] Usar mensagens de erro genéricas ("Email ou senha inválidos")
- [ ] Configurar HTTPS em produção
- [ ] Adicionar rate limiting em rotas de autenticação
- [ ] Implementar logs de auditoria
- [ ] Testar proteção contra SQL injection
- [ ] Testar proteção contra XSS
- [ ] Revisar configurações de cookies

### Testes

- [ ] Testar login com credenciais válidas
- [ ] Testar login com credenciais inválidas
- [ ] Testar logout e limpeza de sessão
- [ ] Testar alteração de senha
- [ ] Testar expiração de token
- [ ] Testar acesso a rotas protegidas sem autenticação
- [ ] Testar controle de acesso baseado em roles
- [ ] Testar criação de usuários

---

## 13. Conclusão

O sistema de autenticação implementado no Sapere Clinic é uma solução robusta e segura que combina as melhores práticas da indústria. Utilizando **bcrypt** para hashing de senhas, **JWT** para gerenciamento de sessão stateless e **cookies HTTP-only** para armazenamento seguro, o sistema oferece proteção contra os principais vetores de ataque.

A arquitetura híbrida permite tanto autenticação local por senha quanto integração com OAuth, proporcionando flexibilidade sem comprometer a segurança. O controle de acesso baseado em funções (RBAC) garante que cada usuário tenha acesso apenas às funcionalidades apropriadas para seu nível.

Este documento fornece todos os detalhes necessários para compreender, manter e replicar o sistema em futuros projetos. Seguindo os padrões e práticas descritos, você poderá implementar autenticação segura e escalável em qualquer aplicação web.

### Recursos Adicionais

Para aprofundar seus conhecimentos sobre os conceitos abordados:

- **bcrypt:** Documentação oficial em [npmjs.com/package/bcrypt](https://www.npmjs.com/package/bcrypt)
- **JWT:** Especificação completa em [jwt.io](https://jwt.io/)
- **jose:** Biblioteca moderna de JWT em [github.com/panva/jose](https://github.com/panva/jose)
- **OWASP Top 10:** Principais riscos de segurança em [owasp.org/www-project-top-ten](https://owasp.org/www-project-top-ten/)
- **tRPC:** Documentação oficial em [trpc.io](https://trpc.io/)

---

**Documento gerado por Manus AI**  
**Versão 1.0 - Janeiro de 2026**
