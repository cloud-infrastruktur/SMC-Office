"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MapPin, Globe, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";


export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    website: "", // Honeypot-Feld (für Bots unsichtbar)
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Nachricht gesendet!",
          description: "Vielen Dank für Ihre Nachricht. Wir melden uns bald bei Ihnen.",
        });

        // Reset form
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
          website: "",
        });
      } else {
        toast({
          title: "Fehler",
          description: data.error || "Beim Senden der Nachricht ist ein Fehler aufgetreten.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Beim Senden der Nachricht ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-600 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent pb-1">
              Kontakt
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Haben Sie Fragen oder möchten Sie ein Projekt besprechen? Wir freuen uns auf Ihre
              Nachricht!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20 px-4 bg-white dark:bg-slate-900">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Schreiben Sie uns</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ihr Name"
                    className="w-full dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    E-Mail *
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="ihre.email@beispiel.de"
                    className="w-full dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefon (optional)
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+49 123 456789"
                    className="w-full dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>

                {/* Honeypot-Feld - unsichtbar für Menschen, Bots füllen es aus */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <Input
                    id="website"
                    name="website"
                    type="text"
                    value={formData.website}
                    onChange={handleChange}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Betreff (optional)
                  </label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Betreff Ihrer Nachricht"
                    className="w-full dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nachricht *
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Ihre Nachricht an uns..."
                    rows={6}
                    className="w-full dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder-gray-400"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-5 w-5" />
                      Nachricht senden
                    </>
                  )}
                </Button>
              </form>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Kontaktinformationen</h2>
                <div className="space-y-6">
                  <ContactInfoCard
                    icon={MapPin}
                    title="Adresse"
                    content={
                      <>
                        Schwarz Management Consulting GmbH
                        <br />
                        Oberer Rusterweg 7<br />
                        53639 Königswinter
                      </>
                    }
                  />
                  <ContactInfoCard
                    icon={Mail}
                    title="E-Mail"
                    content={
                      <a
                        href="mailto:ts@smc.nrw"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        ts@smc.nrw
                      </a>
                    }
                  />
                  <ContactInfoCard
                    icon={Globe}
                    title="Website"
                    content={
                      <a
                        href="https://smc.nrw"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        smc.nrw
                      </a>
                    }
                  />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8 border border-gray-100 dark:border-slate-600">
                <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Geschäftszeiten</h3>
                <p className="text-gray-700 dark:text-gray-300">
                  Wir sind flexibel für Sie da. Kontaktieren Sie uns und wir vereinbaren einen
                  passenden Termin für ein persönliches Gespräch.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ContactInfoCard({
  icon: Icon,
  title,
  content,
}: {
  icon: any;
  title: string;
  content: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-slate-700">
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
        <div className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{content}</div>
      </div>
    </div>
  );
}
