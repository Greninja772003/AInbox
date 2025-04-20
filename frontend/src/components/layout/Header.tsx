import { useState } from "react";
import { User, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.get("http://localhost:5000/auth/logout", {
        withCredentials: true,
      });
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Handler for AI Assistant button click
  const handleNavigateToAISettings = () => {
    // Navigate to settings page with AI preferences tab selected
    navigate("/settings?tab=ai");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-end">
      <div className="flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleNavigateToAISettings}
        >
          <Bot size={16} />
          <span>AI Assistant</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={handleNavigateToAISettings}>
              AI Agent Preferences
            </DropdownMenuItem>
            <DropdownMenuItem>Help & Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-500">
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
