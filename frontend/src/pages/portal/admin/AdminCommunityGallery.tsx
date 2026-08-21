import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { logAudit } from '../../../lib/admin';
import Toast from '../../../components/Toast';

type GalleryItem = {
  id: string;
  title: string;
  image_url: string;
  sort_order: number;
  visible: boolean;
  created_at: string;
};

const EMPTY = { title: '', image_url: '', sort_order: 0, visible: true };

export default function AdminCommunityGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GalleryItem | null>(null);

  const fetchAll = async () => {
    const res = await supabase.from('community_gallery').select('*').order('sort_order');
    return (res.data ?? []) as GalleryItem[];
  };

  useEffect(() => {
    void (async () => {
      setItems(await fetchAll());
      setLoading(false);
    })();
  }, []);

  const startCreate = () => {
    setForm({ ...EMPTY, sort_order: items.length + 1 });
    setImageFile(null);
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (item: GalleryItem) => {
    setForm({ title: item.title, image_url: item.image_url, sort_order: item.sort_order, visible: item.visible });
    setImageFile(null);
    setEditing(item);
    setCreating(false);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return form.image_url || null;
    const path = `gallery/${crypto.randomUUID()}-${imageFile.name.replace(/[^\w.-]+/g, '_')}`;
    const { error } = await supabase.storage.from('community_gallery').upload(path, imageFile, { cacheControl: '3600', contentType: imageFile.type || 'image/jpeg' });
    if (error) throw new Error(`Image upload failed: ${error.message}`);
    const { data } = supabase.storage.from('community_gallery').getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const image_url = await uploadImage();
      if (!image_url) {
        setToast({ type: 'error', message: 'Please select an image.' });
        setSaving(false);
        return;
      }
      const payload = { ...form, title: form.title.trim(), image_url };
      if (editing) {
        const { error } = await supabase.from('community_gallery').update(payload).eq('id', editing.id);
        if (error) throw new Error(error.message);
        await logAudit('Update gallery item', `Updated "${payload.title}".`);
      } else {
        const { error } = await supabase.from('community_gallery').insert(payload);
        if (error) throw new Error(error.message);
        await logAudit('Add gallery item', `Added "${payload.title}".`);
      }
      setToast({ type: 'success', message: editing ? 'Item updated.' : 'Item added.' });
      setCreating(false);
      setEditing(null);
      setForm(EMPTY);
      setItems(await fetchAll());
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleVisible = async (item: GalleryItem) => {
    setBusyId(item.id);
    const { error } = await supabase.from('community_gallery').update({ visible: !item.visible }).eq('id', item.id);
    setBusyId(null);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      setItems(await fetchAll());
    }
  };

  const deleteItem = async (item: GalleryItem) => {
    setBusyId(item.id);
    const { error } = await supabase.from('community_gallery').delete().eq('id', item.id);
    setBusyId(null);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Delete gallery item', `Deleted "${item.title}".`);
      setToast({ type: 'success', message: 'Item deleted.' });
      setItems(await fetchAll());
    }
  };

  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY);
    setImageFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Community Gallery</h2>
          <p className="font-body-sm text-on-surface-variant">Manage images shown in the homepage carousel.</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="bg-secondary hover:bg-secondary/90 text-on-secondary px-5 py-2 rounded-lg font-label-md text-label-md flex items-center gap-2 shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
          Add Image
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-on-surface-variant">Loading gallery…</div>
      ) : items.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-10 text-center text-on-surface-variant">
          No gallery items yet. Click "Add Image" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className={`bg-surface-container-lowest rounded-xl border border-border-subtle overflow-hidden transition-all ${item.visible ? '' : 'opacity-60'}`}>
              <div className="h-48 overflow-hidden bg-surface-container-low">
                <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-label-md text-label-md font-medium text-on-surface truncate">{item.title}</h3>
                  <span className="text-xs text-on-surface-variant shrink-0">#{item.sort_order}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => startEdit(item)}
                    className="flex-1 py-1.5 px-3 rounded-lg border border-outline-variant text-on-surface font-label-sm text-label-sm hover:bg-surface-bg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => toggleVisible(item)}
                    className={`py-1.5 px-3 rounded-lg border font-label-sm text-label-sm transition-colors flex items-center justify-center gap-1 disabled:opacity-50 ${item.visible ? 'border-success-green/30 text-success-green hover:bg-success-green/5' : 'border-outline-variant text-on-surface-variant hover:bg-surface-bg'}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{item.visible ? 'visibility' : 'visibility_off'}</span>
                    {item.visible ? 'Visible' : 'Hidden'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => setConfirmDelete(item)}
                    className="py-1.5 px-3 rounded-lg border border-error-red/30 text-error-red font-label-sm text-label-sm hover:bg-error-red/5 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-surface-container-lowest z-10">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{editing ? 'Edit Gallery Item' : 'Add Gallery Item'}</h3>
              <button type="button" onClick={cancel} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Title *</label>
                <input
                  className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Zone 4 Tree Planting Event"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-on-surface-variant">Image *</label>
                {(editing || form.image_url) && (
                  <div className="rounded-lg overflow-hidden border border-border-subtle h-36">
                    <img src={editing?.image_url || form.image_url} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  id="gallery-image"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setImageFile(file);
                    if (file) {
                      setForm({ ...form, image_url: URL.createObjectURL(file) });
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="gallery-image" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-lg text-sm font-medium hover:bg-secondary/20 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  Choose File
                </label>
                {imageFile && <span className="text-xs text-on-surface-variant ml-2">{imageFile.name}</span>}
                {editing && !imageFile && (
                  <p className="text-[11px] text-on-surface-variant">Leave empty to keep the current image.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Sort Order</label>
                  <input
                    type="number"
                    className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Visibility</label>
                  <select
                    className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                    value={form.visible ? 'visible' : 'hidden'}
                    onChange={(e) => setForm({ ...form, visible: e.target.value === 'visible' })}
                  >
                    <option value="visible">Visible on Homepage</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cancel} className="flex-1 bg-surface-container-low border border-border-subtle text-on-surface rounded-lg py-2 text-label-md font-medium hover:bg-surface-bg transition-colors">
                  Cancel
                </button>
                <button type="button" disabled={saving} onClick={() => void save()} className="flex-1 bg-secondary hover:bg-secondary/90 text-on-secondary rounded-lg py-2 text-label-md font-medium disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-error-red/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-error-red">warning</span>
              </span>
              <div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Delete Gallery Image</h3>
                <p className="text-body-sm text-on-surface-variant">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-1">Are you sure you want to delete this image from the gallery?</p>
            <p className="text-body-sm text-on-surface font-semibold mb-6">{confirmDelete.title}</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-border-subtle rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors">
                Cancel
              </button>
              <button type="button" onClick={async () => { await deleteItem(confirmDelete); setConfirmDelete(null); }} className="px-4 py-2 bg-error-red text-white rounded-lg text-sm font-medium hover:bg-error-red/90 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
