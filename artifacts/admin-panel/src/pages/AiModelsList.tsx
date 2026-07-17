import { useState } from "react";
import { useListAiModels, getListAiModelsQueryKey, useCreateAiModel, useUpdateAiModel, useDeleteAiModel, useToggleAiModel } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatRUB } from "@/lib/utils";
import { ProviderBadge } from "@/components/shared/Badges";

const aiModelSchema = z.object({
  provider: z.string().min(1, "Провайдер обязателен"),
  modelId: z.string().min(1, "ID модели обязателен"),
  modelName: z.string().min(1, "Название обязательно"),
  inputPricePerMillionTokens: z.coerce.number().min(0, "Цена >= 0"),
  pricePerMillionTokens: z.coerce.number().min(0, "Цена >= 0"),
  markupPercent: z.coerce.number().min(0, "Наценка >= 0"),
  starRatePerUsd: z.coerce.number().min(1, "Курс >= 1"),
  deliveryData: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

type AiModelFormValues = z.infer<typeof aiModelSchema>;

const EMPTY_FORM: AiModelFormValues = {
  provider: "openrouter",
  modelId: "",
  modelName: "",
  inputPricePerMillionTokens: 0,
  pricePerMillionTokens: 1.0,
  markupPercent: 20,
  starRatePerUsd: 71,
  deliveryData: null,
  active: true,
};

export default function AiModelsList() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: models, isLoading } = useListAiModels({ query: { queryKey: getListAiModelsQueryKey() } });

  const createModel = useCreateAiModel();
  const updateModel = useUpdateAiModel();
  const deleteModel = useDeleteAiModel();
  const toggleModel = useToggleAiModel();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<AiModelFormValues>({
    resolver: zodResolver(aiModelSchema),
    defaultValues: EMPTY_FORM,
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEdit = (model: any) => {
    setEditingId(model.id);
    form.reset({
      provider: model.provider,
      modelId: model.modelId,
      modelName: model.modelName,
      inputPricePerMillionTokens: model.inputPricePerMillionTokens ?? 0,
      pricePerMillionTokens: model.pricePerMillionTokens,
      markupPercent: model.markupPercent,
      starRatePerUsd: model.starRatePerUsd,
      deliveryData: (model as any).deliveryData ?? null,
      active: model.active,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: AiModelFormValues) => {
    if (editingId) {
      updateModel.mutate({ id: editingId, data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAiModelsQueryKey() });
          toast({ title: "Модель обновлена" });
          setIsDialogOpen(false);
        },
        onError: () => toast({ title: "Ошибка при обновлении", variant: "destructive" })
      });
    } else {
      createModel.mutate({ data: values }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAiModelsQueryKey() });
          toast({ title: "Модель добавлена" });
          setIsDialogOpen(false);
        },
        onError: () => toast({ title: "Ошибка при создании", variant: "destructive" })
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Удалить эту модель?")) {
      deleteModel.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAiModelsQueryKey() });
          toast({ title: "Модель удалена" });
        },
        onError: () => toast({ title: "Ошибка при удалении", variant: "destructive" })
      });
    }
  };

  const handleToggle = (id: number) => {
    toggleModel.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAiModelsQueryKey() }),
      onError: () => toast({ title: "Ошибка при изменении статуса", variant: "destructive" })
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Модели</h1>
          <p className="text-muted-foreground mt-2">Управление AI моделями и ценами токенов.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Добавить модель
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Статус</TableHead>
                <TableHead>Провайдер</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>ID модели</TableHead>
                <TableHead className="text-right">Вход / 1М (₽)</TableHead>
                <TableHead className="text-right">Выход / 1М (₽)</TableHead>
                <TableHead className="text-right">Stars/USD</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : models?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Модели не настроены
                  </TableCell>
                </TableRow>
              ) : (
                models?.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      <Switch
                        checked={model.active}
                        onCheckedChange={() => handleToggle(model.id)}
                        disabled={toggleModel.isPending}
                      />
                    </TableCell>
                    <TableCell><ProviderBadge provider={model.provider} /></TableCell>
                    <TableCell className="font-medium text-foreground">
                      {model.modelName}
                      {!model.active && <Badge variant="outline" className="ml-2 text-[10px]">Неактивна</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{model.modelId}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatRUB((model as any).inputPricePerMillionTokens ?? 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatRUB(model.pricePerMillionTokens)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{model.starRatePerUsd}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(model)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(model.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
        <DialogContent className="sm:max-w-[500px] flex flex-col max-h-[90vh]">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingId ? "Редактировать модель" : "Добавить модель"}</DialogTitle>
            <DialogDescription>
              Настройте модель и цены токенов.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 pr-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="provider" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Провайдер</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите провайдера" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="openrouter">OpenRouter</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="google">Google</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="modelName" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Название</FormLabel>
                      <FormControl><Input placeholder="например, Claude 3.5 Sonnet" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="modelId" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>ID модели провайдера</FormLabel>
                      <FormControl><Input placeholder="например, anthropic/claude-3-sonnet" {...field} disabled={!!editingId} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="col-span-2 text-sm font-medium text-muted-foreground mt-2 border-b border-border pb-2">
                    Цены (USD за 1 млн токенов)
                  </div>

                  <FormField control={form.control} name="inputPricePerMillionTokens" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Входные (промпт)</FormLabel>
                      <FormControl><Input type="number" step="0.0001" placeholder="0.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="pricePerMillionTokens" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Выходные (ответ) ★</FormLabel>
                      <FormControl><Input type="number" step="0.0001" placeholder="1.00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <p className="col-span-2 text-xs text-muted-foreground -mt-2">
                    ★ Оплата пользователем рассчитывается по цене выходных токенов + 20% наценка
                  </p>

                  <FormField control={form.control} name="starRatePerUsd" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Курс (Stars за 1 USD)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="col-span-2 text-sm font-medium text-muted-foreground mt-2 border-b border-border pb-2">
                    Данные для выдачи после оплаты
                  </div>

                  <FormField control={form.control} name="deliveryData" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Аккаунт / ссылка / данные подписки</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={"Логин: user@example.com\nПароль: pass123\nСсылка: https://..."}
                          className="min-h-[100px] font-mono text-sm resize-y"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Этот текст бот отправит пользователю отдельным сообщением после успешной оплаты.
                        Оставьте пустым, если выдача данных не нужна.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="active" render={({ field }) => (
                    <FormItem className="col-span-2 flex flex-row items-center justify-between rounded-sm border border-border p-4 mt-2">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Активна</FormLabel>
                        <div className="text-sm text-muted-foreground">Модель будет доступна пользователям.</div>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              <DialogFooter className="shrink-0 mt-4 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
                <Button type="submit" disabled={createModel.isPending || updateModel.isPending}>
                  {editingId ? "Сохранить" : "Добавить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
