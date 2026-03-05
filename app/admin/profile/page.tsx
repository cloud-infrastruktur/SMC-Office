"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  User,
  Building2,
  Briefcase,
  GraduationCap,
  Target,
  Loader2,
  Upload,
  Image as ImageIcon,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface ProfileField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date';
  category: string;
}

const profileFields: ProfileField[] = [
  // Personal
  { key: 'personal_name', label: 'Name', type: 'text', category: 'personal' },
  { key: 'personal_birthdate', label: 'Geburtsdatum', type: 'text', category: 'personal' },
  { key: 'personal_nationality', label: 'Nationalität', type: 'text', category: 'personal' },
  { key: 'personal_family', label: 'Familie', type: 'text', category: 'personal' },
  { key: 'personal_motto', label: 'Motto', type: 'text', category: 'personal' },
  
  // Company
  { key: 'company_name', label: 'Firmenname', type: 'text', category: 'company' },
  { key: 'company_founded', label: 'Gründungsjahr', type: 'text', category: 'company' },
  { key: 'company_description', label: 'Firmenbeschreibung', type: 'textarea', category: 'company' },
  { key: 'company_philosophy', label: 'Philosophie', type: 'text', category: 'company' },
  { key: 'company_address', label: 'Adresse', type: 'textarea', category: 'company' },
  { key: 'company_email', label: 'E-Mail', type: 'text', category: 'company' },
  { key: 'company_website', label: 'Website', type: 'text', category: 'company' },
  
  // Career
  { key: 'career_current', label: 'Aktuelle Position (Zeitraum)', type: 'text', category: 'career' },
  { key: 'career_current_title', label: 'Aktuelle Position (Titel)', type: 'text', category: 'career' },
  { key: 'career_current_desc', label: 'Aktuelle Position (Beschreibung)', type: 'textarea', category: 'career' },
  { key: 'career_founding', label: 'Firmengründung (Zeitraum)', type: 'text', category: 'career' },
  { key: 'career_founding_title', label: 'Firmengründung (Titel)', type: 'text', category: 'career' },
  { key: 'career_founding_desc', label: 'Firmengründung (Beschreibung)', type: 'textarea', category: 'career' },
  { key: 'career_early', label: 'Frühere Position (Zeitraum)', type: 'text', category: 'career' },
  { key: 'career_early_title', label: 'Frühere Position (Titel)', type: 'text', category: 'career' },
  { key: 'career_early_desc', label: 'Frühere Position (Beschreibung)', type: 'textarea', category: 'career' },
  
  // Education
  { key: 'education_1_year', label: 'Ausbildung 1 - Jahr', type: 'text', category: 'education' },
  { key: 'education_1_title', label: 'Ausbildung 1 - Titel', type: 'text', category: 'education' },
  { key: 'education_1_subtitle', label: 'Ausbildung 1 - Untertitel', type: 'text', category: 'education' },
  { key: 'education_2_year', label: 'Ausbildung 2 - Jahr', type: 'text', category: 'education' },
  { key: 'education_2_title', label: 'Ausbildung 2 - Titel', type: 'text', category: 'education' },
  { key: 'education_2_subtitle', label: 'Ausbildung 2 - Untertitel', type: 'text', category: 'education' },
  { key: 'education_3_year', label: 'Ausbildung 3 - Jahr', type: 'text', category: 'education' },
  { key: 'education_3_title', label: 'Ausbildung 3 - Titel', type: 'text', category: 'education' },
  { key: 'education_3_subtitle', label: 'Ausbildung 3 - Untertitel', type: 'text', category: 'education' },
  { key: 'education_4_year', label: 'Ausbildung 4 - Jahr', type: 'text', category: 'education' },
  { key: 'education_4_title', label: 'Ausbildung 4 - Titel', type: 'text', category: 'education' },
  { key: 'education_4_subtitle', label: 'Ausbildung 4 - Untertitel', type: 'text', category: 'education' },
  
  // Focus keywords
  { key: 'focus_keywords', label: 'Fokus-Schlüsselwörter (kommagetrennt)', type: 'textarea', category: 'focus' },
  
  // Social Media Links
  { key: 'social_xing', label: 'XING Profil-URL', type: 'text', category: 'social' },
  { key: 'social_linkedin', label: 'LinkedIn Profil-URL', type: 'text', category: 'social' },
];

