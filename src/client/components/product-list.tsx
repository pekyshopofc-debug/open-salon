import { useState } from "preact/hooks";
import { useApp } from "../context";
import { Plus, Search, Trash2, AlertTriangle, Pencil, Package } from "lucide-preact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "./pagination";
import { CreateProduct } from "./create-product";
import { EditProduct } from "./edit-product";
import { Avatar } from "./avatar";

export function ProductList() {
  const { products, productsPag, setProductsPage, productsSearch, setProductsSearch, deleteProduct } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Produto
        </Button>
      </div>

      {showCreate && <CreateProduct onClose={() => setShowCreate(false)} />}
      {editingProduct && (
        <EditProduct product={products.find((p) => p.id === editingProduct)!} onClose={() => setEditingProduct(null)} />
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar produtos..." value={productsSearch} onInput={(e) => setProductsSearch((e.target as HTMLInputElement).value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Produto</TableHead>
                <TableHead className="w-24">Marca</TableHead>
                <TableHead className="w-24">Categoria</TableHead>
                <TableHead className="w-20 text-right">Preço</TableHead>
                <TableHead className="w-16 text-right">Custo</TableHead>
                <TableHead className="w-20 text-center">Estoque</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
              )}
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.photo_url ? (
                      <Avatar name={p.name} photoUrl={p.photo_url} size="sm" className="rounded-lg" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {p.sku && <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>}
                  </TableCell>
                  <TableCell className="text-sm">{p.brand || "—"}</TableCell>
                  <TableCell>
                    {p.category && <Badge variant="outline" className="text-xs">{p.category}</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-medium">R$ {p.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">R$ {p.cost.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      {p.stock <= p.low_stock_alert && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span className={p.stock <= p.low_stock_alert ? "font-medium text-amber-600" : ""}>{p.stock}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingProduct(p.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteProduct(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Pagination pag={productsPag} setPage={setProductsPage} />
    </div>
  );
}
