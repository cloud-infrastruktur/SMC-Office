"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  Briefcase,
  TrendingUp,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Settings,
  Mail,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Target,
  User,
  Calendar,
  FileSignature,
  Inbox,
  MessageSquare,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  ChevronRight,
  Loader2,
  Zap,
  FolderKanban,
  UserPlus,
  Building2,
  Play,
  Pause,
  Archive,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasAdminAccess } from "@/lib/types";

// Types
interface CrmDeal {
  id: string;
  title: string;
  description?: string;
  value?: number;
  probability?: number;
  phase: string;
  expectedClose?: string;
  priority: string;
  isWon?: boolean;
  matchedKeywords: string[];
  createdAt: string;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
  };
  sourceEmail?: {
    subject: string;
    fromAddress: string;
  };
  _count?: {
    activities: number;
  };
}

interface PipelinePhase {
  id: string;
  phase: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  dealCount: number;
}

interface CrmStats {
  contacts: { total: number };
  deals: {
    total: number;
    open: number;
    won: number;
    lost: number;
    thisMonth: number;
    winRate: number;
  };
  value: {
    total: number;
    won: number;
  };
  automation: {
    lastScan: string | null;
    totalScans: number;
    totalMatches: number;
    keywordsCount: number;
  };
  health: {
    status: string;
    lastScanOk: boolean;
  };
}

// Phase Icons Mapping
const phaseIcons: Record<string, any> = {
  Inbox,
  MessageSquare,
  User,
  Calendar,
  CheckCircle,
  FileSignature,
};

