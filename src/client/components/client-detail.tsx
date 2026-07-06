import { useState } from "preact/hooks";
import { useApp } from "../context";
import { ArrowLeft, Trash2, Save, Mail, Phone, Calendar, MapPin, Instagram, User, CreditCard } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./status-badge";
import { Avatar } from "./avatar";
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

export function ClientDetail() {
  const { selectedClient: client, selectedClientAppointments: appointments, navigate, updateClient, deleteClient } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client?.name || "");
  const [email, setEmail] = useState(client?.email || "");
  const [phone, setPhone] = useState(client?.phone || "");
  const [photoUrl, setPhotoUrl] = useState(client?.photo_url || "");
  const [birthDate, setBirthDate] = useState(client?.birth_date || "");
  const [cpf, setCpf] = useState(client?.cpf || "");
  const [address, setAddress] = useState(client?.address || "");
  const [instagram, setInstagram] = useState(client?.instagram || "");
  const [referralSource, setReferralSource] = useState(client?.referral_source || "");
  const [notes, setNotes] = useState(client?.notes || "");

  if (!client) return null;

  const handleSave = async () => {
    await updateClient(client.id, {
      name, email,
      phone: phone.replace(/\D/g, ""),
      photo_url: photoUrl,
      birth_date: birthDate,
      cpf: cpf.replace(/\D/g, ""),
      address, instagram,
      referral_source: referralSource,
      notes,
    });
    setEditing(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/clients")}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
        </Button>
        <h1 className="flex-1 text-2xl font-bold">{client.name}</h1>
        <Button variant="destructive" size="sm" onClick={() => deleteClient(client.id)}>
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Detalhes</CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Editar</Button>
            ) : (
              <Button size="sm" onClick={handleSave}><Save className="mr-1 h-3.5 w-3.5" /> Salvar</Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {editing ? (
              <>
                <PhotoUpload name={name || "?"} url={photoUrl} onUploaded={setPhotoUrl} />
                <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></div>
                <div className="space-y-1.5"><Label>E-mail</Label><Input value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} /></div>
                <div className="space-y-1.5"><Label>Telefone</Label><Input value={maskPhone(phone)} onInput={(e) => setPhone((e.target as HTMLInputElement).value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Data de Nascimento</Label><Input type="date" value={birthDate} onInput={(e) => setBirthDate((e.target as HTMLInputElement).value)} /></div>
                  <div className="space-y-1.5"><Label>CPF</Label><Input value={maskCpf(cpf)} onInput={(e) => setCpf((e.target as HTMLInputElement).value)} /></div>
                </div>
                <div className="space-y-1.5"><Label>Endereço</Label><Input value={address} onInput={(e) => setAddress((e.target as HTMLInputElement).value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Instagram</Label><Input value={instagram} onInput={(e) => setInstagram((e.target as HTMLInputElement).value)} /></div>
                  <div className="space-y-1.5"><Label>Indicado por</Label><Input value={referralSource} onInput={(e) => setReferralSource((e.target as HTMLInputElement).value)} /></div>
                </div>
                <div className="space-y-1.5"><Label>Observações</Label><Textarea rows={3} value={notes} onInput={(e) => setNotes((e.target as HTMLTextAreaElement).value)} /></div>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <Avatar name={client.name} photoUrl={client.photo_url} color="#7c3aed" size="lg" />
                </div>
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {maskPhone(client.phone)}
                  </div>
                )}
                {client.birth_date && (() => {
                  const d = new Date(client.birth_date);
                  if (isNaN(d.getTime())) return null;
                  return (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {d.toLocaleDateString("pt-BR")}
                    </div>
                  );
                })()}
                {client.cpf && (
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {maskCpf(client.cpf)}
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {client.address}
                  </div>
                )}
                {client.instagram && (
                  <div className="flex items-center gap-2 text-sm">
                    <Instagram className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {client.instagram}
                  </div>
                )}
                {client.referral_source && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    Indicado por: {client.referral_source}
                  </div>
                )}
                {client.notes && <p className="text-sm text-muted-foreground pt-1 border-t">{client.notes}</p>}
                <p className="text-xs text-muted-foreground pt-1">Cliente desde {new Date(client.created_at).toLocaleDateString("pt-BR")}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Data</TableHead>
                  <TableHead className="w-16">Horário</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-20 text-right">Preço</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum agendamento ainda</TableCell></TableRow>
                )}
                {appointments.map((apt) => (
                  <TableRow key={apt.id} className="cursor-pointer" onClick={() => navigate(`/appointments/${apt.id}`)}>
                    <TableCell className="text-xs">{apt.scheduled_date}</TableCell>
                    <TableCell className="text-xs">{apt.start_time}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {apt.staff_name && <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: apt.staff_color || "#7c3aed" }} />}
                        <span className="text-sm">{apt.staff_name || "—"}</span>
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={apt.status} /></TableCell>
                    <TableCell className="text-right">R$ {apt.total_price.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
