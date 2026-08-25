import { createLink } from "@tanstack/react-router";
import {
  ClipboardList,
  LayoutDashboard,
  Package,
  Scissors,
  Shirt,
  ShoppingBag,
  Users,
} from "lucide-react";
import { OrganizationSwitcher } from "#/components/auth/organization/organization-switcher";
import { ThemeToggle } from "#/components/theme-toggle";
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
  useSidebar,
} from "#/components/ui/sidebar";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  to: string;
  draft?: boolean;
};

const navItems: { group: string; items: NavItem[] }[] = [
  {
    group: "Inicio",
    items: [{ label: "Panel", icon: LayoutDashboard, to: "/app" }],
  },
  {
    group: "Ventas",
    items: [
      { label: "Cotizaciones", icon: ClipboardList, to: "/app/quotations" },
      { label: "Prendas", icon: Shirt, to: "/app/garments" },
      { label: "Pedidos", icon: ShoppingBag, to: "/app/orders" },
    ],
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
];

const SidebarLink = createLink(SidebarMenuButton);

export function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();

  function closeIfMobile() {
    if (isMobile) setOpenMobile(false);
  }

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
                {items
                  .filter((item) => !item.draft || !import.meta.env.PROD)
                  .map(({ label, icon: Icon, to, draft }) => (
                    <SidebarMenuItem key={to}>
                      <SidebarLink
                        to={to}
                        activeOptions={{ exact: true, includeSearch: false }}
                        activeProps={{ isActive: true }}
                        onClick={closeIfMobile}
                        className={draft ? "draft-element" : undefined}
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
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}