// Deal Card Component
function DealCard({
  deal,
  onEdit,
  onView,
  onPhaseChange,
}: {
  deal: CrmDeal;
  onEdit: () => void;
  onView: () => void;
  onPhaseChange: (newPhase: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-700",
    normal: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 cursor-pointer group"
      onClick={onView}
    >
      {/* Color Bar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
      
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-semibold text-gray-900 text-sm line-clamp-2 flex-1 pr-2">
            {deal.title}
          </h4>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" /> Bearbeiten
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Details
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        {deal.contact && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
              {deal.contact.firstName[0]}{deal.contact.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">
                {deal.contact.firstName} {deal.contact.lastName}
              </p>
              {deal.contact.company && (
                <p className="text-xs text-gray-500 truncate">{deal.contact.company}</p>
              )}
            </div>
          </div>
        )}

        {/* Value & Probability */}
        <div className="flex items-center gap-2 mb-3">
          {deal.value && (
            <span className="text-sm font-bold text-green-600">
              {deal.value.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
            </span>
          )}
          {deal.probability && (
            <span className="text-xs text-gray-500">
              ({deal.probability}%)
            </span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[deal.priority]}`}>
            {deal.priority === "normal" ? "Normal" : deal.priority === "high" ? "Hoch" : deal.priority === "urgent" ? "Dringend" : "Niedrig"}
          </span>
          {deal.matchedKeywords.slice(0, 2).map((kw, i) => (
            <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
              {kw}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(deal.createdAt).toLocaleDateString("de-DE")}
          </span>
          {deal._count && deal._count.activities > 0 && (
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {deal._count.activities}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Kanban Column Component
function KanbanColumn({
  phase,
  deals,
  onEditDeal,
  onViewDeal,
  onMoveDeal,
}: {
  phase: PipelinePhase;
  deals: CrmDeal[];
  onEditDeal: (deal: CrmDeal) => void;
  onViewDeal: (deal: CrmDeal) => void;
  onMoveDeal: (dealId: string, newPhase: string) => void;
}) {
  const IconComponent = phaseIcons[phase.icon] || Inbox;
  const phaseDeals = deals.filter((d) => d.phase === phase.phase);

  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 rounded-xl p-4">
      {/* Column Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${phase.color}20` }}
        >
          <IconComponent className="w-5 h-5" style={{ color: phase.color }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{phase.name}</h3>
          <p className="text-xs text-gray-500">{phase.description}</p>
        </div>
        <span
          className="px-2 py-1 rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: phase.color }}
        >
          {phaseDeals.length}
        </span>
      </div>

      {/* Deals */}
      <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
        <AnimatePresence>
          {phaseDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onEdit={() => onEditDeal(deal)}
              onView={() => onViewDeal(deal)}
              onPhaseChange={(newPhase) => onMoveDeal(deal.id, newPhase)}
            />
          ))}
        </AnimatePresence>
        {phaseDeals.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine Deals</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main CRM Page
export default function CrmPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [phases, setPhases] = useState<PipelinePhase[]>([]);
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"kanban" | "contacts" | "keywords" | "projects">("kanban");
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<CrmDeal | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);

  // Auth Check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const role = (session?.user as { role?: string })?.role;
      if (!hasAdminAccess(role)) {
        router.push("/");
      }
    }
  }, [status, session, router]);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dealsRes, pipelineRes, statsRes, projectsRes] = await Promise.all([
        fetch("/api/crm/deals"),
        fetch("/api/crm/pipeline"),
        fetch("/api/crm/stats"),
        fetch("/api/crm/projects"),
      ]);

      if (dealsRes.ok) setDeals(await dealsRes.json());
      if (pipelineRes.ok) setPhases(await pipelineRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
    } catch (error) {
      console.error("Error loading CRM data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status, loadData]);

  // Scan Emails
  const handleScan = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      const res = await fetch("/api/crm/scan", { method: "POST" });
      const result = await res.json();
      setScanResult(result);
      if (result.created > 0) {
        loadData();
      }
    } catch (error) {
      console.error("Scan error:", error);
      setScanResult({ error: "Scan fehlgeschlagen" });
    } finally {
      setScanning(false);
    }
  };

  // Move Deal to new Phase
  const handleMoveDeal = async (dealId: string, newPhase: string) => {
    try {
      const res = await fetch(`/api/crm/deals/${dealId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: newPhase }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Error moving deal:", error);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const userRole = (session?.user as { role?: string })?.role;
  if (!session || !hasAdminAccess(userRole)) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Zurück
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">SMC-CRM</h1>
                  <p className="text-xs text-gray-500">Customer Relationship Management</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Scan Button */}
              <Button
                onClick={handleScan}
                disabled={scanning}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {scanning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Mails scannen
              </Button>

              {/* New Deal */}
              <Button
                onClick={() => {
                  setSelectedDeal(null);
                  setShowDealModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Neuer Deal
              </Button>

              {/* Settings - öffnet Keywords Tab */}
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setActiveTab("keywords")}
                title="Einstellungen"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scan Result Banner */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`border-b px-6 py-3 ${
              scanResult.error
                ? "bg-red-50 border-red-200"
                : scanResult.created > 0
                ? "bg-green-50 border-green-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="max-w-[1920px] mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                {scanResult.error ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : scanResult.created > 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Mail className="w-5 h-5 text-blue-600" />
                )}
                <span className="text-sm font-medium">
                  {scanResult.error
                    ? scanResult.error
                    : `${scanResult.scanned} E-Mails gescannt, ${scanResult.matched} Matches, ${scanResult.created} neue Deals erstellt (${scanResult.duration})`}
                </span>
              </div>
              <button
                onClick={() => setScanResult(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-white border-b">
          <div className="max-w-[1920px] mx-auto px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                <Briefcase className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.deals.open}</p>
                  <p className="text-xs text-gray-500">Offene Deals</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.deals.won}</p>
                  <p className="text-xs text-gray-500">Gewonnen</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.deals.winRate}%</p>
                  <p className="text-xs text-gray-500">Win-Rate</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                <Target className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.value.total.toLocaleString("de-DE", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    })}
                  </p>
                  <p className="text-xs text-gray-500">Pipeline-Wert</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                <Users className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.contacts.total}</p>
                  <p className="text-xs text-gray-500">Kontakte</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
                <Zap className="w-8 h-8 text-indigo-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.automation.totalMatches}</p>
                  <p className="text-xs text-gray-500">Auto-Matches</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-[1920px] mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: "kanban", label: "Kanban Board", icon: LayoutDashboard },
              { id: "projects", label: "Projekte", icon: FolderKanban, count: projects.length },
              { id: "contacts", label: "Kontakte", icon: Users },
              { id: "keywords", label: "Keywords", icon: Filter },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1920px] mx-auto p-6">
        {activeTab === "kanban" && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {phases.map((phase) => (
              <KanbanColumn
                key={phase.id}
                phase={phase}
                deals={deals}
                onEditDeal={(deal) => {
                  setSelectedDeal(deal);
                  setShowDealModal(true);
                }}
                onViewDeal={(deal) => {
                  router.push(`/admin/crm/deals/${deal.id}`);
                }}
                onMoveDeal={handleMoveDeal}
              />
            ))}
          </div>
        )}

        {activeTab === "contacts" && (
          <ContactsTab />
        )}

        {activeTab === "keywords" && (
          <KeywordsTab />
        )}

        {activeTab === "projects" && (
          <ProjectsTab projects={projects} onRefresh={loadData} />
        )}
      </div>

      {/* Deal Modal */}
      {showDealModal && (
        <DealModal
          deal={selectedDeal}
          onClose={() => {
            setShowDealModal(false);
            setSelectedDeal(null);
          }}
          onSave={() => {
            setShowDealModal(false);
            setSelectedDeal(null);
            loadData();
          }}
        />
      )}
    </main>
  );
}

