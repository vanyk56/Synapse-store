import { useState } from "react";
import { useListProducts, getListProductsQueryKey, useCreateProduct, useUpdateProduct, useDeleteProduct, useToggleProduct } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatStars } from "@/lib/utils";

const productSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional().nullable(),
  service: z.string().min(1, "Идентификатор обязателен"),
  price1m: z.coerce.number().min(1, "Цена за 1 месяц должна быть > 0"),
  price3m: z.coerce.number().optional().nullable(),
  price6m: z.coerce.number().optional().nullable(),
  price12m: z.coerce.number().optional().nullable(),
  active: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductsList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: products, isLoading } = useListProducts({ query: { queryKey: getListProductsQueryKey() } });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const toggleProduct = useToggleProduct();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      service: "",
      price1m: 100,
      price3m: null,
      price6m: null,
      price12m: null,
      active: true,
    },
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({ name: "", description: "", service: "", price1m: 100, price3m: null, price6m: null, price12m: null, active: true });
    setIsDialogOpen(true);
  };

  const openEdit = (product: any) => {
    setEditingId(product.id);
    form.reset({
      name: product.name,
      description: product.description || "",
      service: product.service,
      price1m: product.price1m,
      price3m: product.price3m,
      price6m: product.price6m,
      price12m: product.price12m,
      active: product.active,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: ProductFormValues) => {
    if (editingId) {
      updateProduct.mutate({ id: editingId, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: "Продукт обновлён" });
          setIsDialogOpen(false);
        },
        onError: () => toast({ title: "Ошибка при обновлении", variant: "destructive" })
      });
    } else {
      createProduct.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: "Продукт создан" });
          setIsDialogOpen(false);
        },
        onError: () => toast({ title: "Ошибка при создании", variant: "destructive" })
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Удалить этот продукт?")) {
      deleteProduct.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          toast({ title: "Продукт удалён" });
        },
        onError: () => toast({ title: "Ошибка при удалении", variant: "destructive" })
      });
    }
  };

  const handleToggle = (id: number) => {
    toggleProduct.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() }),
      onError: () => toast({ title: "Ошибка при изменении статуса", variant: "destructive" })
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Продукты</h1>
          <p className="text-muted-foreground mt-2">Управление подписками и ценами.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Добавить
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Статус</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Сервис</TableHead>
                <TableHead className="text-right">1 мес</TableHead>
                <TableHead className="text-right">3 мес</TableHead>
                <TableHead className="text-right">6 мес</TableHead>
                <TableHead className="text-right">12 мес</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-12 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : products?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Продукты не настроены
                  </TableCell>
                </TableRow>
              ) : (
                products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Switch
                        checked={product.active}
                        onCheckedChange={() => handleToggle(product.id)}
                        disabled={toggleProduct.isPending}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {product.name}
                      {!product.active && <Badge variant="outline" className="ml-2 text-[10px]">Неактивен</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.service}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatStars(product.price1m)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{product.price3m ? formatStars(product.price3m) : '–'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{product.price6m ? formatStars(product.price6m) : '–'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{product.price12m ? formatStars(product.price12m) : '–'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Редактировать продукт" : "Создать продукт"}</DialogTitle>
            <DialogDescription>
              Настройте продукт и цены в Telegram Stars.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Название</FormLabel>
                    <FormControl><Input placeholder="например, ChatGPT Plus" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="service" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Идентификатор сервиса</FormLabel>
                    <FormControl><Input placeholder="например, chatgpt_plus" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Описание (необязательно)</FormLabel>
                    <FormControl><Input placeholder="Краткое описание..." {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="col-span-2 text-sm font-medium text-muted-foreground mt-2 border-b border-border pb-2">
                  Цены (в Telegram Stars ⭐)
                </div>

                <FormField control={form.control} name="price1m" render={({ field }) => (
                  <FormItem>
                    <FormLabel>1 месяц</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="price3m" render={({ field }) => (
                  <FormItem>
                    <FormLabel>3 месяца (необязательно)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="price6m" render={({ field }) => (
                  <FormItem>
                    <FormLabel>6 месяцев (необязательно)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="price12m" render={({ field }) => (
                  <FormItem>
                    <FormLabel>12 месяцев (необязательно)</FormLabel>
                    <FormControl><Input type="number" {...field} value={field.value || ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="col-span-2 flex flex-row items-center justify-between rounded-sm border border-border p-4 mt-2">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Активен</FormLabel>
                      <div className="text-sm text-muted-foreground">Продукт будет виден пользователям.</div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                  {editingId ? "Сохранить" : "Создать"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
