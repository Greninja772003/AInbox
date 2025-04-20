import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  Send,
  Settings,
  ChevronRight,
  ChevronLeft,
  Edit,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import EmailCompose from "../email/EmailCompose";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showComposeEmail, setShowComposeEmail] = useState(false);

  const navItems = [
    {
      to: "/dashboard",
      icon: <LayoutDashboard size={20} />,
      label: "Dashboard",
    },
    { to: "/inbox", icon: <Inbox size={20} />, label: "Inbox" },
    { to: "/sent", icon: <Send size={20} />, label: "Sent" },
    { to: "/calendar", icon: <Calendar size={20} />, label: "Calendar" },
  ];

  return (
    <>
      <div
        className={cn(
          "bg-sidebar text-sidebar-foreground h-screen flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="p-4 flex items-center">
          {!collapsed && (
            <>
              <img src="/logo.png" alt="AInbox Logo" className="w-8 h-8 mr-2" />
              <h1 className="text-xl font-bold tracking-wide">AInbox</h1>
            </>
          )}
          {collapsed && (
            <img
              src="/converted_image.png"
              alt="AInbox Logo"
              className="w-8 h-8 mx-auto"
            />
          )}
        </div>

        <div className="mt-2 px-3">
          <Button
            variant="default"
            size="sm"
            className={cn(
              "w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-accent flex items-center justify-center",
              collapsed ? "px-2" : ""
            )}
            onClick={() => setShowComposeEmail(true)}
          >
            <Edit size={16} className={collapsed ? "" : "mr-1"} />
            {!collapsed && <span>Compose</span>}
          </Button>
        </div>

        <div className="flex-1 overflow-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-2 rounded-md transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/10",
                    collapsed ? "justify-center" : ""
                  )
                }
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t border-sidebar-border">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 py-2 rounded-md transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/10",
                collapsed ? "justify-center" : ""
              )
            }
          >
            <Settings size={20} />
            {!collapsed && <span className="ml-3">Settings</span>}
          </NavLink>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center w-full px-3 py-2 mt-2 rounded-md transition-colors hover:bg-sidebar-accent/10"
          >
            {collapsed ? (
              <ChevronRight size={20} className="mx-auto" />
            ) : (
              <>
                <ChevronLeft size={20} />
                <span className="ml-3">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showComposeEmail && (
        <EmailCompose onClose={() => setShowComposeEmail(false)} />
      )}
    </>
  );
};

export default Sidebar;