export default function AdminProfilePage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

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
    if (status === "authenticated") {
      fetchProfileData();
    }
  }, [status]);

  async function fetchProfileData() {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        const dataMap: Record<string, string> = {};
        data.forEach((item: { key: string; value: string }) => {
          dataMap[item.key] = item.value;
          if (item.key === 'profile_photo') {
            setProfilePhoto(item.value);
          }
        });
        setFormData(dataMap);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validierung
    if (!file.type.startsWith('image/')) {
      toast({ title: "Fehler", description: "Bitte nur Bilddateien hochladen", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fehler", description: "Dateigröße max. 5MB", variant: "destructive" });
      return;
    }

    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('key', 'profile_photo');

      const res = await fetch('/api/profile/photo', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfilePhoto(data.url);
        toast({ title: "Erfolg", description: "Profilfoto wurde hochgeladen" });
      } else {
        const error = await res.json();
        toast({ title: "Fehler", description: error.error || "Upload fehlgeschlagen", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Fehler", description: "Upload fehlgeschlagen", variant: "destructive" });
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const dataArray = profileFields.map((field, index) => ({
        key: field.key,
        value: formData[field.key] || '',
        category: field.category,
        sortOrder: index,
      }));

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataArray),
      });

      if (res.ok) {
        toast({ title: "Gespeichert", description: "Profildaten wurden aktualisiert" });
      } else {
        const data = await res.json();
        const errorMessage = data.details ? `${data.error}\n\n${data.details}` : (data.error || 'Speichern fehlgeschlagen');
        toast({ 
          title: "Fehler", 
          description: errorMessage, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      toast({ 
        title: "Fehler", 
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung.", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personal': return <User className="w-5 h-5" />;
      case 'company': return <Building2 className="w-5 h-5" />;
      case 'career': return <Briefcase className="w-5 h-5" />;
      case 'education': return <GraduationCap className="w-5 h-5" />;
      case 'focus': return <Target className="w-5 h-5" />;
      case 'social': return <Share2 className="w-5 h-5" />;
      default: return <User className="w-5 h-5" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'personal': return 'Persönliche Daten';
      case 'company': return 'Unternehmensdaten';
      case 'career': return 'Beruflicher Werdegang';
      case 'education': return 'Ausbildung & Qualifikationen';
      case 'focus': return 'Fokus-Bereiche';
      case 'social': return 'Social Media Links';
      default: return category;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;
  if (!session || !["admin", "ADMIN"].includes(userRole)) return null;

  const categories = ['personal', 'company', 'career', 'education', 'focus'];

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Zurück zum Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Profil & Unternehmen</h1>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Speichern...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Alle speichern</>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Profilfoto Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8"
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Profilfoto</h2>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Foto-Vorschau */}
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-blue-100 flex-shrink-0">
              {profilePhoto ? (
                <Image
                  src={profilePhoto}
                  alt="Profilfoto"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Upload Button */}
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-3">
                Laden Sie ein professionelles Foto hoch (max. 5MB, JPG/PNG).
                Dieses wird auf der &quot;Über mich&quot;-Seite angezeigt.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                {photoUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wird hochgeladen...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Foto hochladen
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  disabled={photoUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
          {categories.map((category, catIndex) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  {getCategoryIcon(category)}
                </div>
                <h2 className="text-xl font-bold">{getCategoryLabel(category)}</h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {profileFields
                  .filter(f => f.category === category)
                  .map((field) => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                          rows={3}
                        />
                      ) : (
                        <Input
                          value={formData[field.key] || ''}
                          onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                        />
                      )}
                    </div>
                  ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Speichern...</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Alle Änderungen speichern</>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
