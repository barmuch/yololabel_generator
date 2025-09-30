'use client';

import React, { useState, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { useLabelStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Search, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { ImageItem } from '@/lib/types';

interface ImageManagerProps {
  onImageSelect?: (imageId: string) => void;
  selectedImageId?: string | null;
}

// Row list item (memoized to prevent unnecessary rerenders)
const Row = React.memo(function Row({
  image,
  selected,
  current,
  onToggle,
  onActivate,
}: {
  image: ImageItem;
  selected: boolean;
  current: boolean;
  onToggle: () => void;
  onActivate: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 text-xs border-b border-border/40 last:border-b-0 select-none transition-colors ${
        current ? 'bg-primary/5' : 'hover:bg-muted/60'
      }`}
      data-image-id={image.id}
    >
      <button
        onClick={onToggle}
        className={`flex items-center justify-center w-5 h-5 rounded border text-[10px] transition-colors ${
          selected
            ? 'bg-blue-500 border-blue-500 text-white'
            : 'bg-background border-border hover:bg-muted'
        }`}
        aria-label={selected ? 'Unselect' : 'Select'}
      >
        {selected && <Check className="w-3 h-3" />}
      </button>
      <button
        className={`flex-1 text-left truncate font-medium ${current ? 'text-primary' : 'text-foreground'}`}
        onClick={onActivate}
        title={image.name}
      >
        {image.name}
      </button>
    </div>
  );
}, (a, b) => a.selected === b.selected && a.current === b.current && a.image.id === b.image.id);

export function ImageManager({ onImageSelect, selectedImageId }: ImageManagerProps) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as ('admin' | 'member' | undefined);
  const { currentProject, removeImage, setCurrentImage } = useLabelStore();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollPosRef = useRef(0);

  const captureScroll = useCallback(() => {
    if (listRef.current) scrollPosRef.current = listRef.current.scrollTop;
  }, []);
  const restoreScroll = useCallback(() => {
    if (listRef.current) listRef.current.scrollTop = scrollPosRef.current;
  }, []);
  useLayoutEffect(() => { restoreScroll(); });

  const images = currentProject?.images || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return images;
    return images.filter(i => i.name.toLowerCase().includes(q));
  }, [images, search]);

  const toggleOne = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map(i => i.id));
    });
  }, [filtered]);

  // (Clear selection removed per new UX: button now performs deletion)

  const activate = useCallback((id: string) => {
    if (onImageSelect) onImageSelect(id); else setCurrentImage(id);
  }, [onImageSelect, setCurrentImage]);

  const handleBulkDelete = useCallback(async () => {
    if (!currentProject || selected.size === 0) return;
    const list = Array.from(selected);
    if (!confirm(`Hapus ${list.length} gambar? Semua annotation terkait akan ikut dihapus.`)) return;
    setIsDeleting(true);
    captureScroll();
    try {
      let apiTried = false;
      let apiSuccess = false;
      let apiErrors: string[] = [];
      try {
        apiTried = true;
        const res = await fetch('/api/images/bulk-delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageIds: list, projectId: currentProject.id, deleteFromCloudinary: true })
        });
        const text = await res.text();
        let json: any = null;
        try { json = text ? JSON.parse(text) : null; } catch (err) {
          console.warn('Bulk delete response not JSON:', text);
        }
        if (!res.ok || !json?.success) {
          const errMsg = json?.error || json?.details || res.statusText;
          // Special case: rate limit but we will still remove locally; downgrade severity
          if (res.status === 429) {
            apiErrors.push('Rate limited (server). Menghapus lokal tetap lanjut.');
          } else {
            apiErrors.push(`API: ${errMsg}`);
          }
        } else {
          apiSuccess = true;
          const resultErrors = json?.results?.errors || [];
          if (resultErrors.length > 0) {
            apiErrors.push(...resultErrors.map((e: any) => `${e.imageId}: ${e.error}`));
          }
        }
      } catch (err: any) {
        apiErrors.push(err?.message || 'Network error');
      }

      // Always remove locally for consistency
      for (const id of list) {
        await removeImage(id);
      }
      setSelected(new Set());

      if (apiSuccess && apiErrors.length === 0) {
        toast.success(`Berhasil menghapus ${list.length} gambar`);
      } else if (apiSuccess && apiErrors.length > 0) {
        toast.warning(`Berhasil (lokal & server). Ada peringatan.`, { description: apiErrors.slice(0,5).join('\n') });
      } else if (!apiSuccess && apiTried) {
        // Distinguish rate limit vs fatal
        const onlyRateLimit = apiErrors.length > 0 && apiErrors.every(e => e.toLowerCase().includes('rate'));
        if (onlyRateLimit) {
          toast.success(`Dihapus lokal (${list.length}). Server dibatasi sementara.`);
        } else {
          toast.warning(`Hapus lokal (${list.length}). API gagal.`, { description: apiErrors.slice(0,5).join('\n') });
        }
      } else {
        toast.success(`Hapus lokal ${list.length} gambar (API tidak dicoba)`);
      }
    } catch (e: any) {
      toast.error('Gagal menghapus gambar', { description: e.message });
    } finally {
      setIsDeleting(false);
      restoreScroll();
    }
  }, [currentProject, selected, removeImage, captureScroll, restoreScroll]);

  if (!currentProject) {
    return <div className="p-4 text-sm text-muted-foreground">Tidak ada project aktif</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header / search & actions container (fixed height to prevent scroll jump) */}
      <div className="p-3 border-b bg-background sticky top-0 z-10 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari file..."
            value={search}
            onChange={(e) => { captureScroll(); setSearch(e.target.value); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{filtered.length} / {images.length} files</span>
          {selected.size > 0 && (
            <span className="text-foreground font-medium">{selected.size} dipilih</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center min-h-[2rem]">
          {selected.size > 0 ? (
            <>
              <Button size="sm" variant="outline" onClick={toggleAll}>
                {selected.size === filtered.length ? 'Unselect All' : 'Select All'}
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                <Trash2 className="w-4 h-4 mr-1" />{isDeleting ? 'Deleting...' : `Delete (${selected.size})`}
              </Button>
            </>
          ) : (
            <div className="text-[11px] italic text-muted-foreground">Pilih beberapa file untuk bulk delete</div>
          )}
        </div>
      </div>

      {/* Scrollable list */}
      <div ref={listRef} className="flex-1 overflow-auto font-mono text-[12px] leading-relaxed">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada gambar</div>
        ) : (
          filtered.map(img => (
            <Row
              key={img.id}
              image={img}
              selected={selected.has(img.id)}
              current={img.id === selectedImageId}
              onToggle={() => { captureScroll(); toggleOne(img.id); }}
              onActivate={() => activate(img.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}