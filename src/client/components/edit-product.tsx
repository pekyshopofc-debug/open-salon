import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PhotoUpload } from "./photo-upload";
import type { Product } from "../types";

export function EditProduct({ product, onClose }: { product: Product; onClose: () => void }) {
  const { updateProduct, setError } = useApp();
  const [name, setName] = useState(product.name);
  const [brand, setBrand] = useState(product.brand);
  const [category, setCategory] = useState(product.category);
  const [sku, setSku] = useState(product.sku);
  const [photoUrl, setPhotoUrl] = useState(product.photo_url);
  const [price, setPrice] = useState(String(product.price));
  const [cost, setCost] = useState(String(product.cost));
  const [stock, setStock] = useState(String(product.stock));
  const [lowStockAlert, setLowStockAlert] = useState(String(product.low_stock_alert));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      await updateProduct(product.id, {
        name: name.trim(), brand, category, sku,
        photo_url: photoUrl,
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
          <DialogTitle>Editar {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <PhotoUpload name={name || "?"} url={photoUrl} onUploaded={setPhotoUrl} shape="square" />

          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marca</Label>
              <Input value={brand} onInput={(e) => setBrand((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input value={category} onInput={(e) => setCategory((e.target as HTMLInputElement).value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>SKU</Label>
            <Input value={sku} onInput={(e) => setSku((e.target as HTMLInputElement).value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Preço de Venda (R$)</Label>
              <Input type="number" step="0.01" value={price} onInput={(e) => setPrice((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Custo (R$)</Label>
              <Input type="number" step="0.01" value={cost} onInput={(e) => setCost((e.target as HTMLInputElement).value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Estoque</Label>
              <Input type="number" value={stock} onInput={(e) => setStock((e.target as HTMLInputElement).value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Alerta de Estoque Baixo</Label>
              <Input type="number" value={lowStockAlert} onInput={(e) => setLowStockAlert((e.target as HTMLInputElement).value)} />
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
