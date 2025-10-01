"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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

const Row = React.memo(function Row({
  image,
  selected,
  current,
  bboxCount,
  status,
  onToggle,
  onActivate,
}: {
  image: ImageItem;
  selected: boolean;
  current: boolean;
  bboxCount: number;
  status: 'empty' | 'annotated' | 'validated';
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
        className={`flex-1 text-left truncate font-medium flex items-center gap-1 ${current ? 'text-primary' : 'text-foreground'}`}
        onClick={onActivate}
        title={image.name}
      >
        <span
          className={
            'inline-block w-2 h-2 rounded-full flex-shrink-0 border border-white/60 ' +
            (status === 'validated'
              ? 'bg-green-500'
              : status === 'annotated'
                ? 'bg-orange-500'
                : 'bg-gray-300 dark:bg-gray-500')
          }
          title={status}
        />
        <span className="truncate">{image.name}</span>
      </button>
      <div
        className={`ml-2 px-1.5 py-0.5 rounded border text-[10px] leading-none font-medium min-w-[1.5rem] text-center ${
          bboxCount > 0
            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-300/60'
            : 'bg-muted text-muted-foreground border-border/40'
        }`}
        title={bboxCount > 0 ? `${bboxCount} annotations` : 'No annotations'}
      >
        {bboxCount > 0 ? bboxCount : '-'}
      </div>
    </div>
  );
}, (a, b) => a.selected === b.selected && a.current === b.current && a.image.id === b.image.id && a.bboxCount === b.bboxCount && a.status === b.status);

export function ImageManager({ onImageSelect, selectedImageId }: ImageManagerProps) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as ('admin' | 'member' | undefined);
  const { currentProject, removeImage, setCurrentImage, getBBoxesForImage } = useLabelStore();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Unified status filter: all | empty | annotated | validated
  const [statusFilter, setStatusFilter] = useState<'all' | 'empty' | 'annotated' | 'validated'>('all');
  const [isDeleting, setIsDeleting] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  // (1) Ascending A-Z sort
  const images = useMemo(() => {
    const arr = currentProject?.images || [];
    return [...arr].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [currentProject?.images]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = images;
    if (q) list = list.filter(i => i.name.toLowerCase().includes(q));
    if (statusFilter !== 'all') {
      list = list.filter(i => {
        const count = getBBoxesForImage(i.id).length;
        const validated = i.status === 'validated';
        if (statusFilter === 'validated') return validated;
        if (statusFilter === 'annotated') return !validated && count > 0;
        if (statusFilter === 'empty') return count === 0;
        return true;
      });
    }
    return list;
  }, [images, search, statusFilter, getBBoxesForImage]);

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

  const activate = useCallback((id: string) => {
    if (onImageSelect) onImageSelect(id); else setCurrentImage(id);
  }, [onImageSelect, setCurrentImage]);

  const handleBulkDelete = useCallback(async () => {
    if (!currentProject || selected.size === 0) return;
    const list = Array.from(selected);
    if (!confirm(`Hapus ${list.length} gambar? Semua annotation terkait akan ikut dihapus.`)) return;
    setIsDeleting(true);
    try {
      let apiTried = false;
      let apiSuccess = false;
      const apiErrors: string[] = [];
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

      for (const id of list) {
        await removeImage(id);
      }
      setSelected(new Set());

      if (apiSuccess && apiErrors.length === 0) {
        toast.success(`Berhasil menghapus ${list.length} gambar`);
      } else if (apiSuccess && apiErrors.length > 0) {
        toast.warning(`Berhasil (lokal & server). Ada peringatan.`, { description: apiErrors.slice(0,5).join('\n') });
      } else if (!apiSuccess && apiTried) {
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
    }
  }, [currentProject, selected, removeImage]);

  // (3) Auto scroll to selected image if changed externally
  useEffect(() => {
    if (!listRef.current || !selectedImageId) return;
    const container = listRef.current;
    const el = container.querySelector(`[data-image-id="${selectedImageId}"]`) as HTMLElement | null;
    if (!el) return;
    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    if (elTop < viewTop) {
      container.scrollTo({ top: elTop, behavior: 'smooth' });
    } else if (elBottom > viewBottom) {
      container.scrollTo({ top: elBottom - container.clientHeight, behavior: 'smooth' });
    }
  }, [selectedImageId]);

  if (!currentProject) {
    return <div className="p-4 text-sm text-muted-foreground">Tidak ada project aktif</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-background sticky top-0 z-10 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari file..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2">
          <span>{filtered.length} / {images.length} files</span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-7 rounded border bg-background text-[11px] px-2 focus:outline-none focus:ring focus:ring-primary/30"
              title="Filter status"
            >
              <option value="all">All</option>
              <option value="empty">Empty</option>
              <option value="annotated">Annotated</option>
              <option value="validated">Validated</option>
            </select>
            {selected.size > 0 && (
              <span className="text-foreground font-medium whitespace-nowrap">{selected.size} dipilih</span>
            )}
          </div>
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

      <div ref={listRef} className="flex-1 overflow-auto font-mono text-[12px] leading-relaxed">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada gambar</div>
        ) : (
          filtered.map(img => {
            const bboxCount = getBBoxesForImage(img.id).length;
            const status: 'empty' | 'annotated' | 'validated' = img.status === 'validated'
              ? 'validated'
              : (bboxCount > 0 ? 'annotated' : 'empty');
            return (
              <Row
                key={img.id}
                image={img}
                selected={selected.has(img.id)}
                current={img.id === selectedImageId}
                bboxCount={bboxCount}
                status={status}
                onToggle={() => { toggleOne(img.id); }}
                onActivate={() => activate(img.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
