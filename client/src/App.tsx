import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Sidebar from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import Production from "@/pages/production";
import CuttingProduction from "@/pages/production/cutting";
import ChemicalProduction from "@/pages/production/chemical";
import GrindingProduction from "@/pages/production/grinding";
import EpoxyProduction from "@/pages/production/epoxy";
import PolishProduction from "@/pages/production/polish";
import RawMaterials from "@/pages/raw-materials";
import Settings from "@/pages/settings";
import Machines from "@/pages/machines";
import FinishedGoods from "@/pages/FinishedGoods";
import ShippedGoods from "@/pages/ShippedGoods";
import NotFound from "@/pages/not-found";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-screen bg-background md:pl-64">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/production" component={Production} />
            <Route path="/production/cutting" component={CuttingProduction} />
            <Route path="/production/chemical" component={ChemicalProduction} />
            <Route path="/production/grinding" component={GrindingProduction} />
            <Route path="/production/epoxy" component={EpoxyProduction} />
            <Route path="/production/polish" component={PolishProduction} />
            <Route path="/raw-materials" component={RawMaterials} />
            <Route path="/finished-goods" component={FinishedGoods} />
            <Route path="/shipped-goods" component={ShippedGoods} />
            <Route path="/settings" component={Settings} />
            <Route path="/machines" component={Machines} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}