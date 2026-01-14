import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Calendar, FileText, Users, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: () => {
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Informativo */}
      <div className="lg:w-1/2 bg-gradient-to-br from-orange-500 via-orange-400 to-yellow-400 p-8 lg:p-12 flex flex-col justify-between text-white">
        <div>
          {/* Logo */}
          <div className="mb-12">
            <img src="/logo-sapere.webp" alt="Sapere" className="h-16 mb-3" />
            <p className="text-white/90 text-sm font-light">Portal de Gestão de Terapias</p>
          </div>

          {/* Welcome Message */}
          <div className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Bem-vindo ao App Sapere
            </h1>
            <p className="text-lg text-white/90 font-light leading-relaxed">
              Onde o acolhimento da terapia encontra a tecnologia para transformar o futuro do seu filho.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="space-y-4 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex items-start gap-4 hover:bg-white/15 transition-colors">
              <div className="bg-white/20 rounded-lg p-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Acompanhamento</h3>
                <p className="text-sm text-white/80 font-light">
                  Tenha a agenda de terapias do seu filho na palma da sua mão.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex items-start gap-4 hover:bg-white/15 transition-colors">
              <div className="bg-white/20 rounded-lg p-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Desenvolvimento</h3>
                <p className="text-sm text-white/80 font-light">
                  Um sistema exclusivo para que nossos especialistas registrem cada passo do desenvolvimento.
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 flex items-start gap-4 hover:bg-white/15 transition-colors">
              <div className="bg-white/20 rounded-lg p-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Inovação</h3>
                <p className="text-sm text-white/80 font-light">
                  Segurança de ponta em um web app desenvolvido sob medida para você.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-white/70 font-light">
          © 2026 Clínica Sapere. Cuidando com dedicação e profissionalismo.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="lg:w-1/2 bg-gray-950 p-8 lg:p-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <Card className="bg-gray-900/50 border-gray-800 shadow-2xl">
            <CardContent className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-100 mb-2">
                  Entrar no Portal
                </h2>
                <p className="text-sm text-gray-400 font-light">
                  Faça login para acessar sua conta
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="bg-red-950/50 border-red-900">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-200">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-300 font-normal">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loginMutation.isPending}
                    required
                    autoComplete="email"
                    className="bg-gray-800/50 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-gray-300 font-normal">
                      Senha
                    </Label>
                    <a 
                      href="#" 
                      className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-light"
                      onClick={(e) => e.preventDefault()}
                    >
                      Esqueceu a senha?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loginMutation.isPending}
                    required
                    autoComplete="current-password"
                    className="bg-gray-800/50 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-600 hover:to-orange-500 text-white font-semibold py-6 shadow-lg shadow-orange-500/20" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>

              {/* Security Notice */}
              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Lock className="h-3 w-3" />
                <span className="font-light">Conexão segura e criptografada</span>
              </div>

              {/* Help Text */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400 font-light">
                  Não tem uma conta?{" "}
                  <a 
                    href="#" 
                    className="text-orange-400 hover:text-orange-300 transition-colors"
                    onClick={(e) => e.preventDefault()}
                  >
                    Entre em contato
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer Links */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-600">
            <a href="#" className="hover:text-gray-400 transition-colors font-light" onClick={(e) => e.preventDefault()}>
              Termos de Serviço
            </a>
            <span className="text-gray-800">•</span>
            <a href="#" className="hover:text-gray-400 transition-colors font-light" onClick={(e) => e.preventDefault()}>
              Política de Privacidade
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
