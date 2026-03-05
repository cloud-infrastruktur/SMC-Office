"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Mail,
  Server,
  Save,
  Loader2,
  ArrowLeft,
  TestTube,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  contactEmail: string;
}

export default function SmtpConfigPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [config, setConfig] = useState<SmtpConfig>({
    host: "",
    port: 587,
    secure: true,
    username: "",
    password: "",
    fromEmail: "",
    fromName: "Schwarz Management Consulting",
    contactEmail: "projektanfragen@smc-office.eu",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (!["admin", "ADMIN"].includes(userRole)) {
        router.push("/");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch("/api/admin/smtp");
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setConfig({
              host: data.host || "",
              port: data.port || 587,
              secure: data.secure ?? true,
              username: data.username || "",
              password: data.password || "",
              fromEmail: data.fromEmail || "",
              fromName: data.fromName || "Schwarz Management Consulting",
              contactEmail: data.contactEmail || "projektanfragen@smc-office.eu",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching SMTP config:", error);
      } finally {
        setIsLoading(false);
      }
    }
    if (status === "authenticated") {
      fetchConfig();
    }
  }, [status]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Gespeichert!",
          description: "SMTP-Konfiguration wurde erfolgreich gespeichert.",
        });
      } else {
        toast({
          title: "Fehler",
          description: data.error || "Fehler beim Speichern.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await fetch("/api/admin/smtp/test", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Test erfolgreich!",
          description: data.details || `Test-E-Mail wurde an ${config.contactEmail} gesendet.`,
        });
      } else {
        // Detaillierte Fehlermeldung anzeigen
        const errorDetails = data.details ? `\n\n${data.details}` : '';
        const errorHelp = data.help ? `\n\n${data.help}` : '';
        
        toast({
          title: data.error || "Test fehlgeschlagen",
          description: `${data.error || "E-Mail konnte nicht gesendet werden."}${errorDetails}${errorHelp}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;
  if (!session || !["admin", "ADMIN"].includes(userRole)) {
    return null;
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link
            href="/admin"
            className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SMTP-Konfiguration</h1>
              <p className="text-gray-600">E-Mail-Einstellungen für Kontaktformular und Passwort-Reset</p>
            </div>
          </div>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8"
        >
          <div className="flex items-start gap-3">
            <Server className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">SMTP-Server Informationen</p>
              <p className="text-sm text-blue-700">
                Konfigurieren Sie hier Ihren SMTP-Server für den E-Mail-Versand. Diese Einstellungen werden für das
                Kontaktformular und die Passwort-zurücksetzung verwendet.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6"
        >
          <div className="space-y-6">
            {/* Server Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Server-Einstellungen</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host *</label>
                  <Input
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Port *</label>
                  <Input
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 587 })}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.secure}
                    onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">SSL/TLS verwenden (empfohlen)</span>
                </label>
              </div>
            </div>

            {/* Authentication */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentifizierung</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Benutzername *</label>
                  <Input
                    value={config.username}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passwort *</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sender Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Absender-Einstellungen</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Absender E-Mail *</label>
                  <Input
                    type="email"
                    value={config.fromEmail}
                    onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                    placeholder="noreply@smc-office.eu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Absender Name *</label>
                  <Input
                    value={config.fromName}
                    onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                    placeholder="Schwarz Management Consulting"
                  />
                </div>
              </div>
            </div>

            {/* Contact Form Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontaktformular</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empfänger für Kontaktanfragen *
                </label>
                <Input
                  type="email"
                  value={config.contactEmail}
                  onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                  placeholder="projektanfragen@smc-office.eu"
                />
                <p className="text-sm text-gray-500 mt-1">
                  An diese Adresse werden alle Kontaktformular-Nachrichten gesendet.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Wird gespeichert...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Konfiguration speichern</>
                )}
              </Button>
              <Button
                onClick={handleTest}
                disabled={isTesting || !config.host}
                variant="outline"
                className="flex-1"
              >
                {isTesting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Wird getestet...</>
                ) : (
                  <><TestTube className="w-4 h-4 mr-2" /> Test-E-Mail senden</>
                )}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Common SMTP Providers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 bg-gray-50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Häufige SMTP-Einstellungen</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white rounded-lg p-4 border">
              <p className="font-medium text-gray-900">IONOS / 1&1</p>
              <p className="text-gray-600">Host: smtp.ionos.de | Port: 587 | SSL: Ja</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <p className="font-medium text-gray-900">Strato</p>
              <p className="text-gray-600">Host: smtp.strato.de | Port: 465 | SSL: Ja</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <p className="font-medium text-gray-900">All-Inkl</p>
              <p className="text-gray-600">Host: smtp.all-inkl.com | Port: 587 | SSL: Ja</p>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <p className="font-medium text-gray-900">HostEurope</p>
              <p className="text-gray-600">Host: smtp.hosteurope.de | Port: 587 | SSL: Ja</p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
