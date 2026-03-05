'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from 'react-resizable-panels';
import {
  ArrowLeft,
  Mail,
  Inbox,
  Send,
  FileText,
  Trash2,
  Archive,
  Star,
  RefreshCw,
  Search,
  Plus,
  Settings,
  Paperclip,
  Reply,
  Forward,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  X,
  Loader2,
  Eye,
  EyeOff,
  Server,
  AlertCircle,
  ImageOff,
  Image as ImageIcon,
  Tag,
  Move,
  Check,
  Palette,
  Grip,
  MessageSquare,
  PenLine,
  Clock,
  LayoutList,
  LayoutGrid,
  Save,
  Folder,
  FolderOpen,
  Filter,
  Calendar,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// V4.5: Neue Email-Komponenten
import {
  FolderTree,
  buildFolderHierarchy,
  QuotaDisplay,
  RulesManager,
  TemplatesManager,
  ContactAutocomplete,
  AttachmentUpload,
  AdvancedSearch,
  defaultFilters,
} from '@/components/email';
import type { SearchFilters, AttachmentFile } from '@/components/email';

// Types
interface EmailAccount {
  id: string;
  name: string;
  email: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  isActive: boolean;
  isDefault: boolean;
  lastSync: string | null;
  syncError: string | null;
  folders: EmailFolder[];
  _count?: { messages: number };
}

interface EmailFolder {
  id: string;
  name: string;
  path: string;
  type: string;
  unreadCount: number;
  totalCount: number;
}

interface EmailMessage {
  uid: number;
  messageId: string | null;
  subject: string;
  fromAddress: string;
  fromName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  date: string | null;
  snippet: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  threadId?: string;
  inReplyTo?: string;
}

interface EmailContent {
  textBody: string | null;
  htmlBody: string | null;
  attachments: {
    filename: string;
    contentType: string;
    size: number;
  }[];
}

interface EmailCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

interface EmailSignature {
  id: string;
  accountId: string;
  name: string;
  content: string;
  isDefault: boolean;
  isReplyDefault: boolean;
}

interface PanelLayout {
  emailPanelSizes: { folders: number; messages: number; content: number };
  emailListView: string;
  emailSortBy: string;
  emailSortOrder: string;
  conversationView: boolean;
  previewPane: string;
}

// Folder Icon Mapping
const folderIcons: Record<string, any> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileText,
  trash: Trash2,
  archive: Archive,
  spam: AlertCircle,
  custom: Folder,
};

// Default Colors für Kategorien
const categoryColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e',
];

