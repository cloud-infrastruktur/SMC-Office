'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings,
  FolderOpen,
  Upload,
  ExternalLink,
  Tag,
  ArrowLeft,
  RefreshCw,
  CheckSquare,
  Square,
  Plus,
  AlertCircle,
  ChevronDown,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { hasAdminAccess } from '@/lib/types';
import Link from 'next/link';

interface Document {
  id: number;
  title: string;
  correspondent: string | null;
  documentType: string | null;
  tags: string[];
  createdDate: string | null;
  addedDate: string | null;
  sevdeskId: string | null;
  sevdeskExportedAt: string | null;
}

interface PaperlessTag {
  id: number;
  name: string;
  color?: string;
  matching_algorithm?: number;
  document_count?: number;
}

interface Folder {
  id: string;
  name: string;
  url: string;
}

interface ExportResult {
  documentId: number;
  title: string;
  success: boolean;
  sevdeskId?: string;
  error?: string;
  skipped?: boolean;
}

export default function SevdeskSyncPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [isConfigured, setIsConfigured] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);

  // Config state
  const [showConfig, setShowConfig] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [parentFolderId, setParentFolderId] = useState('22128948');

  // Tags state (NEU: Dynamische Tag-Auswahl)
  const [availableTags, setAvailableTags] = useState<PaperlessTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<PaperlessTag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);
  const [freeTextSearch, setFreeTextSearch] = useState('');

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<number>>(new Set());

  // Folder state (NEU: Dynamische Ordner-Auswahl)
  const [folders, setFolders] = useState<Folder[]>([]);
  const [suggestedFolder, setSuggestedFolder] = useState<Folder | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const folderDropdownRef = useRef<HTMLDivElement>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportResults, setExportResults] = useState<ExportResult[] | null>(null);
  const [exportFolderUrl, setExportFolderUrl] = useState<string | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setShowTagDropdown(false);
      }
      if (folderDropdownRef.current && !folderDropdownRef.current.contains(event.target as Node)) {
        setShowFolderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check config status
  const checkConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/sevdesk/config');
      const data = await res.json();
      setIsConfigured(data.configured);
      setIsConnected(data.connected);
      if (data.config?.parentFolderId) {
        setParentFolderId(data.config.parentFolderId);
      }
    } catch (error) {
      console.error('Error checking config:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load available tags from DMS
  const loadTags = useCallback(async () => {
    setTagsLoading(true);
    try {
      const res = await fetch('/api/paperless/tags');
      if (res.ok) {
        const data = await res.json();
        setAvailableTags(data.results || data || []);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setTagsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !hasAdminAccess((session.user as { role?: string })?.role)) {
      router.push('/login');
      return;
    }
    checkConfig();
    loadTags();
  }, [session, status, router, checkConfig, loadTags]);

  // Save config
  const saveConfig = async () => {
    if (!apiToken.trim()) {
      toast({ title: 'Fehler', description: 'API Token ist erforderlich', variant: 'destructive' });
      return;
    }

    setConfigLoading(true);
    try {
      const res = await fetch('/api/sevdesk/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiToken, parentFolderId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save config');
      }

      toast({ title: 'Erfolg', description: 'SevDesk Konfiguration gespeichert' });
      setShowConfig(false);
      setApiToken('');
      await checkConfig();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Konfiguration fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setConfigLoading(false);
    }
  };

  // Search documents by tags and/or free text search
  const searchDocuments = async () => {
    if (selectedTags.length === 0 && !freeTextSearch.trim()) {
      toast({ title: 'Hinweis', description: 'Bitte wählen Sie Tags aus oder geben Sie einen Suchbegriff ein', variant: 'destructive' });
      return;
    }

    setSearchLoading(true);
    setDocuments([]);
    setSelectedDocs(new Set());
    setExportResults(null);

    try {
      // Build search params
      const params = new URLSearchParams();
      if (selectedTags.length > 0) {
        params.set('tags', selectedTags.map(t => t.id).join(','));
      }
      if (freeTextSearch.trim()) {
        params.set('search', freeTextSearch.trim());
      }
      
      const res = await fetch(`/api/paperless/documents?${params}`);
      
      if (!res.ok) {
        throw new Error('Suche fehlgeschlagen');
      }

      const data = await res.json();
      // Support both old format (documents) and new format (results)
      const docs = data.results || data.documents || [];
      setDocuments(docs);

      // Auto-select all non-exported documents
      const nonExported = docs.filter((d: Document) => !d.sevdeskId).map((d: Document) => d.id);
      setSelectedDocs(new Set(nonExported));

      // Load folders with smart suggest based on first tag
      if (selectedTags.length > 0) {
        await loadFolders(selectedTags[0].name);
      } else {
        await loadFolders();
      }

    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Suche fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  // Load SevDesk folders
  const loadFolders = async (tag?: string) => {
    setFoldersLoading(true);
    try {
      const url = tag ? `/api/sevdesk/folders?tag=${encodeURIComponent(tag)}` : '/api/sevdesk/folders';
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ordner laden fehlgeschlagen');
      }

      setFolders(data.folders || []);
      if (data.suggestedFolder) {
        setSuggestedFolder(data.suggestedFolder);
        setSelectedFolder(data.suggestedFolder.id);
      } else if (data.folders?.length > 0) {
        setSelectedFolder(data.folders[0].id);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setFoldersLoading(false);
    }
  };

  // Create new folder
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast({ title: 'Fehler', description: 'Ordnername ist erforderlich', variant: 'destructive' });
      return;
    }

    setFoldersLoading(true);
    try {
      const res = await fetch('/api/sevdesk/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ordner erstellen fehlgeschlagen');
      }

      toast({ title: 'Erfolg', description: `Ordner "${data.folder.name}" erstellt` });
      setNewFolderName('');
      setShowNewFolder(false);
      setSelectedFolder(data.folder.id);
      await loadFolders();
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Ordner erstellen fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setFoldersLoading(false);
    }
  };

  // Tag selection handlers
  const addTag = (tag: PaperlessTag) => {
    if (!selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }
    setTagSearchQuery('');
    setShowTagDropdown(false);
  };

  const removeTag = (tagId: number) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId));
  };

  // Toggle document selection
  const toggleDoc = (id: number) => {
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDocs(newSet);
  };

  // Select all non-exported
  const selectAllNonExported = () => {
    const nonExported = documents.filter(d => !d.sevdeskId).map(d => d.id);
    setSelectedDocs(new Set(nonExported));
  };

  // Export documents
  const exportDocuments = async () => {
    if (selectedDocs.size === 0) {
      toast({ title: 'Hinweis', description: 'Keine Dokumente ausgewählt', variant: 'destructive' });
      return;
    }

    if (!selectedFolder) {
      toast({ title: 'Fehler', description: 'Bitte wählen Sie einen Zielordner', variant: 'destructive' });
      return;
    }

    setExporting(true);
    setExportResults(null);

    try {
      const res = await fetch('/api/sevdesk/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: Array.from(selectedDocs),
          folderId: selectedFolder,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Export fehlgeschlagen');
      }

      setExportResults(data.results);
      setExportFolderUrl(data.folderUrl);

      toast({
        title: 'Export abgeschlossen',
        description: `${data.summary.exported} exportiert, ${data.summary.skipped} übersprungen, ${data.summary.failed} fehlgeschlagen`,
      });

      // Refresh documents to update export status
      await searchDocuments();

    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Export fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Filter tags by search query
  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) &&
    !selectedTags.find(t => t.id === tag.id)
  );

  // Filter folders by search query
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(folderSearchQuery.toLowerCase())
  );

  // Get selected folder name
  const selectedFolderName = folders.find(f => f.id === selectedFolder)?.name || 'Ordner auswählen';

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
      <div className="container-adaptive px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Calculator className="h-8 w-8 text-green-400" />
                Buchhaltung - SevDesk Sync
              </h1>
              <p className="text-slate-400 mt-1">
                Dokumente aus SMC-DMS nach SevDesk exportieren
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowConfig(!showConfig)}
            className="border-slate-600"
          >
            <Settings className="h-4 w-4 mr-2" />
            Konfiguration
          </Button>
        </div>

        {/* Status Card */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border max-w-md ${
              isConnected
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {isConnected ? (
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              ) : (
                <XCircle className="h-6 w-6 text-red-400" />
              )}
              <div>
                <p className="font-medium text-white">SevDesk Status</p>
                <p className="text-sm text-slate-400">
                  {isConnected ? 'Verbunden' : isConfigured ? 'Nicht verbunden' : 'Nicht konfiguriert'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Config Panel */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">SevDesk Konfiguration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      API Token
                    </label>
                    <Input
                      type="password"
                      value={apiToken}
                      onChange={e => setApiToken(e.target.value)}
                      placeholder="Ihr SevDesk API Token"
                      className="bg-slate-900/50 border-slate-600"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Finden Sie Ihren Token unter: SevDesk {'>'} Einstellungen {'>'} Benutzerverwaltung {'>'} API-Token
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Parent Folder ID (Steuervorbereitung)
                    </label>
                    <Input
                      value={parentFolderId}
                      onChange={e => setParentFolderId(e.target.value)}
                      placeholder="22128948"
                      className="bg-slate-900/50 border-slate-600"
                    />
                  </div>
                  <Button onClick={saveConfig} disabled={configLoading}>
                    {configLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Speichern & Verbindung testen
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content - Only show if connected */}
        {isConnected ? (
          <div className="space-y-6">
            {/* Source Selection Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl bg-slate-800/50 border border-slate-700"
            >
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-purple-400" />
                Quell-Auswahl (DMS-Dokumente)
              </h3>
              
              {/* Free Text Search */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">Freie Suche (Dokumenteninhalt, Titel)</label>
                <Input
                  value={freeTextSearch}
                  onChange={e => setFreeTextSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchDocuments()}
                  placeholder="Suchbegriff eingeben..."
                  className="bg-slate-900/50 border-slate-600"
                />
              </div>

              {/* Tag Filter Section */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Nach Tags filtern (optional)
                  </span>
                </label>
                
                {/* Selected Tags */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTags.map(tag => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      >
                        <Tag className="h-3 w-3" />
                        {tag.name}
                        <button
                          onClick={() => removeTag(tag.id)}
                          className="ml-1 hover:text-purple-100 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Tag Search Dropdown */}
                <div className="relative" ref={tagDropdownRef}>
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Input
                        value={tagSearchQuery}
                        onChange={e => {
                          setTagSearchQuery(e.target.value);
                          setShowTagDropdown(true);
                        }}
                        onFocus={() => setShowTagDropdown(true)}
                        placeholder="Tag suchen oder auswählen..."
                        className="bg-slate-900/50 border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTagDropdown(!showTagDropdown)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${showTagDropdown ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <Button variant="outline" onClick={loadTags} disabled={tagsLoading}>
                      <RefreshCw className={`h-4 w-4 ${tagsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                {/* Dropdown */}
                <AnimatePresence>
                  {showTagDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full mt-2 max-h-64 overflow-y-auto rounded-lg bg-slate-900 border border-slate-700 shadow-xl"
                    >
                      {filteredTags.length === 0 ? (
                        <div className="p-4 text-center text-slate-400">
                          {tagsLoading ? 'Lade Tags...' : 'Keine Tags gefunden'}
                        </div>
                      ) : (
                        filteredTags.slice(0, 20).map(tag => (
                          <button
                            key={tag.id}
                            onClick={() => addTag(tag)}
                            className="w-full px-4 py-2.5 text-left hover:bg-slate-800 flex items-center gap-3 transition-colors"
                          >
                            <Tag className="h-4 w-4 text-purple-400" />
                            <span className="text-white">{tag.name}</span>
                            {tag.document_count !== undefined && (
                              <span className="ml-auto text-xs text-slate-500">
                                {tag.document_count} Dok.
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </div>

              {/* Search Button */}
              <div className="mt-4 flex justify-end">
                <Button onClick={searchDocuments} disabled={searchLoading || (selectedTags.length === 0 && !freeTextSearch.trim())}>
                  {searchLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Dokumente suchen
                </Button>
              </div>

              <p className="text-xs text-slate-500 mt-3">
                Geben Sie einen Suchbegriff ein und/oder wählen Sie Tags aus, um Dokumente zu finden.
              </p>
            </motion.div>

            {/* Documents List */}
            {documents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-slate-800/50 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-400" />
                    Gefundene Dokumente ({documents.length})
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllNonExported}>
                      <CheckSquare className="h-4 w-4 mr-1" />
                      Alle nicht-exportierten
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedDocs(new Set())}>
                      <Square className="h-4 w-4 mr-1" />
                      Keine
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => !doc.sevdeskId && toggleDoc(doc.id)}
                      className={`p-3 rounded-lg border transition-all ${
                        doc.sevdeskId
                          ? 'bg-green-500/10 border-green-500/30 cursor-default'
                          : selectedDocs.has(doc.id)
                          ? 'bg-blue-500/20 border-blue-500/50 cursor-pointer'
                          : 'bg-slate-900/50 border-slate-700 cursor-pointer hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {doc.sevdeskId ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                        ) : selectedDocs.has(doc.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-400 flex-shrink-0" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{doc.title}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            {doc.correspondent && <span>{doc.correspondent}</span>}
                            {doc.documentType && <span>• {doc.documentType}</span>}
                            {doc.createdDate && (
                              <span>• {new Date(doc.createdDate).toLocaleDateString('de-DE')}</span>
                            )}
                          </div>
                        </div>
                        {doc.sevdeskId && (
                          <span className="text-xs text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Exportiert
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected count */}
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                  <p className="text-slate-400">
                    {selectedDocs.size} von {documents.filter(d => !d.sevdeskId).length} nicht-exportierten ausgewählt
                  </p>
                </div>
              </motion.div>
            )}

            {/* Folder Selection & Export (NEU: Dynamische Ordner-Auswahl) */}
            {documents.length > 0 && selectedDocs.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-slate-800/50 border border-slate-700"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-yellow-400" />
                  Ziel-Auswahl (SevDesk-Ordner)
                </h3>

                {suggestedFolder && (
                  <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-sm text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Empfohlen: <strong>{suggestedFolder.name}</strong> (basierend auf Tag)
                    </p>
                  </div>
                )}

                {/* Folder Dropdown */}
                <div className="flex gap-4 items-end">
                  <div className="flex-1 relative" ref={folderDropdownRef}>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Ordner auswählen
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                      className="w-full p-2.5 rounded-lg bg-slate-900/50 border border-slate-600 text-white text-left flex items-center justify-between"
                    >
                      <span className="truncate">
                        {selectedFolderName}
                        {suggestedFolder?.id === selectedFolder ? ' (✓ Empfohlen)' : ''}
                      </span>
                      <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFolderDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showFolderDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-2 rounded-lg bg-slate-900 border border-slate-700 shadow-xl"
                        >
                          <div className="p-2 border-b border-slate-700">
                            <Input
                              value={folderSearchQuery}
                              onChange={e => setFolderSearchQuery(e.target.value)}
                              placeholder="Ordner suchen..."
                              className="bg-slate-800/50 border-slate-600 text-sm"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredFolders.length === 0 ? (
                              <div className="p-4 text-center text-slate-400">
                                Keine Ordner gefunden
                              </div>
                            ) : (
                              filteredFolders.map(folder => (
                                <button
                                  key={folder.id}
                                  onClick={() => {
                                    setSelectedFolder(folder.id);
                                    setShowFolderDropdown(false);
                                    setFolderSearchQuery('');
                                  }}
                                  className={`w-full px-4 py-2.5 text-left hover:bg-slate-800 flex items-center gap-3 transition-colors ${
                                    selectedFolder === folder.id ? 'bg-slate-800' : ''
                                  }`}
                                >
                                  <FolderOpen className="h-4 w-4 text-yellow-400" />
                                  <span className="text-white">{folder.name}</span>
                                  {suggestedFolder?.id === folder.id && (
                                    <span className="ml-auto text-xs text-green-400">✓ Empfohlen</span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setShowNewFolder(!showNewFolder)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Neuer Ordner
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => loadFolders()}
                    disabled={foldersLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${foldersLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* New Folder Form */}
                <AnimatePresence>
                  {showNewFolder && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-4 rounded-lg bg-slate-900/50 border border-slate-600"
                    >
                      <div className="flex gap-4">
                        <Input
                          value={newFolderName}
                          onChange={e => setNewFolderName(e.target.value)}
                          placeholder="Neuer Ordnername, z.B. 2026-01"
                          className="bg-slate-800/50 border-slate-600 flex-1"
                        />
                        <Button onClick={createFolder} disabled={foldersLoading}>
                          {foldersLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Erstellen'
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Export Button */}
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <Button
                    onClick={exportDocuments}
                    disabled={exporting || selectedDocs.size === 0}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {exporting ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5 mr-2" />
                    )}
                    {selectedDocs.size} Dokument{selectedDocs.size !== 1 ? 'e' : ''} an SevDesk übertragen
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Export Results */}
            {exportResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-slate-800/50 border border-slate-700"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  Export-Ergebnis
                </h3>

                {exportFolderUrl && (
                  <a
                    href={exportFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ordner in SevDesk öffnen
                  </a>
                )}

                <div className="space-y-2">
                  {exportResults.map(result => (
                    <div
                      key={result.documentId}
                      className={`p-3 rounded-lg flex items-center gap-3 ${
                        result.success
                          ? result.skipped
                            ? 'bg-yellow-500/10'
                            : 'bg-green-500/10'
                          : 'bg-red-500/10'
                      }`}
                    >
                      {result.success ? (
                        result.skipped ? (
                          <AlertCircle className="h-5 w-5 text-yellow-400" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        )
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                      <span className="flex-1 text-white">{result.title}</span>
                      <span className={`text-sm ${
                        result.success
                          ? result.skipped
                            ? 'text-yellow-400'
                            : 'text-green-400'
                          : 'text-red-400'
                      }`}>
                        {result.success
                          ? result.skipped
                            ? 'Übersprungen (bereits exportiert)'
                            : 'Exportiert'
                          : result.error || 'Fehler'
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-xl bg-slate-800/50 border border-slate-700 text-center"
          >
            <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              SevDesk nicht konfiguriert
            </h3>
            <p className="text-slate-400 mb-4">
              Bitte konfigurieren Sie zuerst Ihre SevDesk-Verbindung.
            </p>
            <Button onClick={() => setShowConfig(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Konfiguration öffnen
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
