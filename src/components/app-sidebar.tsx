import { useSession } from "@better-auth-ui/react";
import { createLink } from "@tanstack/react-router";
import {
  Calculator,
  ClipboardList,
  LayoutDashboard,
  Package,
  Scissors,
  Shield,
  Users,
} from "lucide-react";
import { OrganizationSwitcher } from "#/components/auth/organization/organization-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "#/components/ui/sidebar";
import { authClient } from "#/lib/auth/client";

const navItems = [
  {
    group: "Inicio",
    items: [{ label: "Panel", icon: LayoutDashboard, to: "/app" }],
  },
  {
    group: "Catálogo",
    items: [
      { label: "Materiales", icon: Package, to: "/app/materials" },
      { label: "Operaciones", icon: Scissors, to: "/app/operations" },
    ],
  },
  {
    group: "Clientes",
    items: [{ label: "Clientes", icon: Users, to: "/app/clients" }],
  },
  {
    group: "Presupuestos",
    items: [{ label: "Presupuestos", icon: Calculator, to: "/app/budgets" }],
  },
  {
    group: "Cotizaciones",
    items: [{ label: "Cotizaciones", icon: ClipboardList, to: "/app/quotations" }],
  },
];

const SidebarLink = createLink(SidebarMenuButton);

export function AppSidebar() {
  const { data: session } = useSession<typeof authClient>(authClient);
  const isAdmin = session?.user?.role === "admin";

  return (
    <Sidebar>
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {navItems.map(({ group, items }) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ label, icon: Icon, to }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarLink
                      to={to}
                      activeOptions={{ exact: true }}
                      activeProps={{ isActive: true }}
                      // biome-ignore lint/a11y/useValidAnchor: its passed from the Link
                      render={<a />}
                    >
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </SidebarLink>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarLink
                    to="/app/admin/whitelist"
                    activeOptions={{ exact: true }}
                    activeProps={{ isActive: true }}
                  >
                    <Shield className="size-4" />
                    <span>Usuarios Permitidos</span>
                  </SidebarLink>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
