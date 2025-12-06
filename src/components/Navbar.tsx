import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  LayoutDashboard,
  FileText,
  List,
  Copy,
  Terminal,
  LogOut,
} from "lucide-react";

export function Navbar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/statements", label: "Statements", icon: FileText },
    { href: "/transactions", label: "Audit", icon: List },
    { href: "/duplicates", label: "Duplicates", icon: Copy },
    { href: "/prompt-tester", label: "Tools", icon: Terminal },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname !== "/") return false;
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-foreground">
                Ceban Pertama
              </Link>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {links.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground"
                  }`}
                >
                  <link.icon className="w-4 h-4 mr-2" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden md:flex md:items-center md:ml-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
              className="text-muted-foreground hover:text-red-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
          <div className="-mr-2 flex items-center md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Main menu"
            >
              {isOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive(link.href)
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:bg-gray-50 hover:border-gray-300 hover:text-foreground"
                }`}
              >
                <link.icon className="w-5 h-5 mr-3" />
                {link.label}
              </Link>
            ))}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <button
                onClick={() => signOut()}
                className="flex w-full items-center pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
