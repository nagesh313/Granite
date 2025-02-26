import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Box,
  Factory,
  ClipboardCheck,
  Settings,
  Menu,
  Package,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, description: "Go to the dashboard" },
  { name: "Raw Materials", href: "/raw-materials", icon: Box, description: "Manage raw materials" },
  { name: "Production", href: "/production", icon: Factory, description: "Monitor production" },
  { name: "Machines", href: "/machines", icon: Settings, description: "Manage Machines" },
  { name: "Finished Goods", href: "/finished-goods", icon: Package, description: "View and manage finished goods" },
  { name: "Shipped Goods", href: "/shipped-goods", icon: Truck, description: "Track shipped inventory" },
];

export default function Sidebar() {
  const [location] = useLocation();

  const NavigationContent = () => (
    <>
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <svg 
            viewBox="0 0 24 24" 
            className="w-7 h-7 text-primary"
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
          </svg>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Facto
          </h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="space-y-1 px-4 py-4">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-[1.02]",
                  isActive
                    ? "bg-primary/20 text-primary shadow-sm"
                    : "text-sidebar-foreground hover:bg-primary/10"
                )}
                title={item.description}
              >
                <item.icon className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
                <span className="transition-colors group-hover:text-primary">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-sidebar-border p-4">
        <Link
          href="/settings"
          className="flex items-center px-4 py-3 text-sm font-medium rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </Link>
      </div>
    </>
  );

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-sidebar-border bg-sidebar px-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col bg-sidebar">
              <NavigationContent />
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Facto
        </h1>
      </div>
      <div className="hidden md:fixed md:flex h-screen w-64 flex-col flex-none bg-sidebar/90 border-r border-sidebar-border z-50 backdrop-blur-sm">
        <NavigationContent />
      </div>
    </>
  );
}