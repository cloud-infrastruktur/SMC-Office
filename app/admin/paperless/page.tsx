'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  FileText,
  ArrowLeft,
  Search,
  Filter,
  Download,
  RefreshCw,
  Settings,
  User,
  Tag,
  FileType,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Eye,
  X,
  Files,
  Building2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface PaperlessDocument {
  id: number;
  title: string;
  correspondent: number | null;
  correspondentName?: string | null;
  document_type: number | null;
  documentTypeName?: string | null;
  tags: number[];
  tagNames?: string[];
  created: string | null;
  added: string;
  original_file_name: string;
}

interface Correspondent {
  id: number;
  name: string;
  document_count: number;
}

interface DocumentType {
  id: number;
  name: string;
  document_count: number;
}

interface PTag {
  id: number;
  name: string;
  color: string;
  text_color: string;
  document_count: number;
}

interface Config {
  configured: boolean;
  baseUrl?: string;
  tokenMasked?: string;
}

export default function PaperlessAdminPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();

  const [config, setConfig] = useState<Config | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configToken, setConfigToken] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const [documents, setDocuments] = useState<PaperlessDocument[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [tags, setTags] = useState<PTag[]>([]);
  const [selectedCorrespondent, setSelectedCorrespondent] = useState<number | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<PaperlessDocument | null>(null);

  const userRole = (session?.user as any)?.role;
  const isAuthorized = userRole === 'ADMIN' || userRole === 'MANAGER';

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/paperless/config');
      const data = await res.json();
      setConfig(data);
      if (!data.configured) {
        setShowConfig(true);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [corrRes, typesRes, tagsRes] = await Promise.all([
        fetch('/api/paperless/correspondents'),
        fetch('/api/paperless/document-types'),
        fetch('/api/paperless/tags'),
      ]);

      if (corrRes.ok) {
        const corrData = await corrRes.json();
        setCorrespondents(corrData.results || []);
      }
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setDocumentTypes(typesData.results || []);
      }
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        setTags(tagsData.results || []);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!config?.configured) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('page_size', pageSize.toString());

      if (selectedCorrespondent) params.set('correspondent', selectedCorrespondent.toString());
      if (selectedDocType) params.set('document_type', selectedDocType.toString());
      if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/paperless/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.results || []);
        setTotalCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({ title: 'Fehler', description: 'Dokumente konnten nicht geladen werden', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [config, page, pageSize, selectedCorrespondent, selectedDocType, selectedTags, searchQuery, toast]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/paperless/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: configUrl, apiToken: configToken }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast({ title: 'Erfolg', description: 'Verbindung erfolgreich hergestellt!' });
        setShowConfig(false);
        fetchConfig();
        fetchFilterOptions();
      } else {
        toast({ title: 'Fehler', description: data.error || 'Verbindung fehlgeschlagen', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Verbindungsfehler', variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDownload = async (docId: number, fileName: string) => {
    try {
      const res = await fetch(`/api/paperless/documents/${docId}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Download fehlgeschlagen', variant: 'destructive' });
    }
  };

  const resetFilters = () => {
    setSelectedCorrespondent(null);
    setSelectedDocType(null);
    setSelectedTags([]);
    setSearchQuery('');
    setPage(1);
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !isAuthorized) {
      router.push('/admin');
    }
  }, [status, isAuthorized, router]);

  useEffect(() => {
    if (isAuthorized) {
      fetchConfig();
    }
  }, [isAuthorized, fetchConfig]);

  useEffect(() => {
    if (config?.configured) {
      fetchFilterOptions();
    }
  }, [config, fetchFilterOptions]);

  useEffect(() => {
    if (config?.configured) {
      const debounce = setTimeout(() => {
        fetchDocuments();
      }, searchQuery ? 300 : 0);
      return () => clearTimeout(debounce);
    }
  }, [config, fetchDocuments, searchQuery]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session || !isAuthorized) return null;

  const totalPages = Math.ceil(totalCount / pageSize);

  const getCorrespondentName = (doc: PaperlessDocument) => {
    if (doc.correspondentName) return doc.correspondentName;
    if (!doc.correspondent) return 'Kein Korrespondent';
    return correspondents.find((c) => c.id === doc.correspondent)?.name || 'Unbekannt';
  };

  const getDocTypeName = (doc: PaperlessDocument) => {
    if (doc.documentTypeName) return doc.documentTypeName;
    if (!doc.document_type) return 'Kein Typ';
    return documentTypes.find((t) => t.id === doc.document_type)?.name || 'Unbekannt';
  };

  const getTagById = (id: number) => tags.find((t) => t.id === id);

  return (
    <main className="min-h-screen py-8 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zum SMC Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SMC-DMS</h1>
              <p className="text-gray-600 mt-1">Dokumentenmanagement-System</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfig(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Konfiguration
              </Button>
              <Button onClick={() => fetchDocuments()} disabled={loading || !config?.configured}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Status Overview - like SOC */}
        {config?.configured && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Files className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                  <p className="text-sm text-gray-600">Dokumente</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{correspondents.length}</p>
                  <p className="text-sm text-gray-600">Korrespondenten</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <FileType className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{documentTypes.length}</p>
                  <p className="text-sm text-gray-600">Dokumenttypen</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Tag className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{tags.length}</p>
                  <p className="text-sm text-gray-600">Tags</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Config Modal */}
        {showConfig && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Paperless Konfiguration</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowConfig(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {config?.configured && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span>Verbunden mit: {config.baseUrl}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Token: {config.tokenMasked}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paperless URL</label>
                  <Input
                    value={configUrl}
                    onChange={(e) => setConfigUrl(e.target.value)}
                    placeholder="https://dms.smc-office.eu"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
                  <Input
                    type="password"
                    value={configToken}
                    onChange={(e) => setConfigToken(e.target.value)}
                    placeholder="Token aus Paperless Admin"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Zu finden unter: Paperless Admin → Einstellungen → Auth Tokens
                  </p>
                </div>
                <Button
                  onClick={handleSaveConfig}
                  disabled={savingConfig || !configUrl || !configToken}
                  className="w-full"
                >
                  {savingConfig ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Verbindung testen & speichern
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Not configured warning */}
        {!config?.configured && !showConfig && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8"
          >
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-amber-800">Nicht konfiguriert</h3>
                <p className="text-amber-700 mt-1">
                  Bitte konfigurieren Sie zuerst die Verbindung zu Ihrem SMC-DMS Server.
                </p>
                <Button onClick={() => setShowConfig(true)} className="mt-4 bg-amber-600 hover:bg-amber-700">
                  <Settings className="w-4 h-4 mr-2" />
                  Jetzt konfigurieren
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {config?.configured && (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-4 sticky top-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filter
                </h3>

                {/* Search */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Suche</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Dokumente suchen..."
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Correspondent */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4" />
                    Korrespondent
                  </label>
                  <select
                    value={selectedCorrespondent || ''}
                    onChange={(e) => {
                      setSelectedCorrespondent(e.target.value ? parseInt(e.target.value) : null);
                      setPage(1);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Alle</option>
                    {correspondents.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.document_count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document Type */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <FileType className="w-4 h-4" />
                    Dokumenttyp
                  </label>
                  <select
                    value={selectedDocType || ''}
                    onChange={(e) => {
                      setSelectedDocType(e.target.value ? parseInt(e.target.value) : null);
                      setPage(1);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Alle</option>
                    {documentTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.document_count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setSelectedTags((prev) =>
                            prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]
                          );
                          setPage(1);
                        }}
                        className={`px-2 py-1 text-xs rounded-full transition-all ${
                          selectedTags.includes(tag.id)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset */}
                {(selectedCorrespondent || selectedDocType || selectedTags.length > 0 || searchQuery) && (
                  <Button variant="outline" onClick={resetFilters} className="w-full">
                    Filter zurücksetzen
                  </Button>
                )}
              </div>
            </div>

            {/* Documents Grid */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500">Dokumente werden geladen...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Keine Dokumente gefunden</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-100">
                      {documents.map((doc, index) => (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">{doc.title}</h4>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {getCorrespondentName(doc)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileType className="w-3 h-3" />
                                  {getDocTypeName(doc)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {doc.created ? new Date(doc.created).toLocaleDateString('de-DE') : 'Unbekannt'}
                                </span>
                              </div>
                              {doc.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {doc.tags.map((tagId) => {
                                    const tag = getTagById(tagId);
                                    return tag ? (
                                      <Badge
                                        key={tagId}
                                        style={{
                                          backgroundColor: tag.color || '#e5e7eb',
                                          color: tag.text_color || '#374151',
                                        }}
                                        className="text-xs"
                                      >
                                        {tag.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button variant="outline" size="sm" onClick={() => setPreviewDoc(doc)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(doc.id, doc.original_file_name)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                        <p className="text-sm text-gray-600">
                          Seite {page} von {totalPages} ({totalCount} Dokumente)
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 truncate">{previewDoc.title}</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleDownload(previewDoc.id, previewDoc.original_file_name)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
                <img
                  src={`/api/paperless/documents/${previewDoc.id}/thumbnail`}
                  alt={previewDoc.title}
                  className="max-w-full max-h-full object-contain rounded shadow-lg"
                />
              </div>
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Korrespondent:</span>
                    <p className="font-medium text-gray-900">{getCorrespondentName(previewDoc)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Typ:</span>
                    <p className="font-medium text-gray-900">{getDocTypeName(previewDoc)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Dateiname:</span>
                    <p className="font-medium text-gray-900 truncate">{previewDoc.original_file_name}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
