import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PhotoUpload } from "./photo-upload";

function maskCpf(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/[- ]*$/, "");
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/[- ]*$/, "");
}

export function CreateClient({ onClose }: { onClose: () => void }) {
  const { addClient, setError } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [instagram, setInstagram] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      await addClient({
        name: name.trim(),
        email,
        phone: phone.replace(/\D/g, ""),
        photo_url: photoUrl,
        birth_date: birthDate,
        cpf: cpf.replace(/\D/g, ""),
        address,
        instagram,
        referral_source: referralSource,
        notes,
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
          <DialogTitle>Adicionar Cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <PhotoUpload name={name || "?"} url={photoUrl} onUploaded={setPhotoUrl} />

          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} placeholder="Nome completo" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={maskPhone(phone)} onInput={(e) => setPhone((e.target as HTMLInputElement).value)} placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data de Nascimento</Label>
              <Input type="date" value={birthDate} onInput={(e) => setBirthDate((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <Input value={maskCpf(cpf)} onInput={(e) => setCpf((e.target as HTMLInputElement).value)} placeholder="000.000.000-00" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={address} onInput={(e) => setAddress((e.target as HTMLInputElement).value)} placeholder="Rua, número, bairro" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input value={instagram} onInput={(e) => setInstagram((e.target as HTMLInputElement).value)} placeholder="@usuario" />
            </div>
            <div className="space-y-1.5">
              <Label>Indicado por</Label>
              <Input value={referralSource} onInput={(e) => setReferralSource((e.target as HTMLInputElement).value)} placeholder="Como nos conheceu?" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)} placeholder="Preferências, alergias, etc." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={handleSubmit}>{saving ? "Salvando..." : "Adicionar Cliente"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
