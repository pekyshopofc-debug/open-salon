import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PhotoUpload } from "./photo-upload";
import type { Staff } from "../types";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6", "#f97316"];

export function EditStaff({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const { updateStaff, setError } = useApp();
  const [name, setName] = useState(staff.name);
  const [email, setEmail] = useState(staff.email);
  const [phone, setPhone] = useState(staff.phone);
  const [photoUrl, setPhotoUrl] = useState(staff.photo_url);
  const [bio, setBio] = useState(staff.bio);
  const [specialties, setSpecialties] = useState(staff.specialties);
  const [commissionRate, setCommissionRate] = useState(String(staff.commission_rate));
  const [hireDate, setHireDate] = useState(staff.hire_date);
  const [title, setTitle] = useState(staff.title);
  const [color, setColor] = useState(staff.color);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      await updateStaff(staff.id, {
        name: name.trim(),
        email, phone,
        photo_url: photoUrl,
        bio, specialties,
        commission_rate: parseFloat(commissionRate) || 0,
        hire_date: hireDate,
        title, color,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar {staff.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <PhotoUpload name={name || "?"} color={color} url={photoUrl} onUploaded={setPhotoUrl} />

          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cargo / Função</Label>
            <Input value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={phone} onInput={(e) => setPhone((e.target as HTMLInputElement).value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Biografia</Label>
            <Textarea rows={2} value={bio} onInput={(e) => setBio((e.target as HTMLTextAreaElement).value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Especialidades</Label>
            <Input value={specialties} onInput={(e) => setSpecialties((e.target as HTMLInputElement).value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Comissão (%)</Label>
              <Input type="number" step="0.1" value={commissionRate} onInput={(e) => setCommissionRate((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Contratação</Label>
              <Input type="date" value={hireDate} onInput={(e) => setHireDate((e.target as HTMLInputElement).value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-8 w-8 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-ring ring-offset-2" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={handleSubmit}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
