import { useState, useMemo, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Trash2, Edit, Users, AlertCircle, AlertTriangle, Search, ChevronDown, ChevronUp, UserPlus } from "lucide-react";
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
import { ChildFormCard, type ChildData } from "@/components/ChildFormCard";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [addChildFamilyUser, setAddChildFamilyUser] = useState<any>(null);
  const [newChildForFamily, setNewChildForFamily] = useState<ChildData>({ name: "", dateOfBirth: "", diagnosis: "", imageAuthorization: false });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // Search state
  const [userSearch, setUserSearch] = useState("");

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "family" as "family" | "therapist" | "admin",
    specialties: [] as string[],
  });

  // Estado para cadastro opcional de múltiplos filhos junto com o pai
  const [showAddChild, setShowAddChild] = useState(false);
  const emptyChild = (): ChildData => ({ name: "", dateOfBirth: "", diagnosis: "", imageAuthorization: false });
  const [children, setChildren] = useState<ChildData[]>([emptyChild()]);

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();

  const createUserMutation = trpc.admin.createUser.useMutation({
    onSuccess: (data) => {
      utils.admin.listUsers.invalidate();
      utils.patients.list.invalidate();
      setTempPassword(data.temporaryPassword);
      setNewUser({ name: "", email: "", role: "family", specialties: [] });
      toast.success("Usuário criado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    },
  });

  const createUserWithPatientMutation = trpc.admin.createUserWithPatient.useMutation({
    onSuccess: (data) => {
      utils.admin.listUsers.invalidate();
      utils.patients.list.invalidate();
      setTempPassword(data.temporaryPassword);
      setNewUser({ name: "", email: "", role: "family", specialties: [] });
      setChildren([emptyChild()]);
      setShowAddChild(false);
      const count = data.patientCount ?? 0;
      toast.success(
        count === 0 ? "Responsável criado com sucesso" :
        count === 1 ? "Responsável e 1 filho cadastrados com sucesso" :
        `Responsável e ${count} filhos cadastrados com sucesso`
      );
    },
    onError: (error) => {
      toast.error(`Erro ao criar usuário: ${error.message}`);
    },
  });

  const addChildToFamilyMutation = trpc.patients.create.useMutation({
    onSuccess: () => {
      utils.patients.list.invalidate();
      setIsAddChildDialogOpen(false);
      setAddChildFamilyUser(null);
      setNewChildForFamily({ name: "", dateOfBirth: "", diagnosis: "", imageAuthorization: false });
      toast.success("Filho cadastrado com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar filho: ${error.message}`);
    },
  });

  const handleAddChildToFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildForFamily.name.trim() || !addChildFamilyUser) {
      toast.error("Nome do filho é obrigatório");
      return;
    }
    addChildToFamilyMutation.mutate({
      name: newChildForFamily.name.trim(),
      dateOfBirth: newChildForFamily.dateOfBirth ? new Date(newChildForFamily.dateOfBirth) : undefined,
      diagnosis: newChildForFamily.diagnosis?.trim() || undefined,
      familyUserId: addChildFamilyUser.id,
      imageAuthorization: newChildForFamily.imageAuthorization,
      therapistUserId: newChildForFamily.therapistUserId || undefined,
      therapyType: (newChildForFamily.therapyType as any) || undefined,
    });
  };

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

    // Se for família, usa a mutation que suporta cadastro opcional de múltiplos filhos
    if (newUser.role === "family") {
      const validChildren = showAddChild
        ? children
            .filter(c => c.name.trim())
            .map(c => ({
              name: c.name.trim(),
              dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth) : undefined,
              diagnosis: c.diagnosis.trim() || undefined,
              imageAuthorization: c.imageAuthorization,
              therapyType: c.therapyType as any || undefined,
              therapistUserId: c.therapistUserId || undefined,
            }))
        : [];

      createUserWithPatientMutation.mutate({
        name: newUser.name,
        email: newUser.email,
        patients: validChildren.length > 0 ? validChildren : undefined,
      });
    } else {
      createUserMutation.mutate(newUser);
    }
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

  // Memoizar lista de terapeutas para o ChildFormCard
  const therapistOptions = useMemo(() => {
    if (!users) return [];
    return users
      .filter((u) => u.role === "therapist" || u.role === "admin")
      .map((u) => ({ id: u.id, name: (u.name ?? u.email) as string }));
  }, [users]);

  // Memoizar lista filtrada de usuários para evitar recálculo a cada render
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  // Handlers memoizados para ChildFormCard
  const handleUpdateChild = useCallback(
    (index: number, field: keyof ChildData, value: string | boolean | number | undefined) => {
      setChildren((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  const handleRemoveChild = useCallback(
    (index: number) => {
      setChildren((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  const handleAddChild = useCallback(() => {
    setChildren((prev) => [...prev, emptyChild()]);
  }, []);

  // Contagem memoizada de filhos válidos
  const validChildCount = useMemo(
    () => (showAddChild ? children.filter((c) => c.name.trim()).length : 0),
    [showAddChild, children]
  );

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

        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setShowAddChild(false);
              setChildren([emptyChild()]);
              setTempPassword(null);
              setNewUser({ name: "", email: "", role: "family", specialties: [] });
            }
          }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>Preencha os dados do novo usuário</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
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
                    // Resetar seção de filhos ao trocar de perfil
                    if (value !== "family") {
                      setShowAddChild(false);
                      setChildren([emptyChild()]);
                    }
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
                      "Neuropsicopedagogia",
                      "Musicoterapia",
                      "Fisioterapia",
                      "Nutrição",
                      "Psicomotricidade",
                      "Aplicadora DENVER e ABA",
                      "Assistente Terapêutico",
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

              {/* Seção opcional: cadastrar múltiplos filhos junto com o responsável */}
              {newUser.role === "family" && !tempPassword && (
                <div className="border border-orange-200/50 rounded-lg overflow-hidden transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => setShowAddChild(!showAddChild)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-orange-50/60 hover:bg-orange-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-foreground">
                        {validChildCount > 0
                          ? `${validChildCount} filho(s) a cadastrar`
                          : "Cadastrar filho(s) agora"}
                      </span>
                      <span className="text-xs text-muted-foreground">(opcional)</span>
                    </div>
                    {showAddChild
                      ? <ChevronUp className="h-4 w-4 text-orange-500" />
                      : <ChevronDown className="h-4 w-4 text-orange-500" />}
                  </button>

                  {showAddChild && (
                    <div className="p-4 space-y-3 bg-orange-50/20">
                      <p className="text-xs text-muted-foreground">
                        Os pacientes serão vinculados automaticamente a este responsável.
                      </p>

                      {children.map((child, idx) => (
                        <ChildFormCard
                          key={idx}
                          index={idx}
                          child={child}
                          canRemove={children.length > 1}
                          therapists={therapistOptions}
                          onUpdate={handleUpdateChild}
                          onRemove={handleRemoveChild}
                        />
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddChild}
                        className="w-full border-dashed border-orange-300/60 text-orange-600 hover:bg-orange-50 hover:border-orange-400 transition-all"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar outro filho
                      </Button>
                    </div>
                  )}
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
              </div>{/* fim da área rolável */}

              <div className="flex justify-end gap-2 flex-shrink-0 pt-4 border-t border-border mt-2">
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
                    <Button
                      type="submit"
                      disabled={createUserMutation.isPending || createUserWithPatientMutation.isPending}
                    >
                      {(createUserMutation.isPending || createUserWithPatientMutation.isPending)
                        ? "Criando..."
                        : validChildCount === 0
                          ? "Criar Usuário"
                          : validChildCount === 1
                            ? "Criar Responsável e Filho"
                            : `Criar Responsável e ${validChildCount} Filhos`}
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
          <div className="flex flex-col gap-3">
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
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9 pr-20"
              />
              {userSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {filteredUsers.length} resultado(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => setUserSearch("")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
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
                  {filteredUsers.map((user) => {
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
                            {user.role === "family" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Adicionar filho"
                                onClick={() => {
                                  setAddChildFamilyUser(user);
                                  setNewChildForFamily({ name: "", dateOfBirth: "", diagnosis: "", imageAuthorization: false });
                                  setIsAddChildDialogOpen(true);
                                }}
                              >
                                <UserPlus className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
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

      {/* Add Child to Existing Family Dialog */}
      <Dialog open={isAddChildDialogOpen} onOpenChange={(open) => {
        setIsAddChildDialogOpen(open);
        if (!open) {
          setAddChildFamilyUser(null);
          setNewChildForFamily({ name: "", dateOfBirth: "", diagnosis: "", imageAuthorization: false });
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Adicionar Filho
            </DialogTitle>
            <DialogDescription>
              Cadastrar novo filho vinculado a <strong>{addChildFamilyUser?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddChildToFamily} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="childName">Nome Completo *</Label>
              <Input
                id="childName"
                value={newChildForFamily.name}
                onChange={(e) => setNewChildForFamily({ ...newChildForFamily, name: e.target.value })}
                placeholder="Nome do filho"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="childDob">Data de Nascimento</Label>
              <Input
                id="childDob"
                type="date"
                value={newChildForFamily.dateOfBirth}
                onChange={(e) => setNewChildForFamily({ ...newChildForFamily, dateOfBirth: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="childDiagnosis">Diagnóstico</Label>
              <Textarea
                id="childDiagnosis"
                value={newChildForFamily.diagnosis}
                onChange={(e) => setNewChildForFamily({ ...newChildForFamily, diagnosis: e.target.value })}
                placeholder="Diagnóstico inicial (opcional)"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="childTherapist">Terapeuta Responsável</Label>
                <NativeSelect
                  value={newChildForFamily.therapistUserId?.toString() || ""}
                  onChange={(e) => setNewChildForFamily({ ...newChildForFamily, therapistUserId: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Selecionar (opcional)"
                  options={therapistOptions.map((t) => ({ value: t.id.toString(), label: t.name }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="childTherapyType">Tipo de Terapia</Label>
                <NativeSelect
                  value={newChildForFamily.therapyType || ""}
                  onChange={(e) => setNewChildForFamily({ ...newChildForFamily, therapyType: e.target.value || undefined })}
                  placeholder="Selecionar (opcional)"
                  options={[
                    { value: "fonoaudiologia", label: "Fonoaudiologia" },
                    { value: "psicologia", label: "Psicologia" },
                    { value: "terapia_ocupacional", label: "Terapia Ocupacional" },
                    { value: "psicopedagogia", label: "Psicopedagogia" },
                    { value: "psicomotricidade", label: "Psicomotricidade" },
                    { value: "musicoterapia", label: "Musicoterapia" },
                    { value: "fisioterapia", label: "Fisioterapia" },
                    { value: "neuropsicopedagogia", label: "Neuropsicopedagogia" },
                    { value: "nutricao", label: "Nutrição" },
                    { value: "aplicadora_denver_aba", label: "Denver/ABA" },
                    { value: "assistente_terapeutico", label: "Assistente Terapêutico" },
                    { value: "outro", label: "Outro" },
                  ]}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Vincular terapeuta e tipo de terapia permite que o terapeuta visualize este paciente.
            </p>
            <div className="space-y-2">
              <Label>Autorização de Imagem</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="childImageAuth"
                    checked={newChildForFamily.imageAuthorization === true}
                    onChange={() => setNewChildForFamily({ ...newChildForFamily, imageAuthorization: true })}
                    className="w-4 h-4"
                  />
                  <span>Sim</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="childImageAuth"
                    checked={newChildForFamily.imageAuthorization === false}
                    onChange={() => setNewChildForFamily({ ...newChildForFamily, imageAuthorization: false })}
                    className="w-4 h-4"
                  />
                  <span>Não</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddChildDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={addChildToFamilyMutation.isPending}>
                {addChildToFamilyMutation.isPending ? "Cadastrando..." : "Cadastrar Filho"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
