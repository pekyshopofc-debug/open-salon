import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export function CreateProduct({ onClose }: { onClose: () => void }) {
  const { addProduct, setError } = useApp();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("0");
  const [cost, setCost] = useState("0");
  const [stock, setStock] = useState("0");
  const [lowStockAlert, setLowStockAlert] = useState("5");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      await addProduct({
        name: name.trim(), brand, category, sku,
        price: parseFloat(price) || 0,
        cost: parseFloat(cost) || 0,
        stock: parseInt(stock) || 0,
        low_stock_alert: parseInt(lowStockAlert) || 5,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} placeholder="Nome do produto" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input value={brand} onChange={(e) => setBrand((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input value={category} onChange={(e) => setCategory((e.target as HTMLInputElement).value)} placeholder="ex: Cuidados com o Cabelo" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku((e.target as HTMLInputElement).value)} placeholder="Opcional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço de Venda (R$)</Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Custo (R$)</Label>
              <Input type="number" step="0.01" value={cost} onChange={(e) => setCost((e.target as HTMLInputElement).value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Estoque</Label>
              <Input type="number" value={stock} onChange={(e) => setStock((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Alerta de Estoque Baixo</Label>
              <Input type="number" value={lowStockAlert} onChange={(e) => setLowStockAlert((e.target as HTMLInputElement).value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={handleSubmit}>{saving ? "Salvando..." : "Adicionar Produto"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
