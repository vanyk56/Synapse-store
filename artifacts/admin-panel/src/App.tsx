import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Shell } from '@/components/layout/Shell';

import Dashboard from '@/pages/Dashboard';
import UsersList from '@/pages/UsersList';
import UserDetail from '@/pages/UserDetail';
import ProductsList from '@/pages/ProductsList';
import AiModelsList from '@/pages/AiModelsList';
import OrdersList from '@/pages/OrdersList';
import OrderDetail from '@/pages/OrderDetail';
import Settings from '@/pages/Settings';
import Broadcast from '@/pages/Broadcast';

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/users" component={UsersList} />
        <Route path="/users/:id" component={UserDetail} />
        <Route path="/products" component={ProductsList} />
        <Route path="/ai-models" component={AiModelsList} />
        <Route path="/orders" component={OrdersList} />
        <Route path="/orders/:id" component={OrderDetail} />
        <Route path="/broadcast" component={Broadcast} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
