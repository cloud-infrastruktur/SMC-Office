"use client";

import { motion } from "framer-motion";
import { Award, Calendar, Users, GraduationCap, Building2, Briefcase, User, Focus, Layers } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

interface Stats {
  projects: number;
  references: number;
  years: number;
  certificates: number;
}

interface ProfileDataItem {
  key: string;
  value: string;
  category: string;
}

interface Training {
  id: string;
  title: string;
  provider: string | null;
  link: string | null;
  isHighlight: boolean;
}

// Statische Berechnung um Hydration-Mismatch zu vermeiden
// Firmengründung: 1993, Projekterfahrung (Adam Opel AG Start): 1997
const YEARS_COMPANY = new Date().getFullYear() - 1993;
const YEARS_PROJECT_EXPERIENCE = new Date().getFullYear() - 1997;

export default function AboutPage() {
  const [stats, setStats] = useState<Stats>({ projects: 19, references: 18, years: YEARS_PROJECT_EXPERIENCE, certificates: 13 });
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [projectsRes, referencesRes, profileRes, trainingsRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/references'),
          fetch('/api/profile'),
          fetch('/api/trainings'),
        ]);

        const projects = projectsRes.ok ? await projectsRes.json() : [];
        const references = referencesRes.ok ? await referencesRes.json() : [];
        const profileData = profileRes.ok ? await profileRes.json() : [];
        const trainingsData = trainingsRes.ok ? await trainingsRes.json() : [];

        // Zähle einzigartige Kunden (nicht Projekte) für Referenz-Kunden
        const uniqueClients = new Set(
          references.map((r: { displayClient?: string; client?: string }) => r.displayClient || r.client)
        ).size;

        setStats({
          projects: projects.length,
          references: uniqueClients,
          years: YEARS_PROJECT_EXPERIENCE,
          certificates: trainingsData.length || 13,
        });

        const profileMap: Record<string, string> = {};
        profileData.forEach((item: ProfileDataItem) => {
          profileMap[item.key] = item.value;
          if (item.key === 'profile_photo' && item.value) {
            setProfilePhoto(item.value);
          }
        });
        setProfile(profileMap);
        setTrainings(trainingsData.filter((t: Training) => t.isHighlight).slice(0, 4));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Use profile data or defaults
  const name = profile.personal_name || 'Thomas Schwarz';
  const birthdate = profile.personal_birthdate || '22.12.1962';
  const nationality = profile.personal_nationality || 'Deutsch';
  const family = profile.personal_family || 'Verheiratet, drei Kinder';
  const motto = profile.personal_motto || 'LEBEN UND LEBEN LASSEN';
  const companyName = profile.company_name || 'Schwarz Management Consulting GmbH';
  const founded = profile.company_founded || '1993';
  const companyDesc = profile.company_description || 'Seit der Gründung im Jahr 1993 steht Schwarz Management Consulting für exzellente IT-Beratung mit einem ganzheitlichen Ansatz im IT-Projektgeschäft.';
  const philosophy = profile.company_philosophy || 'Menschen im Mittelpunkt aller Projekte';

  // Education from profile or defaults
  const educationItems = [
    { year: profile.education_1_year || '1991-1992', title: profile.education_1_title || 'Geprüfter Handelsfachwirt', subtitle: profile.education_1_subtitle || 'IHK mit Abschluss' },
    { year: profile.education_2_year || '1992', title: profile.education_2_title || 'Ausbildung zum Ausbilder', subtitle: profile.education_2_subtitle || 'IHK mit Abschluss' },
    { year: profile.education_3_year || '1980-1982', title: profile.education_3_title || 'Kaufmann im Einzelhandel', subtitle: profile.education_3_subtitle || 'IHK mit Abschluss' },
    { year: profile.education_4_year || '1990er', title: profile.education_4_title || 'Ausbildung zum Trainer', subtitle: profile.education_4_subtitle || 'Zertifizierte Trainerausbildung' },
  ];

  // Career from profile or defaults
  const careerItems = [
    { period: profile.career_current || '1993 - heute', title: profile.career_current_title || 'Selbständiger IT-Management Consultant', description: profile.career_current_desc || 'Erfolgreiche Marktpositionierung im Management Consulting für die IT. Schwerpunkte: Prozessmanagement, Providermanagement, Senior Service Management, Programm- und Projektmanagement, Qualitätsmanagement, Senior Test- und Release-Management.' },
    { period: profile.career_founding || '1993 - 1996', title: profile.career_founding_title || 'Firmengründung', description: profile.career_founding_desc || 'Gründung der Thomas Schwarz Consulting GmbH. Auf- und Ausbau durch selbständigen Vertrieb von IT-Beratungsleistungen. Schwerpunkt: Firmennetzwerke, Serveradministrationen (Windows/Linux), Hardware- und Software-Support.' },
    { period: profile.career_early || '1988 - 1993', title: profile.career_early_title || 'Geschäftsführer & Objektberater', description: profile.career_early_desc || 'Geschäftsführer, Geschäftsstellenleiter und Objektberater mit umfangreicher Führungserfahrung.' },
  ];

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </main>
    );
  }

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
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent pb-1">
              Über {name}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Gründer und Geschäftsführer von {companyName} mit über {stats.years} Jahren
              Erfahrung in IT-Management und Beratung.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Profile Section */}
      <section className="py-16 px-4 bg-white dark:bg-slate-900">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-600">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
                  {/* Modernes Profilbild mit Hover-Effekt */}
                  <motion.div 
                    className="relative group"
                    whileHover={{ scale: 1.05, rotate: 3 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 flex-shrink-0 shadow-xl shadow-blue-500/20 dark:shadow-blue-900/40 ring-4 ring-white/50 dark:ring-slate-600/50 transition-all duration-500 ease-in-out group-hover:shadow-2xl group-hover:shadow-blue-500/30 dark:group-hover:shadow-blue-800/50">
                      {profilePhoto ? (
                        <Image
                          src={profilePhoto}
                          alt={name}
                          fill
                          className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-100 to-blue-50 dark:from-slate-600 dark:to-slate-700">
                          <User className="w-16 h-16 text-blue-400 dark:text-blue-300" />
                        </div>
                      )}
                      {/* Decorative Elements */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/20 dark:to-white/10 pointer-events-none" />
                    </div>
                    {/* Floating Badge */}
                    <div className="absolute -bottom-2 -right-2 bg-blue-600 dark:bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transform transition-transform duration-300 group-hover:scale-110">
                      {YEARS_COMPANY}+ Jahre
                    </div>
                  </motion.div>
                  <div className="text-center md:text-left">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{name}</h2>
                    <p className="text-blue-600 dark:text-blue-400 font-medium mt-1">Senior Management Consultant</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Gründer & Geschäftsführer</p>
                  </div>
                </div>
                <div className="space-y-3 text-gray-600 dark:text-gray-300">
                  <p><span className="font-semibold">Geburtsdatum:</span> {birthdate}</p>
                  <p><span className="font-semibold">Nationalität:</span> {nationality}</p>
                  <p><span className="font-semibold">Familie:</span> {family}</p>
                  <p className="pt-4 border-t border-gray-200 dark:border-slate-600">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Motto:</span>
                    <br />
                    <span className="text-lg italic">{motto}</span>
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 gap-4 3xl:gap-6 4xl:gap-8 5xl:gap-10"
            >
              <InfoCard icon={Calendar} title="Gegründet" value={founded} />
              <InfoCard icon={Users} title="Erfahrung" value={`${stats.years}+ Jahre`} />
              <InfoCard icon={Award} title="Projekterfahrungen" value={`${stats.projects}`} />
              <PhilosophyCardAbout />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Company Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-2xl p-8 md:p-12 shadow-lg border border-slate-200 dark:border-slate-600"
          >
            <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">{companyName}</h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
              <p className="text-lg">{companyDesc}</p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 pt-4">Philosophie: {philosophy}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Branchenerfahrungen */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto max-w-5xl 3xl:max-w-6xl 4xl:max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 3xl:mb-16"
          >
            <h2 className="text-fluid-3xl font-bold mb-4 text-gray-900">Branchenerfahrungen</h2>
            <p className="text-gray-600 text-lg">Projekterfahrungen in verschiedenen Branchen</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <BranchExperienceCard 
              icon={Building2}
              branch="Banken & Finanzdienstleister"
              years="ca. 15 Jahre"
              description="Großbanken, Landesbanken, Sparkassen"
            />
            <BranchExperienceCard 
              icon={Briefcase}
              branch="Informationstechnologie"
              years="ca. 20 Jahre"
              description="IT-Dienstleister, Softwarehäuser, Systemhäuser"
            />
            <BranchExperienceCard 
              icon={Building2}
              branch="Unternehmensberatung"
              years="ca. 20 Jahre"
              description="Management Consulting, IT-Beratung"
            />
            <BranchExperienceCard 
              icon={Building2}
              branch="Rechenzentrumsbetreiber"
              years="ca. 2 Jahre"
              description="Data Center Operations, Hosting"
            />
            <BranchExperienceCard 
              icon={Briefcase}
              branch="Sales / Vertrieb"
              years="ca. 10 Jahre"
              description="Vertriebssteuerung, Key Account Management"
            />
            <BranchExperienceCard 
              icon={Building2}
              branch="Öffentlicher Dienst"
              years="ca. 5 Jahre"
              description="Behörden, Kommunen, öffentliche Einrichtungen"
            />
          </div>
        </div>
      </section>

      {/* Career Timeline */}
      <section className="section-padding-adaptive px-4 bg-white">
        <div className="container mx-auto max-w-4xl 3xl:max-w-5xl 4xl:max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 3xl:mb-16"
          >
            <h2 className="text-fluid-3xl font-bold mb-4 text-gray-900">Beruflicher Werdegang</h2>
          </motion.div>

          <div className="space-y-6">
            {careerItems.map((item, index) => (
              <TimelineItem key={index} period={item.period} title={item.title} description={item.description} />
            ))}
          </div>
        </div>
      </section>

      {/* Education Section */}
      <section className="section-padding-adaptive px-4 bg-white">
        <div className="container mx-auto max-w-4xl 3xl:max-w-5xl 4xl:max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 3xl:mb-16"
          >
            <h2 className="text-fluid-3xl font-bold mb-4 text-gray-900">Ausbildung & Qualifikationen</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 3xl:gap-8 4xl:gap-10">
            {educationItems.map((item, index) => (
              <EducationCard key={index} year={item.year} title={item.title} subtitle={item.subtitle} />
            ))}
          </div>

          {/* Training Highlights */}
          {trainings.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-12"
            >
              <h3 className="text-2xl font-bold mb-6 text-gray-900 text-center">Weiterbildungsschwerpunkte</h3>
              <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-2xl p-8">
                <div className="grid md:grid-cols-2 gap-6">
                  {trainings.map((training) => (
                    <TrainingHighlight
                      key={training.id}
                      title={training.title}
                      institution={training.provider || ''}
                      link={training.link || undefined}
                    />
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link
                    href="/trainings"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Alle Trainings & Zertifikate ansehen →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </main>
  );
}

function InfoCard({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      <Icon className="w-8 h-8 text-blue-600 mb-3" />
      <div className="text-sm text-gray-600 mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

// Fokussiert & Ganzheitlich Karte für About-Seite
function PhilosophyCardAbout() {
  const philosophyItems = [
    { fokus: "IT-Service Mgmt", ganzheitlich: "Prozess → Mensch" },
    { fokus: "Prozessmgmt", ganzheitlich: "Strategie → Umsetzung" },
    { fokus: "Providermgmt", ganzheitlich: "Analyse → Optimierung" },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-lg hover:shadow-xl border border-blue-200 dark:border-slate-600 transition-all cursor-default">
      <div className="flex items-center gap-2 mb-3">
        <Focus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Fokussiert</span>
        <span className="text-gray-400 dark:text-gray-500 text-xs">→</span>
        <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Ganzheitlich</span>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 italic">
        „Auf den Punkt gebracht"
      </div>
      <div className="space-y-1">
        {philosophyItems.map((item, index) => (
          <div key={index} className="flex items-center text-xs">
            <span className="text-blue-600 dark:text-blue-400 font-medium truncate flex-1">{item.fokus}</span>
            <span className="text-gray-400 dark:text-gray-500 mx-1">→</span>
            <span className="text-gray-500 dark:text-gray-400 truncate flex-1 text-right">{item.ganzheitlich}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ period, title, description }: { period: string; title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl p-6 shadow-md border-l-4 border-blue-600"
    >
      <div className="text-sm font-semibold text-blue-600 mb-2">{period}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </motion.div>
  );
}

function EducationCard({ year, title, subtitle }: { year: string; title: string; subtitle: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="text-sm font-semibold text-blue-600 mb-2">{year}</div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{subtitle}</p>
    </motion.div>
  );
}

function TrainingHighlight({ title, institution, link }: { title: string; institution: string; link?: string }) {
  return (
    <div className="flex items-start gap-3">
      <Award className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            {institution} ↗
          </a>
        ) : (
          <p className="text-sm text-gray-600">{institution}</p>
        )}
      </div>
    </div>
  );
}

function BranchExperienceCard({ icon: Icon, branch, years, description }: { icon: any; branch: string; years: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all border border-gray-100 hover:border-blue-200"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="font-bold text-gray-900">{branch}</h3>
      </div>
      <div className="text-2xl font-bold text-blue-600 mb-2">{years}</div>
      <p className="text-sm text-gray-600">{description}</p>
    </motion.div>
  );
}
