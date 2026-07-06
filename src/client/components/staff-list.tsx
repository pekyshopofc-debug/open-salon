import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Trash2, Pencil, Power, PowerOff } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateStaff } from "./create-staff";
import { EditStaff } from "./edit-staff";
import { Avatar } from "./avatar";

export function StaffList() {
  const { staffMembers, deleteStaff, updateStaff } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [editingStaff, setEditingStaff] = useState<number | null>(null);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Equipe</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Equipe
        </Button>
      </div>

      {showCreate && <CreateStaff onClose={() => setShowCreate(false)} />}
      {editingStaff && (
        <EditStaff staff={staffMembers.find((s) => s.id === editingStaff)!} onClose={() => setEditingStaff(null)} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staffMembers.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-start gap-4 p-4">
              <Avatar name={s.name} photoUrl={s.photo_url} color={s.color} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">{s.name}</h3>
                  {!s.active && <Badge variant="secondary">Inativo</Badge>}
                </div>
                {s.title && <p className="text-sm text-muted-foreground truncate">{s.title}</p>}
                {s.email && <p className="text-xs text-muted-foreground truncate">{s.email}</p>}
                {s.phone && <p className="text-xs text-muted-foreground truncate">{s.phone}</p>}
                {s.specialties && <p className="text-xs text-muted-foreground truncate">{s.specialties}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{s.appointment_count || 0} agendamentos</p>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingStaff(s.id)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {s.active ? (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => updateStaff(s.id, { active: 0 })}>
                    <PowerOff className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateStaff(s.id, { active: 1 })}>
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteStaff(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {staffMembers.length === 0 && (
          <p className="col-span-full py-12 text-center text-muted-foreground">Nenhum membro da equipe ainda</p>
        )}
      </div>
    </div>
  );
}