export default function EmailClientPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [messageContent, setMessageContent] = useState<EmailContent | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showDetachedModal, setShowDetachedModal] = useState(false);
  const [detachedMessage, setDetachedMessage] = useState<{ message: EmailMessage; content: EmailContent } | null>(null);
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [replyTo, setReplyTo] = useState<{ message: EmailMessage; isForward: boolean } | null>(null);
  
  // V4.5: Neue Modals und State
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<'create' | 'rename'>('create');
  const [editingFolder, setEditingFolder] = useState<EmailFolder | null>(null);
  const [parentFolderPath, setParentFolderPath] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState('');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>(defaultFilters);
  const [draggedMessage, setDraggedMessage] = useState<EmailMessage | null>(null);
  const [sortField, setSortField] = useState<'date' | 'subject' | 'from' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<'none' | 'date' | 'sender'>('none');
  const [composeAttachments, setComposeAttachments] = useState<AttachmentFile[]>([]);
  
  // Outlook-Style Features
  const [panelLayout, setPanelLayout] = useState<PanelLayout>({
    emailPanelSizes: { folders: 15, messages: 30, content: 55 },
    emailListView: 'list',
    emailSortBy: 'date',
    emailSortOrder: 'desc',
    conversationView: false,
    previewPane: 'right',
  });
  const [categories, setCategories] = useState<EmailCategory[]>([]);
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [trustedSenders, setTrustedSenders] = useState<string[]>([]);
  const [showImages, setShowImages] = useState<Record<string, boolean>>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['inbox']));
  
  // Auto-Save Draft
  const [draftSaving, setDraftSaving] = useState(false);
  const draftTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const userRole = (session?.user as { role?: string })?.role;
  const userId = (session?.user as { id?: string })?.id;
  const hasAccess = userRole === 'ADMIN' || userRole === 'MANAGER';

  // Auth Check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && !hasAccess) {
      router.push('/admin');
    }
  }, [status, hasAccess, router]);

  // Load User Layout
  useEffect(() => {
    if (hasAccess && userId) {
      fetch('/api/email/layout')
        .then(res => res.json())
        .then(data => {
          if (data && !data.error) {
            setPanelLayout({
              emailPanelSizes: data.emailPanelSizes || { folders: 15, messages: 30, content: 55 },
              emailListView: data.emailListView || 'list',
              emailSortBy: data.emailSortBy || 'date',
              emailSortOrder: data.emailSortOrder || 'desc',
              conversationView: data.conversationView || false,
              previewPane: data.previewPane || 'right',
            });
          }
        })
        .catch(console.error);
    }
  }, [hasAccess, userId]);

  // Load Trusted Senders
  useEffect(() => {
    if (hasAccess) {
      fetch('/api/email/trusted-senders')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTrustedSenders(data.map((s: { email: string }) => s.email.toLowerCase()));
          }
        })
        .catch(console.error);
    }
  }, [hasAccess]);

  // Load Categories
  useEffect(() => {
    if (hasAccess) {
      fetch('/api/email/categories')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setCategories(data);
          }
        })
        .catch(console.error);
    }
  }, [hasAccess]);

  // Save Layout
  const saveLayout = useCallback(async (layout: PanelLayout) => {
    try {
      await fetch('/api/email/layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout),
      });
    } catch (error) {
      console.error('Layout speichern fehlgeschlagen:', error);
    }
  }, []);

  // Handle Panel Resize
  const handlePanelResize = useCallback((sizes: number[]) => {
    const newLayout = {
      ...panelLayout,
      emailPanelSizes: {
        folders: sizes[0],
        messages: sizes[1],
        content: sizes[2],
      },
    };
    setPanelLayout(newLayout);
    // Debounce save
    if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
    draftTimeoutRef.current = setTimeout(() => saveLayout(newLayout), 1000);
  }, [panelLayout, saveLayout]);

  // Load Accounts
  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/email/accounts');
      const data = await res.json();
      if (res.ok) {
        setAccounts(data);
        if (data.length > 0 && !selectedAccount) {
          const defaultAccount = data.find((a: EmailAccount) => a.isDefault) || data[0];
          setSelectedAccount(defaultAccount);
          if (defaultAccount.folders?.length > 0) {
            const inboxFolder = defaultAccount.folders.find((f: EmailFolder) => f.type === 'inbox');
            setSelectedFolder(inboxFolder || defaultAccount.folders[0]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  // Load Signatures for selected account
  useEffect(() => {
    if (selectedAccount) {
      fetch(`/api/email/signatures?accountId=${selectedAccount.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setSignatures(data);
          }
        })
        .catch(console.error);
    }
  }, [selectedAccount?.id]);

  useEffect(() => {
    if (hasAccess) {
      loadAccounts();
    }
  }, [hasAccess, loadAccounts]);

  // Load Messages when folder changes
  useEffect(() => {
    if (selectedAccount && selectedFolder) {
      loadMessages();
    }
  }, [selectedAccount?.id, selectedFolder?.path]);

  const loadMessages = async () => {
    if (!selectedAccount || !selectedFolder) return;
    
    setLoadingMessages(true);
    setSelectedMessage(null);
    setMessageContent(null);
    setSelectedMessages(new Set());
    
    try {
      const params = new URLSearchParams({
        accountId: selectedAccount.id,
        folderPath: selectedFolder.path,
        limit: '50',
        ...(searchQuery && { search: searchQuery }),
      });
      
      const res = await fetch(`/api/email/messages?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        let msgs = data.messages || [];
        
        // Konversationsansicht: Gruppieren nach threadId
        if (panelLayout.conversationView) {
          const threads = new Map<string, EmailMessage[]>();
          msgs.forEach((msg: EmailMessage) => {
            const threadKey = msg.threadId || msg.messageId || String(msg.uid);
            if (!threads.has(threadKey)) {
              threads.set(threadKey, []);
            }
            threads.get(threadKey)!.push(msg);
          });
          
          // Nur die neueste Nachricht jeder Konversation anzeigen
          msgs = Array.from(threads.values()).map(threadMsgs => {
            threadMsgs.sort((a, b) => {
              const dateA = a.date ? new Date(a.date).getTime() : 0;
              const dateB = b.date ? new Date(b.date).getTime() : 0;
              return dateB - dateA;
            });
            return { ...threadMsgs[0], _threadCount: threadMsgs.length };
          });
        }
        
        setMessages(msgs);
      } else {
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Nachrichten konnten nicht geladen werden', variant: 'destructive' });
    } finally {
      setLoadingMessages(false);
    }
  };

  // V4.5: Ordner-Funktionen
  const handleCreateFolder = (parentPath?: string) => {
    setFolderModalMode('create');
    setParentFolderPath(parentPath || '');
    setNewFolderName('');
    setEditingFolder(null);
    setShowFolderModal(true);
  };

  const handleRenameFolder = (folder: EmailFolder) => {
    setFolderModalMode('rename');
    setEditingFolder(folder);
    setNewFolderName(folder.name);
    setShowFolderModal(true);
  };

  const handleDeleteFolder = async (folder: EmailFolder) => {
    if (!selectedAccount) return;
    if (!confirm(`Ordner "${folder.name}" und alle Inhalte wirklich löschen?`)) return;
    
    try {
      const res = await fetch(`/api/email/folders/${folder.id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        toast({ title: 'Erfolg', description: 'Ordner gelöscht' });
        loadAccounts();
        if (selectedFolder?.id === folder.id) {
          const inbox = selectedAccount.folders?.find(f => f.type === 'inbox');
          setSelectedFolder(inbox || null);
        }
      } else {
        const data = await res.json();
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Löschen fehlgeschlagen', variant: 'destructive' });
    }
  };

  const handleMarkAllRead = async (folder: EmailFolder) => {
    if (!selectedAccount) return;
    
    try {
      const res = await fetch('/api/email/folders/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          folderPath: folder.path,
        }),
      });
      
      if (res.ok) {
        toast({ title: 'Erfolg', description: 'Alle Nachrichten als gelesen markiert' });
        loadAccounts();
        if (selectedFolder?.id === folder.id) {
          loadMessages();
        }
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Markieren fehlgeschlagen', variant: 'destructive' });
    }
  };

  const handleEmptyFolder = async (folder: EmailFolder) => {
    if (!selectedAccount) return;
    if (!confirm(`Alle Nachrichten in "${folder.name}" endgültig löschen?`)) return;
    
    try {
      const res = await fetch('/api/email/folders/empty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          folderPath: folder.path,
          folderType: folder.type,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast({ title: 'Erfolg', description: data.message });
        loadAccounts();
        if (selectedFolder?.id === folder.id) {
          setMessages([]);
        }
      } else {
        const data = await res.json();
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Leeren fehlgeschlagen', variant: 'destructive' });
    }
  };

  const saveFolderModal = async () => {
    if (!selectedAccount || !newFolderName.trim()) return;
    
    try {
      if (folderModalMode === 'create') {
        const res = await fetch('/api/email/folders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: selectedAccount.id,
            folderName: newFolderName.trim(),
            parentPath: parentFolderPath || undefined,
          }),
        });
        
        if (res.ok) {
          toast({ title: 'Erfolg', description: 'Ordner erstellt' });
          loadAccounts();
        } else {
          const data = await res.json();
          toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
        }
      } else if (editingFolder) {
        const res = await fetch(`/api/email/folders/${editingFolder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newName: newFolderName.trim() }),
        });
        
        if (res.ok) {
          toast({ title: 'Erfolg', description: 'Ordner umbenannt' });
          loadAccounts();
        } else {
          const data = await res.json();
          toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
        }
      }
      
      setShowFolderModal(false);
    } catch (error) {
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen', variant: 'destructive' });
    }
  };

  // Drag & Drop Nachrichten
  const handleMessageDragStart = (e: React.DragEvent, message: EmailMessage) => {
    setDraggedMessage(message);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(message.uid));
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolder: EmailFolder) => {
    e.preventDefault();
    if (!draggedMessage || !selectedAccount || !selectedFolder) return;
    if (targetFolder.path === selectedFolder.path) return;
    
    try {
      const res = await fetch('/api/email/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          uids: [draggedMessage.uid],
          sourceFolder: selectedFolder.path,
          targetFolder: targetFolder.path,
        }),
      });
      
      if (res.ok) {
        toast({ title: 'Erfolg', description: `Nachricht nach "${targetFolder.name}" verschoben` });
        setMessages(prev => prev.filter(m => m.uid !== draggedMessage.uid));
        loadAccounts();
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Verschieben fehlgeschlagen', variant: 'destructive' });
    } finally {
      setDraggedMessage(null);
    }
  };

  // Sortierung ändern
  const handleSort = (field: 'date' | 'subject' | 'from' | 'size') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Load Message Content
  const loadMessageContent = async (message: EmailMessage) => {
    if (!selectedAccount || !selectedFolder) return;
    
    setSelectedMessage(message);
    setLoadingContent(true);
    
    // Check if images should be shown for this sender
    const senderEmail = message.fromAddress.toLowerCase();
    const isTrusted = trustedSenders.includes(senderEmail);
    setShowImages(prev => ({ ...prev, [senderEmail]: isTrusted }));
    
    try {
      const params = new URLSearchParams({
        accountId: selectedAccount.id,
        folderPath: selectedFolder.path,
      });
      
      const res = await fetch(`/api/email/messages/${message.uid}?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setMessageContent(data);
        setMessages((prev) =>
          prev.map((m) => (m.uid === message.uid ? { ...m, isRead: true } : m))
        );
      } else {
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Nachricht konnte nicht geladen werden', variant: 'destructive' });
    } finally {
      setLoadingContent(false);
    }
  };

  // Open Message in Detached Modal (on double-click)
  const openMessageInModal = async (message: EmailMessage) => {
    if (!selectedAccount || !selectedFolder) return;
    
    // If already loading or same message, skip
    if (detachedMessage?.message.uid === message.uid && showDetachedModal) return;
    
    try {
      const params = new URLSearchParams({
        accountId: selectedAccount.id,
        folderPath: selectedFolder.path,
      });
      
      const res = await fetch(`/api/email/messages/${message.uid}?${params}`);
      const data = await res.json();
      
      if (res.ok) {
        setDetachedMessage({ message, content: data });
        setShowDetachedModal(true);
        // Mark as read
        setMessages((prev) =>
          prev.map((m) => (m.uid === message.uid ? { ...m, isRead: true } : m))
        );
      } else {
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Nachricht konnte nicht geladen werden', variant: 'destructive' });
    }
  };

  // Trust Sender for Images
  const trustSender = async (email: string) => {
    try {
      await fetch('/api/email/trusted-senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, trustImages: true }),
      });
      setTrustedSenders(prev => [...prev, email.toLowerCase()]);
      setShowImages(prev => ({ ...prev, [email.toLowerCase()]: true }));
      toast({ title: 'Erfolg', description: `${email} als vertrauenswürdig markiert` });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen', variant: 'destructive' });
    }
  };

  // Sync Account
  const syncAccount = async () => {
    if (!selectedAccount) return;
    
    setSyncing(true);
    try {
      const res = await fetch(`/api/email/accounts/${selectedAccount.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = await res.json();
      
      if (data.success) {
        toast({ title: 'Erfolg', description: 'Synchronisation abgeschlossen' });
        await loadAccounts();
        await loadMessages();
      } else {
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Synchronisation fehlgeschlagen', variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  // Toggle Star
  const toggleStar = async (message: EmailMessage, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedAccount || !selectedFolder) return;
    
    try {
      await fetch(`/api/email/messages/${message.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          folderPath: selectedFolder.path,
          starred: !message.isStarred,
        }),
      });
      
      setMessages((prev) =>
        prev.map((m) =>
          m.uid === message.uid ? { ...m, isStarred: !m.isStarred } : m
        )
      );
    } catch (error) {
      toast({ title: 'Fehler', description: 'Aktion fehlgeschlagen', variant: 'destructive' });
    }
  };

  // Toggle Message Selection
  const toggleMessageSelection = (uid: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uid)) {
        newSet.delete(uid);
      } else {
        newSet.add(uid);
      }
      return newSet;
    });
  };

  // Select All Messages
  const toggleSelectAll = () => {
    if (selectedMessages.size === messages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(messages.map(m => m.uid)));
    }
  };

  // Delete Message
  const deleteMessages = async (uids?: number[]) => {
    if (!selectedAccount || !selectedFolder) return;
    
    const toDelete = uids || Array.from(selectedMessages);
    if (toDelete.length === 0) return;
    
    if (!confirm(`${toDelete.length} Nachricht(en) wirklich löschen?`)) return;
    
    try {
      for (const uid of toDelete) {
        const params = new URLSearchParams({
          accountId: selectedAccount.id,
          folderPath: selectedFolder.path,
        });
        
        await fetch(`/api/email/messages/${uid}?${params}`, {
          method: 'DELETE',
        });
      }
      
      setMessages((prev) => prev.filter((m) => !toDelete.includes(m.uid)));
      setSelectedMessages(new Set());
      if (selectedMessage && toDelete.includes(selectedMessage.uid)) {
        setSelectedMessage(null);
        setMessageContent(null);
      }
      toast({ title: 'Erfolg', description: `${toDelete.length} Nachricht(en) gelöscht` });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Löschen fehlgeschlagen', variant: 'destructive' });
    }
  };

  // Format Date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  // Process HTML to block/allow images
  const processHtmlContent = (html: string, senderEmail: string) => {
    if (showImages[senderEmail.toLowerCase()]) {
      return html;
    }
    // Block external images
    return html
      .replace(/<img[^>]+src\s*=\s*['"]https?:\/\/[^'"]+['"][^>]*>/gi, 
        '<div class="blocked-image">[Bild blockiert]</div>')
      .replace(/background(-image)?\s*:\s*url\(['"]?https?:\/\/[^)]+\)/gi, '');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <main className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b shadow-sm z-40 flex-shrink-0">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-gray-500 hover:text-blue-600 p-1">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900">E-Mail Client</h1>
                  <p className="text-xs text-gray-500">
                    {selectedAccount?.name || 'Kein Konto ausgewählt'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center border rounded-lg bg-gray-50 p-0.5">
                <button
                  onClick={() => {
                    const newLayout = { ...panelLayout, conversationView: false };
                    setPanelLayout(newLayout);
                    saveLayout(newLayout);
                    loadMessages();
                  }}
                  className={`p-1.5 rounded ${!panelLayout.conversationView ? 'bg-white shadow-sm' : ''}`}
                  title="Listenansicht"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const newLayout = { ...panelLayout, conversationView: true };
                    setPanelLayout(newLayout);
                    saveLayout(newLayout);
                    loadMessages();
                  }}
                  className={`p-1.5 rounded ${panelLayout.conversationView ? 'bg-white shadow-sm' : ''}`}
                  title="Konversationsansicht"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={syncAccount}
                disabled={syncing || !selectedAccount}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setReplyTo(null);
                  setShowComposeModal(true);
                }}
                disabled={!selectedAccount}
              >
                <Plus className="w-4 h-4 mr-1" />
                Neue E-Mail
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCategoryModal(true)}
                title="Kategorien verwalten"
              >
                <Tag className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSignatureModal(true)}
                title="Signaturen verwalten"
              >
                <PenLine className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingAccount(null);
                  setShowAccountModal(true);
                }}
                title="Einstellungen"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        {accounts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center"
          >
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Kein E-Mail-Konto eingerichtet</h2>
              <p className="text-gray-600 mb-6">
                Fügen Sie ein E-Mail-Konto hinzu, um Nachrichten zu empfangen und zu senden.
              </p>
              <Button onClick={() => setShowAccountModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                E-Mail-Konto hinzufügen
              </Button>
            </div>
          </motion.div>
        ) : (
          <PanelGroup
            direction="horizontal"
            onLayout={handlePanelResize}
            className="h-full"
          >
            {/* Folder Panel */}
            <Panel
              defaultSize={panelLayout.emailPanelSizes.folders}
              minSize={10}
              maxSize={25}
              className="bg-white border-r"
            >
              <div className="h-full flex flex-col">
                {/* Account Selector */}
                <div className="p-2 border-b">
                  <select
                    className="w-full p-2 text-sm border rounded-lg bg-gray-50"
                    value={selectedAccount?.id || ''}
                    onChange={(e) => {
                      const account = accounts.find((a) => a.id === e.target.value);
                      if (account) {
                        setSelectedAccount(account);
                        const inbox = account.folders?.find((f) => f.type === 'inbox');
                        setSelectedFolder(inbox || account.folders?.[0] || null);
                      }
                    }}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Folders - V4.5: Hierarchische Ansicht mit Kontextmenü */}
                <div className="flex-1 overflow-y-auto p-2">
                  {selectedAccount?.folders && (
                    <FolderTree
                      folders={selectedAccount.folders}
                      selectedFolder={selectedFolder}
                      expandedFolders={expandedFolders}
                      onSelectFolder={setSelectedFolder}
                      onToggleExpand={(folderId) => {
                        setExpandedFolders(prev => {
                          const next = new Set(prev);
                          if (next.has(folderId)) {
                            next.delete(folderId);
                          } else {
                            next.add(folderId);
                          }
                          return next;
                        });
                      }}
                      onCreateFolder={handleCreateFolder}
                      onRenameFolder={handleRenameFolder}
                      onDeleteFolder={handleDeleteFolder}
                      onMarkAllRead={handleMarkAllRead}
                      onEmptyFolder={handleEmptyFolder}
                      onDragStart={(e, folder) => {}}
                      onDragOver={(e, folder) => {}}
                      onDrop={handleFolderDrop}
                    />
                  )}
                </div>

                {/* Quota Display */}
                {selectedAccount && (
                  <QuotaDisplay accountId={selectedAccount.id} className="mx-2 mb-2" />
                )}

                {/* Account Actions */}
                <div className="p-2 border-t space-y-1">
                  <button
                    onClick={() => setShowRulesModal(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <Settings className="w-3 h-3" />
                    E-Mail-Regeln
                  </button>
                  <button
                    onClick={() => setShowTemplatesModal(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <FileText className="w-3 h-3" />
                    Schnellantworten
                  </button>
                  <button
                    onClick={() => {
                      setEditingAccount(selectedAccount);
                      setShowAccountModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <Settings className="w-3 h-3" />
                    Konto-Einstellungen
                  </button>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

            {/* Message List Panel */}
            <Panel
              defaultSize={panelLayout.emailPanelSizes.messages}
              minSize={20}
              maxSize={50}
              className="bg-white border-r"
            >
              <div className="h-full flex flex-col">
                {/* Search & Actions */}
                <div className="p-2 border-b space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadMessages()}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  
                  {/* Bulk Actions */}
                  {selectedMessages.size > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <Button variant="ghost" size="sm" className="h-6 px-2" onClick={toggleSelectAll}>
                        <Check className="w-3 h-3 mr-1" />
                        {selectedMessages.size === messages.length ? 'Keine' : 'Alle'}
                      </Button>
                      <span className="text-gray-500">{selectedMessages.size} ausgewählt</span>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => setShowMoveModal(true)}
                      >
                        <Move className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-red-600 hover:text-red-700"
                        onClick={() => deleteMessages()}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto divide-y">
                  {loadingMessages ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Keine Nachrichten</p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isSelected = selectedMessages.has(message.uid);
                      const isActive = selectedMessage?.uid === message.uid;
                      const threadCount = (message as any)._threadCount;
                      
                      return (
                        <div
                          key={message.uid}
                          onClick={() => loadMessageContent(message)}
                          onDoubleClick={() => openMessageInModal(message)}
                          className={`p-2 cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-blue-50'
                              : isSelected
                              ? 'bg-gray-100'
                              : 'hover:bg-gray-50'
                          } ${!message.isRead ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleMessageSelection(message.uid, e as any)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1 rounded"
                            />
                            <button
                              onClick={(e) => toggleStar(message, e)}
                              className="mt-0.5 text-gray-400 hover:text-yellow-500"
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  message.isStarred ? 'fill-yellow-400 text-yellow-400' : ''
                                }`}
                              />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-sm truncate ${
                                    !message.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'
                                  }`}
                                >
                                  {message.fromName || message.fromAddress}
                                </span>
                                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                  {formatDate(message.date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span
                                  className={`text-sm truncate ${
                                    !message.isRead ? 'font-medium text-gray-800' : 'text-gray-600'
                                  }`}
                                >
                                  {message.subject || '(Kein Betreff)'}
                                </span>
                                {threadCount && threadCount > 1 && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {threadCount}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {message.hasAttachments && (
                                  <Paperclip className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                )}
                                <span className="text-xs text-gray-500 truncate">
                                  {message.snippet}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize" />

            {/* Message Content Panel */}
            <Panel
              defaultSize={panelLayout.emailPanelSizes.content}
              minSize={30}
              className="bg-white"
            >
              <div className="h-full flex flex-col">
                {loadingContent ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : selectedMessage && messageContent ? (
                  <>
                    {/* Message Header */}
                    <div className="p-4 border-b flex-shrink-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-semibold text-gray-900 truncate">
                            {selectedMessage.subject || '(Kein Betreff)'}
                          </h2>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                              {(selectedMessage.fromName || selectedMessage.fromAddress)[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {selectedMessage.fromName || selectedMessage.fromAddress}
                              </div>
                              <div className="text-sm text-gray-500 truncate">
                                {selectedMessage.fromAddress}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500 mt-2">
                            An: {selectedMessage.toAddresses.join(', ')}
                            {selectedMessage.ccAddresses.length > 0 && (
                              <span className="ml-2">CC: {selectedMessage.ccAddresses.join(', ')}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyTo({ message: selectedMessage, isForward: false });
                              setShowComposeModal(true);
                            }}
                            title="Antworten"
                          >
                            <Reply className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setReplyTo({ message: selectedMessage, isForward: true });
                              setShowComposeModal(true);
                            }}
                            title="Weiterleiten"
                          >
                            <Forward className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMessages([selectedMessage.uid])}
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {/* Image Warning Banner */}
                      {messageContent.htmlBody && 
                       !showImages[selectedMessage.fromAddress.toLowerCase()] && 
                       messageContent.htmlBody.includes('src="http') && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ImageOff className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm text-yellow-800">
                              Externe Bilder wurden blockiert
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowImages(prev => ({ 
                                ...prev, 
                                [selectedMessage.fromAddress.toLowerCase()]: true 
                              }))}
                            >
                              <ImageIcon className="w-4 h-4 mr-1" />
                              Einmal anzeigen
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => trustSender(selectedMessage.fromAddress)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Immer vertrauen
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Attachments */}
                      {messageContent.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex flex-wrap gap-2">
                            {messageContent.attachments.map((att, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 cursor-pointer"
                              >
                                <Paperclip className="w-3 h-3 text-gray-500" />
                                <span className="truncate max-w-[150px]">{att.filename}</span>
                                <span className="text-gray-400 text-xs">
                                  ({Math.round(att.size / 1024)}KB)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Message Body */}
                    <div className="flex-1 overflow-auto p-4">
                      {messageContent.htmlBody ? (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ 
                            __html: processHtmlContent(
                              messageContent.htmlBody, 
                              selectedMessage.fromAddress
                            ) 
                          }}
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm">
                          {messageContent.textBody}
                        </pre>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Wählen Sie eine Nachricht aus</p>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        )}
      </div>

      {/* Modals */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onSaved={() => {
          loadAccounts();
          setShowAccountModal(false);
          setEditingAccount(null);
        }}
      />

      <ComposeModal
        isOpen={showComposeModal}
        onClose={() => {
          setShowComposeModal(false);
          setReplyTo(null);
        }}
        account={selectedAccount}
        replyTo={replyTo}
        folderPath={selectedFolder?.path}
        signatures={signatures}
        onSent={() => {
          setShowComposeModal(false);
          setReplyTo(null);
          toast({ title: 'Erfolg', description: 'E-Mail wurde gesendet' });
        }}
      />

      <MoveModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        accounts={accounts}
        selectedAccount={selectedAccount}
        selectedFolder={selectedFolder}
        selectedMessages={Array.from(selectedMessages)}
        onMoved={() => {
          setShowMoveModal(false);
          setSelectedMessages(new Set());
          loadMessages();
          toast({ title: 'Erfolg', description: 'Nachrichten verschoben' });
        }}
      />

      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        onUpdate={(cats) => setCategories(cats)}
      />

      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        accountId={selectedAccount?.id || ''}
        signatures={signatures}
        onUpdate={(sigs) => setSignatures(sigs)}
      />

      {/* V4.5: Regeln Modal */}
      {showRulesModal && selectedAccount && (
        <RulesManager
          accountId={selectedAccount.id}
          folders={selectedAccount.folders || []}
          categories={categories}
          onClose={() => setShowRulesModal(false)}
        />
      )}

      {/* V4.5: Templates Modal */}
      {showTemplatesModal && (
        <TemplatesManager
          accountId={selectedAccount?.id}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}

      {/* V4.5: Ordner erstellen/umbenennen Modal */}
      <Dialog open={showFolderModal} onOpenChange={setShowFolderModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {folderModalMode === 'create' 
                ? (parentFolderPath ? 'Neuer Unterordner' : 'Neuer Ordner')
                : 'Ordner umbenennen'
              }
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {folderModalMode === 'create' && parentFolderPath && (
              <div className="text-sm text-gray-500">
                Übergeordnet: <span className="font-medium">{parentFolderPath}</span>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Ordnername
              </label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ordnername eingeben..."
                className="mt-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveFolderModal();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveFolderModal} disabled={!newFolderName.trim()}>
              {folderModalMode === 'create' ? 'Erstellen' : 'Umbenennen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detached Email Modal */}
      {showDetachedModal && detachedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 truncate">
                  {detachedMessage.message.subject || '(Kein Betreff)'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Von: {detachedMessage.message.fromName || detachedMessage.message.fromAddress}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetachedModal(false);
                  setDetachedMessage(null);
                }}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Email Info */}
            <div className="flex-shrink-0 px-6 py-3 bg-gray-50 border-b text-sm">
              <div className="flex items-center gap-4 text-gray-600">
                <span>An: {detachedMessage.message.toAddresses.join(', ')}</span>
                {detachedMessage.message.date && (
                  <span className="text-gray-400">
                    {new Date(detachedMessage.message.date).toLocaleString('de-DE', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </span>
                )}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {detachedMessage.content.htmlBody ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: detachedMessage.content.htmlBody }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                  {detachedMessage.content.textBody}
                </pre>
              )}
              
              {/* Attachments */}
              {detachedMessage.content.attachments.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Anhänge ({detachedMessage.content.attachments.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {detachedMessage.content.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm"
                      >
                        <Paperclip className="w-4 h-4 text-gray-500" />
                        <span>{att.filename}</span>
                        <span className="text-gray-400">({Math.round(att.size / 1024)}KB)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex-shrink-0 bg-white border-t px-6 py-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setReplyTo({ message: detachedMessage.message, isForward: false });
                  setShowComposeModal(true);
                  setShowDetachedModal(false);
                }}
              >
                <Reply className="w-4 h-4 mr-2" />
                Antworten
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setReplyTo({ message: detachedMessage.message, isForward: true });
                  setShowComposeModal(true);
                  setShowDetachedModal(false);
                }}
              >
                <Forward className="w-4 h-4 mr-2" />
                Weiterleiten
              </Button>
              <Button variant="outline" onClick={() => {
                setShowDetachedModal(false);
                setDetachedMessage(null);
              }}>
                Schließen
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}

// =====================================================
// ACCOUNT MODAL
// =====================================================
function AccountModal({
  isOpen,
  onClose,
  account,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  account: EmailAccount | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [testResult, setTestResult] = useState<{ imap?: any; smtp?: any } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    imapUser: '',
    imapPassword: '',
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
    isDefault: false,
  });

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        email: account.email,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        imapSecure: account.imapSecure,
        imapUser: account.imapUser,
        imapPassword: '',
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        smtpSecure: account.smtpSecure,
        smtpUser: account.smtpUser,
        smtpPassword: '',
        isDefault: account.isDefault,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        imapHost: '',
        imapPort: 993,
        imapSecure: true,
        imapUser: '',
        imapPassword: '',
        smtpHost: '',
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: '',
        smtpPassword: '',
        isDefault: false,
      });
    }
    setTestResult(null);
  }, [account, isOpen]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      if (account) {
        const res = await fetch(`/api/email/accounts/${account.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test' }),
        });
        const data = await res.json();
        setTestResult({ imap: data.imap, smtp: data.smtp });
      } else {
        const res = await fetch('/api/email/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, testConnection: true }),
        });
        const data = await res.json();
        if (res.ok) {
          setTestResult({ imap: { success: true }, smtp: { success: true } });
          if (data.account?.id) {
            await fetch(`/api/email/accounts/${data.account.id}`, { method: 'DELETE' });
          }
        } else {
          const isImap = data.error?.includes('IMAP');
          setTestResult({
            imap: { success: !isImap, error: isImap ? data.error : undefined },
            smtp: { success: isImap, error: !isImap ? data.error : undefined },
          });
        }
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Test fehlgeschlagen', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = account ? `/api/email/accounts/${account.id}` : '/api/email/accounts';
      const method = account ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Erfolg', description: account ? 'Konto aktualisiert' : 'Konto erstellt' });
        onSaved();
      } else {
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4"
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">
            {account ? 'E-Mail-Konto bearbeiten' : 'Neues E-Mail-Konto'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="z.B. SMC Office"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Adresse</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="mail@smc-office.eu"
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Server className="w-4 h-4" />
              IMAP-Einstellungen (Empfang)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Server</label>
                <Input
                  value={formData.imapHost}
                  onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                  placeholder="imap.example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Port</label>
                  <Input
                    type="number"
                    value={formData.imapPort}
                    onChange={(e) => setFormData({ ...formData, imapPort: parseInt(e.target.value) || 993 })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">SSL/TLS</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.imapSecure ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, imapSecure: e.target.value === 'true' })}
                  >
                    <option value="true">Ja</option>
                    <option value="false">Nein</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Benutzername</label>
                <Input
                  value={formData.imapUser}
                  onChange={(e) => setFormData({ ...formData, imapUser: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Passwort</label>
                <div className="relative">
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={formData.imapPassword}
                    onChange={(e) => setFormData({ ...formData, imapPassword: e.target.value })}
                    placeholder={account ? '(unverändert)' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4" />
              SMTP-Einstellungen (Versand)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Server</label>
                <Input
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Port</label>
                  <Input
                    type="number"
                    value={formData.smtpPort}
                    onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">SSL/TLS</label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.smtpSecure ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, smtpSecure: e.target.value === 'true' })}
                  >
                    <option value="false">STARTTLS</option>
                    <option value="true">SSL/TLS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Benutzername</label>
                <Input
                  value={formData.smtpUser}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Passwort</label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                  placeholder={account ? '(unverändert)' : ''}
                />
              </div>
            </div>
          </div>

          {testResult && (
            <div className="p-4 rounded-xl border">
              <h3 className="font-medium mb-2">Verbindungstest</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  {testResult.imap?.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span>IMAP: {testResult.imap?.success ? 'OK' : testResult.imap?.error}</span>
                </div>
                <div className="flex items-center gap-2">
                  {testResult.smtp?.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span>SMTP: {testResult.smtp?.success ? 'OK' : testResult.smtp?.error}</span>
                </div>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Als Standard-Konto festlegen</span>
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between">
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Server className="w-4 h-4 mr-2" />}
            Verbindung testen
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Speichern
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// =====================================================
// COMPOSE MODAL
// =====================================================
function ComposeModal({
  isOpen,
  onClose,
  account,
  replyTo,
  folderPath,
  signatures,
  onSent,
}: {
  isOpen: boolean;
  onClose: () => void;
  account: EmailAccount | null;
  replyTo: { message: EmailMessage; isForward: boolean } | null;
  folderPath?: string;
  signatures: EmailSignature[];
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    text: '',
    signatureId: '',
  });

  // Auto-Save Draft
  const saveDraft = useCallback(async () => {
    if (!account || !formData.subject && !formData.text && !formData.to) return;
    
    setAutoSaving(true);
    try {
      const res = await fetch('/api/email/drafts', {
        method: draftId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draftId,
          accountId: account.id,
          subject: formData.subject,
          toAddresses: formData.to.split(',').map(e => e.trim()).filter(Boolean),
          ccAddresses: formData.cc ? formData.cc.split(',').map(e => e.trim()).filter(Boolean) : [],
          bccAddresses: formData.bcc ? formData.bcc.split(',').map(e => e.trim()).filter(Boolean) : [],
          textBody: formData.text,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setDraftId(data.id);
      }
    } catch (error) {
      console.error('Draft save failed:', error);
    } finally {
      setAutoSaving(false);
    }
  }, [account, formData, draftId]);

  // Trigger auto-save on content change
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(saveDraft, 3000);
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [formData.subject, formData.text, formData.to, saveDraft]);

  useEffect(() => {
    if (replyTo) {
      const prefix = replyTo.isForward ? 'Fwd: ' : 'Re: ';
      const subject = replyTo.message.subject.startsWith(prefix)
        ? replyTo.message.subject
        : prefix + replyTo.message.subject;
      
      setFormData({
        to: replyTo.isForward ? '' : replyTo.message.fromAddress,
        cc: '',
        bcc: '',
        subject,
        text: '',
        signatureId: signatures.find(s => s.isReplyDefault)?.id || '',
      });
    } else {
      const defaultSig = signatures.find(s => s.isDefault);
      setFormData({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        text: defaultSig ? `\n\n${defaultSig.content}` : '',
        signatureId: defaultSig?.id || '',
      });
    }
    setAttachments([]);
    setDraftId(null);
  }, [replyTo, isOpen, signatures]);

  const handleAddAttachments = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    const newFiles: File[] = [];
    const oversizedFiles: string[] = [];
    
    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(`${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
      } else {
        newFiles.push(file);
      }
    });
    
    if (oversizedFiles.length > 0) {
      toast({
        title: 'Dateien zu groß',
        description: `Max. 25 MB pro Datei: ${oversizedFiles.join(', ')}`,
        variant: 'destructive',
      });
    }
    
    if (newFiles.length > 0) {
      setAttachments(prev => [...prev, ...newFiles]);
    }
    
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async () => {
    if (!account) return;
    if (!formData.to.trim()) {
      toast({ title: 'Fehler', description: 'Empfänger erforderlich', variant: 'destructive' });
      return;
    }
    if (!formData.subject.trim()) {
      toast({ title: 'Fehler', description: 'Betreff erforderlich', variant: 'destructive' });
      return;
    }
    
    setSending(true);
    
    try {
      const sendData = new FormData();
      sendData.append('accountId', account.id);
      sendData.append('to', JSON.stringify(formData.to.split(',').map((e) => e.trim()).filter(Boolean)));
      sendData.append('cc', JSON.stringify(formData.cc ? formData.cc.split(',').map((e) => e.trim()).filter(Boolean) : []));
      sendData.append('bcc', JSON.stringify(formData.bcc ? formData.bcc.split(',').map((e) => e.trim()).filter(Boolean) : []));
      sendData.append('subject', formData.subject);
      sendData.append('text', formData.text);
      
      if (replyTo) {
        sendData.append('replyToUid', String(replyTo.message.uid));
        sendData.append('replyToFolderPath', folderPath || '');
        sendData.append('isForward', String(replyTo.isForward));
        sendData.append('originalFrom', replyTo.message.fromAddress);
        sendData.append('originalDate', replyTo.message.date || '');
      }
      
      attachments.forEach(file => {
        sendData.append('attachments', file);
      });
      
      const res = await fetch('/api/email/send', {
        method: 'POST',
        body: sendData,
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Delete draft if exists
        if (draftId) {
          await fetch(`/api/email/drafts?id=${draftId}`, { method: 'DELETE' });
        }
        onSent();
      } else {
        toast({ title: 'Fehler', description: data.error || 'Senden fehlgeschlagen', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Senden fehlgeschlagen', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden m-4 flex flex-col"
      >
        <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">
              {replyTo?.isForward ? 'Weiterleiten' : replyTo ? 'Antworten' : 'Neue E-Mail'}
            </h2>
            {autoSaving && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Speichern...
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">An</label>
            <Input
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              placeholder="empfaenger@example.com"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CC</label>
              <Input
                value={formData.cc}
                onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                placeholder="cc@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BCC</label>
              <Input
                value={formData.bcc}
                onChange={(e) => setFormData({ ...formData, bcc: e.target.value })}
                placeholder="bcc@example.com"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Betreff</label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Betreff eingeben..."
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Nachricht</label>
              {signatures.length > 0 && (
                <select
                  className="text-sm border rounded px-2 py-1"
                  value={formData.signatureId}
                  onChange={(e) => {
                    const sig = signatures.find(s => s.id === e.target.value);
                    setFormData({
                      ...formData,
                      signatureId: e.target.value,
                      text: formData.text.split('\n\n--')[0] + (sig ? `\n\n${sig.content}` : ''),
                    });
                  }}
                >
                  <option value="">Keine Signatur</option>
                  {signatures.map(sig => (
                    <option key={sig.id} value={sig.id}>{sig.name}</option>
                  ))}
                </select>
              )}
            </div>
            <Textarea
              value={formData.text}
              onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              placeholder="Ihre Nachricht..."
              rows={10}
            />
          </div>
          
          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Anhänge</label>
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                onChange={handleAddAttachments}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => attachmentInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4 mr-1" />
                Hinzufügen
              </Button>
            </div>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm"
                  >
                    <Paperclip className="w-3 h-3 text-gray-500" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <span className="text-gray-400 text-xs">
                      ({formatFileSize(file.size)})
                    </span>
                    <button
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 bg-white border-t px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Senden
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// =====================================================
// MOVE MODAL
// =====================================================
function MoveModal({
  isOpen,
  onClose,
  accounts,
  selectedAccount,
  selectedFolder,
  selectedMessages,
  onMoved,
}: {
  isOpen: boolean;
  onClose: () => void;
  accounts: EmailAccount[];
  selectedAccount: EmailAccount | null;
  selectedFolder: EmailFolder | null;
  selectedMessages: number[];
  onMoved: () => void;
}) {
  const { toast } = useToast();
  const [moving, setMoving] = useState(false);
  const [targetAccountId, setTargetAccountId] = useState('');
  const [targetFolderPath, setTargetFolderPath] = useState('');

  useEffect(() => {
    if (isOpen && selectedAccount) {
      setTargetAccountId(selectedAccount.id);
      setTargetFolderPath('');
    }
  }, [isOpen, selectedAccount]);

  const targetAccount = accounts.find(a => a.id === targetAccountId);

  const handleMove = async () => {
    if (!selectedAccount || !selectedFolder || !targetFolderPath) return;
    
    setMoving(true);
    try {
      const res = await fetch('/api/email/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageUids: selectedMessages,
          sourceAccountId: selectedAccount.id,
          sourceFolderPath: selectedFolder.path,
          targetAccountId,
          targetFolderPath,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        onMoved();
      } else {
        toast({ title: 'Fehler', description: data.error || 'Verschieben fehlgeschlagen', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Verschieben fehlgeschlagen', variant: 'destructive' });
    } finally {
      setMoving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4"
      >
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Move className="w-5 h-5" />
            {selectedMessages.length} Nachricht(en) verschieben
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ziel-Konto</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={targetAccountId}
              onChange={(e) => {
                setTargetAccountId(e.target.value);
                setTargetFolderPath('');
              }}
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ziel-Ordner</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={targetFolderPath}
              onChange={(e) => setTargetFolderPath(e.target.value)}
            >
              <option value="">Ordner wählen...</option>
              {targetAccount?.folders?.map(folder => (
                <option 
                  key={folder.id} 
                  value={folder.path}
                  disabled={selectedAccount?.id === targetAccountId && folder.path === selectedFolder?.path}
                >
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {targetAccountId !== selectedAccount?.id && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <strong>Hinweis:</strong> Beim Verschieben zwischen Konten werden die Nachrichten kopiert und anschließend im Quell-Konto gelöscht.
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleMove} disabled={moving || !targetFolderPath}>
            {moving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Move className="w-4 h-4 mr-2" />}
            Verschieben
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// =====================================================
// CATEGORY MODAL
// =====================================================
function CategoryModal({
  isOpen,
  onClose,
  categories,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: EmailCategory[];
  onUpdate: (cats: EmailCategory[]) => void;
}) {
  const { toast } = useToast();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/email/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, color: newColor }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        onUpdate([...categories, data]);
        setNewName('');
        toast({ title: 'Erfolg', description: 'Kategorie erstellt' });
      } else {
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Erstellen fehlgeschlagen', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Kategorie wirklich löschen?')) return;
    
    try {
      await fetch(`/api/email/categories?id=${id}`, { method: 'DELETE' });
      onUpdate(categories.filter(c => c.id !== id));
      toast({ title: 'Erfolg', description: 'Kategorie gelöscht' });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Löschen fehlgeschlagen', variant: 'destructive' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4"
      >
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Kategorien verwalten
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Add New */}
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Neue Kategorie..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border"
            />
            <Button onClick={handleAdd} disabled={saving || !newName.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>

          {/* Predefined Colors */}
          <div className="flex flex-wrap gap-1 mb-4">
            {categoryColors.map(color => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className={`w-6 h-6 rounded-full border-2 ${
                  newColor === color ? 'border-gray-800' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Category List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Keine Kategorien vorhanden</p>
            ) : (
              categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t px-6 py-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Schließen</Button>
        </div>
      </motion.div>
    </div>
  );
}

// =====================================================
// SIGNATURE MODAL
// =====================================================
function SignatureModal({
  isOpen,
  onClose,
  accountId,
  signatures,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  signatures: EmailSignature[];
  onUpdate: (sigs: EmailSignature[]) => void;
}) {
  const { toast } = useToast();
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isReplyDefault, setIsReplyDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingSignature) {
      setNewName(editingSignature.name);
      setNewContent(editingSignature.content);
      setIsDefault(editingSignature.isDefault);
      setIsReplyDefault(editingSignature.isReplyDefault);
    } else {
      setNewName('');
      setNewContent('');
      setIsDefault(false);
      setIsReplyDefault(false);
    }
  }, [editingSignature]);

  const handleSave = async () => {
    if (!newName.trim() || !newContent.trim()) return;
    
    setSaving(true);
    try {
      const method = editingSignature ? 'PUT' : 'POST';
      const res = await fetch('/api/email/signatures', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSignature?.id,
          accountId,
          name: newName,
          content: newContent,
          isDefault,
          isReplyDefault,
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (editingSignature) {
          onUpdate(signatures.map(s => s.id === data.id ? data : s));
        } else {
          onUpdate([...signatures, data]);
        }
        setEditingSignature(null);
        setNewName('');
        setNewContent('');
        toast({ title: 'Erfolg', description: editingSignature ? 'Signatur aktualisiert' : 'Signatur erstellt' });
      } else {
        toast({ title: 'Fehler', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Signatur wirklich löschen?')) return;
    
    try {
      await fetch(`/api/email/signatures?id=${id}`, { method: 'DELETE' });
      onUpdate(signatures.filter(s => s.id !== id));
      toast({ title: 'Erfolg', description: 'Signatur gelöscht' });
    } catch (error) {
      toast({ title: 'Fehler', description: 'Löschen fehlgeschlagen', variant: 'destructive' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex-shrink-0 border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <PenLine className="w-5 h-5" />
            Signaturen verwalten
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Signature List */}
            <div>
              <h3 className="font-medium mb-3">Vorhandene Signaturen</h3>
              <div className="space-y-2">
                {signatures.length === 0 ? (
                  <p className="text-gray-500 text-sm">Keine Signaturen vorhanden</p>
                ) : (
                  signatures.map(sig => (
                    <div
                      key={sig.id}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        editingSignature?.id === sig.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setEditingSignature(sig)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{sig.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(sig.id);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-2 mt-1">
                        {sig.isDefault && (
                          <Badge variant="secondary" className="text-xs">Standard</Badge>
                        )}
                        {sig.isReplyDefault && (
                          <Badge variant="outline" className="text-xs">Antwort</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEditingSignature(null)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Neue Signatur
                </Button>
              </div>
            </div>

            {/* Editor */}
            <div>
              <h3 className="font-medium mb-3">
                {editingSignature ? 'Signatur bearbeiten' : 'Neue Signatur'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name</label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="z.B. Geschäftlich"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Inhalt</label>
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Mit freundlichen Grüßen...."
                    rows={6}
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Standard für neue E-Mails</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isReplyDefault}
                      onChange={(e) => setIsReplyDefault(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Standard für Antworten</span>
                  </label>
                </div>
                <Button onClick={handleSave} disabled={saving || !newName.trim() || !newContent.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingSignature ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t px-6 py-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Schließen</Button>
        </div>
      </motion.div>
    </div>
  );
}