// Contacts Tab Component
function ContactsTab() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crm/contacts?search=${encodeURIComponent(search)}`);
      if (res.ok) setContacts(await res.json());
    } catch (error) {
      console.error("Error loading contacts:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  if (loading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Kontakte suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button onClick={() => { setSelectedContact(null); setShowContactModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Neuer Kontakt
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-Mail</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firma</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deals</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Erstellt</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedContact(contact); setShowContactModal(true); }}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                      {contact.firstName?.[0] || "?"}{contact.lastName?.[0] || "?"}
                    </div>
                    <span className="font-medium text-gray-900">
                      {contact.firstName} {contact.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{contact.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{contact.company || "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{contact._count?.deals || 0}</td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(contact.createdAt).toLocaleDateString("de-DE")}
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedContact(contact); setShowContactModal(true); }}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {contacts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Keine Kontakte gefunden</p>
          </div>
        )}
      </div>

      {/* Contact Modal */}
      {showContactModal && (
        <ContactModal
          contact={selectedContact}
          onClose={() => { setShowContactModal(false); setSelectedContact(null); }}
          onSave={() => { setShowContactModal(false); setSelectedContact(null); loadContacts(); }}
        />
      )}
    </div>
  );
}

// Contact Modal Component
function ContactModal({
  contact,
  onClose,
  onSave,
}: {
  contact: any | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    firstName: contact?.firstName || "",
    lastName: contact?.lastName || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    mobile: contact?.mobile || "",
    company: contact?.company || "",
    position: contact?.position || "",
    linkedInUrl: contact?.linkedInUrl || "",
    xingUrl: contact?.xingUrl || "",
    notes: contact?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!formData.firstName || !formData.lastName || !formData.email) {
      setError("Vorname, Nachname und E-Mail sind erforderlich");
      return;
    }

    try {
      setSaving(true);
      const url = contact ? `/api/crm/contacts/${contact.id}` : "/api/crm/contacts";
      const method = contact ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || "Fehler beim Speichern");
      }
    } catch (err) {
      console.error("Error saving contact:", err);
      setError("Netzwerkfehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">
            {contact ? "Kontakt bearbeiten" : "Neuer Kontakt"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vorname *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nachname *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!!contact}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobil</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={formData.linkedInUrl}
                onChange={(e) => setFormData({ ...formData, linkedInUrl: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">XING URL</label>
              <input
                type="url"
                value={formData.xingUrl}
                onChange={(e) => setFormData({ ...formData, xingUrl: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://xing.com/profile/..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Speichern
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Keywords Tab Component
function KeywordsTab() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newNegativeKeyword, setNewNegativeKeyword] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/crm/keywords");
        if (res.ok) setConfig(await res.json());
      } catch (error) {
        console.error("Error loading keywords:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await fetch("/api/crm/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } catch (error) {
      console.error("Error saving keywords:", error);
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && config) {
      setConfig({
        ...config,
        keywords: [...(config.keywords || []), newKeyword.trim()],
      });
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword: string) => {
    if (config) {
      setConfig({
        ...config,
        keywords: config.keywords.filter((k: string) => k !== keyword),
      });
    }
  };

  const addNegativeKeyword = () => {
    if (newNegativeKeyword.trim() && config) {
      setConfig({
        ...config,
        negativeKeywords: [...(config.negativeKeywords || []), newNegativeKeyword.trim()],
      });
      setNewNegativeKeyword("");
    }
  };

  const removeNegativeKeyword = (keyword: string) => {
    if (config) {
      setConfig({
        ...config,
        negativeKeywords: (config.negativeKeywords || []).filter((k: string) => k !== keyword),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Positive Keywords */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Positive Keywords
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              E-Mails mit diesen Keywords werden als Deal erstellt
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Speichern
          </Button>
        </div>

        {/* Add Keyword */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Neues positives Keyword hinzufügen..."
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
          <Button onClick={addKeyword} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Hinzufügen
          </Button>
        </div>

        {/* Keywords List */}
        <div className="flex flex-wrap gap-2">
          {config?.keywords?.map((keyword: string) => (
            <span
              key={keyword}
              className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm flex items-center gap-2 group"
            >
              {keyword}
              <button
                onClick={() => removeKeyword(keyword)}
                className="hover:text-red-600 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          {(!config?.keywords || config.keywords.length === 0) && (
            <p className="text-sm text-gray-400 italic">Keine positiven Keywords definiert</p>
          )}
        </div>
      </div>

      {/* Negative Keywords */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Negative Keywords (Ausschluss)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            E-Mails mit diesen Keywords werden NICHT als Deal erstellt, auch wenn positive Keywords vorhanden sind
          </p>
        </div>

        {/* Add Negative Keyword */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Neues negatives Keyword hinzufügen (z.B. Glasfaser)..."
            value={newNegativeKeyword}
            onChange={(e) => setNewNegativeKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNegativeKeyword()}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
          <Button onClick={addNegativeKeyword} className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Hinzufügen
          </Button>
        </div>

        {/* Negative Keywords List */}
        <div className="flex flex-wrap gap-2">
          {config?.negativeKeywords?.map((keyword: string) => (
            <span
              key={keyword}
              className="px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm flex items-center gap-2 group"
            >
              {keyword}
              <button
                onClick={() => removeNegativeKeyword(keyword)}
                className="hover:text-gray-900 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
          {(!config?.negativeKeywords || config.negativeKeywords.length === 0) && (
            <p className="text-sm text-gray-400 italic">Keine negativen Keywords definiert</p>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Beispiel:</strong> Positive Keywords enthalten "Projektmanagement", negative Keywords enthalten "Glasfaser". 
            Eine E-Mail mit "Projektmanagement für Glasfaser-Ausbau" wird <strong>nicht</strong> als Deal erstellt.
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4">Scan-Einstellungen</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config?.checkSubject ?? true}
              onChange={(e) => setConfig({ ...config, checkSubject: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Betreff prüfen</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config?.checkBody ?? true}
              onChange={(e) => setConfig({ ...config, checkBody: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">E-Mail-Text prüfen</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config?.caseSensitive ?? false}
              onChange={(e) => setConfig({ ...config, caseSensitive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Groß-/Kleinschreibung beachten</span>
          </label>
        </div>
      </div>

      {/* Stats */}
      {config && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">Statistiken</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{config.totalScans || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Scans gesamt</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{config.totalMatches || 0}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Matches gesamt</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {config.lastScanAt
                  ? new Date(config.lastScanAt).toLocaleDateString("de-DE")
                  : "-"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Letzter Scan</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Deal Modal Component
function DealModal({
  deal,
  onClose,
  onSave,
}: {
  deal: CrmDeal | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    title: deal?.title || "",
    description: deal?.description || "",
    value: deal?.value?.toString() || "",
    probability: deal?.probability?.toString() || "50",
    priority: deal?.priority || "normal",
    phase: deal?.phase || "PHASE_1_ANFRAGE",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = deal ? `/api/crm/deals/${deal.id}` : "/api/crm/deals";
      const method = deal ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSave();
      }
    } catch (error) {
      console.error("Error saving deal:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4"
      >
        <div className="p-6 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            {deal ? "Deal bearbeiten" : "Neuer Deal"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wert (€)</label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wahrscheinlichkeit (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priorität</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Niedrig</option>
              <option value="normal">Normal</option>
              <option value="high">Hoch</option>
              <option value="urgent">Dringend</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
            <select
              value={formData.phase}
              onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PHASE_1_ANFRAGE">1. Projektanfrage</option>
              <option value="PHASE_2_ABSTIMMUNG">2. In Abstimmung</option>
              <option value="PHASE_3_PROFIL">3. Profil vorgestellt</option>
              <option value="PHASE_4_INTERVIEW">4. Interview</option>
              <option value="PHASE_5_AUFTRAG">5. Auftrag liegt vor</option>
              <option value="PHASE_6_VERTRAG">6. Vertragsabstimmung</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Speichern
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Projects Tab Component
function ProjectsTab({ projects, onRefresh }: { projects: any[]; onRefresh: () => void }) {
  const router = useRouter();
  const statusColors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-700",
    ACTIVE: "bg-green-100 text-green-700",
    ON_HOLD: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-blue-100 text-blue-700",
  };

  const statusLabels: Record<string, string> = {
    DRAFT: "Entwurf",
    ACTIVE: "Aktiv",
    ON_HOLD: "Pausiert",
    COMPLETED: "Abgeschlossen",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          CRM-Projekte ({projects.length})
        </h2>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Neues Projekt
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border">
          <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Noch keine Projekte</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project: any) => (
            <div key={project.id} className="bg-white dark:bg-slate-800 rounded-xl border p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm text-gray-500 font-mono">{project.projectNumber}</span>
                <span className={"px-2 py-0.5 rounded text-xs " + (statusColors[project.status] || "bg-gray-100")}>
                  {statusLabels[project.status] || project.status}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.title}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
