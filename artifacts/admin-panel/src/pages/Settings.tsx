import { useEffect } from "react";
import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";

const settingsSchema = z.object({
  defaultMarkupPercent: z.coerce.number().min(0, "Наценка >= 0"),
  defaultStarRatePerUsd: z.coerce.number().min(1, "Курс >= 1"),
  openrouterMarkupPercent: z.coerce.number().min(0, "Наценка >= 0"),
  botWelcomeMessage: z.string().min(1, "Приветственное сообщение обязательно"),
  botSupportUsername: z.string().optional().nullable(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateSettings = useUpdateSettings();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      defaultMarkupPercent: 20,
      defaultStarRatePerUsd: 71,
      openrouterMarkupPercent: 15,
      botWelcomeMessage: "",
      botSupportUsername: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        defaultMarkupPercent: settings.defaultMarkupPercent,
        defaultStarRatePerUsd: settings.defaultStarRatePerUsd,
        openrouterMarkupPercent: settings.openrouterMarkupPercent,
        botWelcomeMessage: settings.botWelcomeMessage,
        botSupportUsername: settings.botSupportUsername || "",
      });
    }
  }, [settings, form]);

  const onSubmit = (values: SettingsFormValues) => {
    updateSettings.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Настройки сохранены" });
      },
      onError: () => toast({ title: "Ошибка при сохранении", variant: "destructive" })
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-[400px] w-full max-w-3xl" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Настройки</h1>
        <p className="text-muted-foreground mt-2">Параметры бота по умолчанию.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Цены по умолчанию</CardTitle>
              <CardDescription>Значения по умолчанию для новых моделей и пополнений.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="defaultMarkupPercent" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Наценка на AI модели (%)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="openrouterMarkupPercent" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Наценка на пополнение OpenRouter (%)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="defaultStarRatePerUsd" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Курс конвертации (Stars за 1 USD)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Текст бота и поддержка</CardTitle>
              <CardDescription>Настройте сообщения бота.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="botWelcomeMessage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Приветственное сообщение (/start)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Добро пожаловать в бот! Вот что вы можете сделать..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="botSupportUsername" render={({ field }) => (
                <FormItem>
                  <FormLabel>Юзернейм поддержки (необязательно)</FormLabel>
                  <FormControl>
                    <Input placeholder="например, support_admin" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> Сохранить
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
