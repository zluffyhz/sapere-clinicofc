import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit, Users, AlertCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "family" as "family" | "therapist" | "admin",
    specialties: [] as string[],
  });

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();

  const createUserMutation = trpc.admin.createUser.useMutation({
    onSuccess: (data) => {
      utils.admin.listUsers.invalidate();
      setTempPassword(data.temporaryPassword);
      setNewUser({ name: "", email: "", role: "family", specialties: [] });
      toast.success("Usuário criado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    },
  });

  const updateUserRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      toast.success("Perfil do usuário atualizado");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    },
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      utils.admin.listUsers.invalidate();
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
      toast.success("Usuário excluído com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir usuário: ${error.message}`);
    },
  });

  const bulkDeleteUsersMutation = trpc.admin.bulkDeleteUsers.useMutation({
    onSuccess: (data) => {
      utils.admin.listUsers.invalidate();
      setIsBulkDeleteDialogOpen(false);
      setSelectedUserIds([]);
      toast.success(`${data.deleted} usuário(s) excluído(s) com sucesso`);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir usuários: ${error.message}`);
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.name || !newUser.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    if (newUser.role === "therapist" && newUser.specialties.length === 0) {
      toast.error("Selecione pelo menos uma especialidade para o terapeuta");
      return;
    }

    createUserMutation.mutate(newUser);
  };

  const handleUpdateRole = () => {
    if (!selectedUser) return;
    updateUserRoleMutation.mutate({
      userId: selectedUser.id,
      role: selectedUser.role,
    });
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteUserMutation.mutate({ userId: selectedUser.id });
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) return;
    bulkDeleteUsersMutation.mutate({ userIds: selectedUserIds });
  };

  // Bulk selection helpers
  const handleSelectUser = (userId: number, checked: boolean) => {
    if (checked) {
      setSelectedUserIds((prev) => [...prev, userId]);
    } else {
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && users) {
      // Exclude current user from select-all (can't delete yourself)
      setSelectedUserIds(
        users.filter((u) => u.id !== currentUser?.id).map((u) => u.id)
      );
    } else {
      setSelectedUserIds([]);
    }
  };

  const selectableUsers = users?.filter((u) => u.id !== currentUser?.id) ?? [];
  const allSelectableSelected =
    selectableUsers.length > 0 &&
    selectableUsers.every((u) => selectedUserIds.includes(u.id));
  const someSelected = selectedUserIds.length > 0;

  const selectedUsersData = users?.filter((u) => selectedUserIds.includes(u.id)) ?? [];

  const roleLabels: Record<string, string> = {
    family: "Família",
    therapist: "Terapeuta",
    admin: "Administrador",
  };

  const roleColors: Record<string, string> = {
    family: "bg-blue-100 text-blue-700",
    therapist: "bg-green-100 text-green-700",
    admin: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciar Usuários</h1>
          <p className="text-muted-foreground mt-2">
            Crie e gerencie usuários da plataforma Sapere
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>Preencha os dados do novo usuário</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nome do usuário"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil *</Label>
                <NativeSelect
                  value={newUser.role}
                  onChange={(e) => {
                    const value = e.target.value as any;
                    setNewUser({
                      ...newUser,
                      role: value,
                      specialties: value === "therapist" ? newUser.specialties : [],
                    });
                  }}
                  options={[
                    { value: "family", label: "Família" },
                    { value: "therapist", label: "Terapeuta" },
                    { value: "admin", label: "Administrador" },
                  ]}
                />
              </div>

              {newUser.role === "therapist" && (
                <div className="space-y-2">
                  <Label>Especialidades *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "Fonoaudiologia",
                      "Psicologia",
                      "Terapia Ocupacional",
                      "Psicopedagogia",
                      "Musicoterapia",
                      "Fisioterapia",
                      "Nutrição",
                      "Psicomotricidade",
                      "Aplicadora DENVER e ABA",
                    ].map((specialty) => (
                      <label key={specialty} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newUser.specialties.includes(specialty)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewUser({ ...newUser, specialties: [...newUser.specialties, specialty] });
                            } else {
                              setNewUser({
                                ...newUser,
                                specialties: newUser.specialties.filter((s) => s !== specialty),
                              });
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{specialty}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {tempPassword && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Senha temporária gerada:</strong>
                    <div className="mt-2 p-2 bg-white rounded border border-green-300 font-mono text-sm">
                      {tempPassword}
                    </div>
                    <p className="mt-2 text-xs">
                      Copie esta senha e envie ao usuário. Ele poderá alterá-la após o primeiro login.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2">
                {tempPassword ? (
                  <Button
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setTempPassword(null);
                    }}
                  >
                    Fechar
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createUserMutation.isPending}>
                      {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Famílias</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u) => u.role === "family").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terapeutas</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u) => u.role === "therapist").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.filter((u) => u.role === "admin").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>Gerencie todos os usuários da plataforma</CardDescription>
            </div>
            {someSelected && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectedUserIds.length} selecionado(s)
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Selecionados
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUserIds([])}
                >
                  Limpar Seleção
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando usuários...
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelectableSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isCurrentUser = user.id === currentUser?.id;
                    return (
                      <TableRow
                        key={user.id}
                        className={selectedUserIds.includes(user.id) ? "bg-muted/50" : ""}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={(checked) =>
                              handleSelectUser(user.id, checked as boolean)
                            }
                            disabled={isCurrentUser}
                            aria-label={`Selecionar ${user.name}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {user.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          <span>{user.name}</span>
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                          )}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              roleColors[user.role]
                            }`}
                          >
                            {roleLabels[user.role]}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), "PP", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.lastSignedIn), "PP", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isCurrentUser}
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil do Usuário</DialogTitle>
            <DialogDescription>Altere o perfil de {selectedUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editRole">Perfil</Label>
              <NativeSelect
                value={selectedUser?.role || ""}
                onChange={(e) =>
                  setSelectedUser({ ...selectedUser, role: e.target.value as any })
                }
                options={[
                  { value: "family", label: "Família" },
                  { value: "therapist", label: "Terapeuta" },
                  { value: "admin", label: "Administrador" },
                ]}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedUser(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleUpdateRole} disabled={updateUserRoleMutation.isPending}>
                {updateUserRoleMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário{" "}
              <strong>{selectedUser?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedUser(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir {selectedUserIds.length} Usuário(s)
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. Os seguintes usuários serão excluídos permanentemente:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-60 overflow-y-auto space-y-2 my-2">
            {selectedUsersData.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-2 border rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-sm">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    roleColors[u.role]
                  }`}
                >
                  {roleLabels[u.role]}
                </span>
              </div>
            ))}
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Administradores não podem ser excluídos se forem os únicos administradores do sistema.
            </AlertDescription>
          </Alert>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteUsersMutation.isPending}
            >
              {bulkDeleteUsersMutation.isPending
                ? "Excluindo..."
                : `Excluir ${selectedUserIds.length} usuário(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
