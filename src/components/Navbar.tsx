import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user ?? null);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadDisplayName = async () => {
      if (!user) {
        setDisplayName("");
        return;
      }

      const fallbackName = user.email?.split("@")[0] || "User";
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      setDisplayName(data?.full_name || fallbackName);
    };

    loadDisplayName();
  }, [user]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Logged out successfully");
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <img src={logo} alt="LockNGo" className="h-10 w-10" />
            <span className="bg-gradient-hero bg-clip-text text-transparent">LockNGo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/stations" className="text-foreground hover:text-primary transition-colors">
              Stations
            </Link>
            <Link to="/about" className="text-foreground hover:text-primary transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-foreground hover:text-primary transition-colors">
              Contact
            </Link>
          </div>

          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/dashboard"
                className="group relative inline-flex items-center rounded-full px-3 py-1 text-sm text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:rotate-2 hover:text-primary"
              >
                <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-orange-400/20 via-yellow-300/20 to-emerald-300/20 opacity-0 blur-md transition-all duration-300 group-hover:opacity-100 group-hover:blur-lg group-hover:animate-pulse"></span>
                Hello, <span className="font-semibold text-foreground group-hover:text-primary">{displayName}</span>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <Link to="/auth">
                <Button variant="outline">Login</Button>
              </Link>
              <Link to="/auth?signup=true">
                <Button>Sign Up</Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <Link
              to="/stations"
              className="block py-2 text-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Stations
            </Link>
            <Link
              to="/about"
              className="block py-2 text-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/contact"
              className="block py-2 text-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
            {user ? (
              <div className="flex flex-col gap-2 pt-4">
                <Link
                  to="/dashboard"
                  className="group relative inline-flex items-center rounded-full px-3 py-1 text-sm text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:rotate-2 hover:text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-orange-400/20 via-yellow-300/20 to-emerald-300/20 opacity-0 blur-md transition-all duration-300 group-hover:opacity-100 group-hover:blur-lg group-hover:animate-pulse"></span>
                  Hello, <span className="font-semibold text-foreground group-hover:text-primary">{displayName}</span>
                </Link>
                <Button variant="outline" className="w-full" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-4">
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Login</Button>
                </Link>
                <Link to="/auth?signup=true" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
