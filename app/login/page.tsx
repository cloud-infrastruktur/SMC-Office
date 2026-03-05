"use client";

import { useState, Suspense, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session, status } = useSession() || {};
  
  // callbackUrl aus der Middleware oder default zu /downloads
  const callbackUrl = searchParams.get("callbackUrl") || "/downloads";

  // Automatisch weiterleiten wenn bereits eingeloggt
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.replace(callbackUrl);
    }
  }, [status, session, router, callbackUrl]);

  // Zeige Loader während Session geladen wird
  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </main>
    );
  }

  // Wenn bereits eingeloggt, zeige nichts (Redirect erfolgt via useEffect)
  if (status === "authenticated") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "Fehler",
          description: "Ungültige E-Mail oder Passwort",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erfolgreich angemeldet",
          description: "Willkommen zurück!",
        });
        // Robusterer Redirect - erst router.replace, dann window.location als Fallback
        router.replace(callbackUrl);
        // Fallback: Hard redirect nach kurzer Verzögerung
        setTimeout(() => {
          window.location.href = callbackUrl;
        }, 500);
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Beim Anmelden ist ein Fehler aufgetreten",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-slate-700">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-600 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent pb-1">
            Willkommen zurück
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">Melden Sie sich an, um auf Downloads zuzugreifen</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                E-Mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre.email@beispiel.de"
                  className="pl-10 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Passwort
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Passwort vergessen?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Anmelden...
                </>
              ) : (
                "Anmelden"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Noch kein Konto?{" "}
              <Link href="/signup" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                Jetzt registrieren
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
