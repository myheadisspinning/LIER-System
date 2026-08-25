import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { logAudit } from '../../../lib/admin';
import Toast from '../../../components/Toast';
import { useScrollLock } from '../../../lib/useScrollLock';

type GalleryItem = {
  id: string;
  title: string;
  image_url: string;
  sort_order: number;
  visible: boolean;
  created_at: string;
};

type SectionImage = {
  id: string;
  section: string;
  slot_key: string;
  label: string;
  image_url: string;
  updated_at: string;
};

const EMPTY = { title: '', image_url: '', sort_order: 0, visible: true };

type Tab = 'carousel' | 'sections';

export default function AdminCommunityGallery() {
  const [tab, setTab] = useState<Tab>('carousel');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [sectionImages, setSectionImages] = useState<SectionImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSections, setLoadingSections] = useState(true);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GalleryItem | null>(null);
  const [editingSection, setEditingSection] = useState<SectionImage | null>(null);
  const [sectionFile, setSectionFile] = useState<File | null>(null);
  const [sectionForm, setSectionForm] = useState<{ label: string; image_url: string }>({ label: '', image_url: '' });
  const [savingSection, setSavingSection] = useState(false);

  useScrollLock(creating || editing != null || confirmDelete != null || editingSection != null);

  const fetchAll = async () => {
    const res = await supabase.from('community_gallery').select('*').order('sort_order');
    return (res.data ?? []) as GalleryItem[];
  };

  const fetchSectionImages = async () => {
    const res = await supabase.from('home_section_images').select('*').order('section', { ascending: true }).order('slot_key');
    return (res.data ?? []) as SectionImage[];
  };

  useEffect(() => {
    void (async () => {
      setItems(await fetchAll());
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (tab === 'sections') {
      void (async () => {
        setSectionImages(await fetchSectionImages());
        setLoadingSections(false);
      })();
    }
  }, [tab]);

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

  const uploadSectionImage = async (file: File): Promise<string> => {
    const path = `sections/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
    const { error } = await supabase.storage.from('community_gallery').upload(path, file, { cacheControl: '3600', contentType: file.type || 'image/jpeg' });
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

  const saveSectionImage = async () => {
    if (!editingSection) return;
    setSavingSection(true);
    try {
      let image_url = sectionForm.image_url;
      if (sectionFile) {
        image_url = await uploadSectionImage(sectionFile);
      }
      const { error } = await supabase.from('home_section_images').update({ label: sectionForm.label, image_url, updated_at: new Date().toISOString() }).eq('id', editingSection.id);
      if (error) throw new Error(error.message);
      await logAudit('Update section image', `Updated "${sectionForm.label}" image.`);
      setToast({ type: 'success', message: 'Section updated.' });
      setEditingSection(null);
      setSectionFile(null);
      setSectionForm({ label: '', image_url: '' });
      setSectionImages(await fetchSectionImages());
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Save failed.' });
    } finally {
      setSavingSection(false);
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

  const cancelSectionEdit = () => {
    setEditingSection(null);
    setSectionFile(null);
    setSectionForm({ label: '', image_url: '' });
  };

  const servicesImages = sectionImages.filter((img) => img.section === 'services');
  const guidesImages = sectionImages.filter((img) => img.section === 'guides');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      </div>

      <div className="flex gap-1 bg-surface-container-low p-1 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setTab('carousel')}
          className={`px-4 py-2 rounded-md font-label-sm text-label-sm transition-colors ${
            tab === 'carousel' ? 'bg-secondary text-on-secondary shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-bg'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] mr-1.5 align-middle">photo_library</span>
          Carousel
        </button>
        <button
          type="button"
          onClick={() => setTab('sections')}
          className={`px-4 py-2 rounded-md font-label-sm text-label-sm transition-colors ${
            tab === 'sections' ? 'bg-secondary text-on-secondary shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-bg'
          }`}
        >
          <span className="material-symbols-outlined text-[16px] mr-1.5 align-middle">dashboard_customize</span>
          Homepage Sections
        </button>
      </div>

      {tab === 'carousel' && (
        <>
          <div className="flex justify-end">
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
        </>
      )}

      {tab === 'sections' && (
        <>
          {loadingSections ? (
            <div className="p-10 text-center text-sm text-on-surface-variant">Loading section images…</div>
          ) : (
            <div className="space-y-8">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">home_repair_service</span>
                  LGU Public Safety Services
                </h3>
                <p className="font-body-sm text-on-surface-variant mb-4">Images displayed in the 4 service cards on the homepage.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {servicesImages.map((img) => (
                    <div key={img.id} className="bg-surface-container-lowest rounded-xl border border-border-subtle overflow-hidden">
                      <div className="h-36 overflow-hidden bg-surface-container-low">
                        <img src={img.image_url} alt={img.label} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 space-y-2">
                        <h4 className="font-label-sm text-label-sm font-medium text-on-surface truncate">{img.label}</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSection(img);
                            setSectionForm({ label: img.label, image_url: img.image_url });
                            setSectionFile(null);
                          }}
                          className="w-full py-1.5 px-3 rounded-lg border border-outline-variant text-on-surface font-label-sm text-label-sm hover:bg-surface-bg transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">menu_book</span>
                  Community Safety Guides
                </h3>
                <p className="font-body-sm text-on-surface-variant mb-4">Images displayed in the 3 guide cards on the homepage.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {guidesImages.map((img) => (
                    <div key={img.id} className="bg-surface-container-lowest rounded-xl border border-border-subtle overflow-hidden">
                      <div className="h-40 overflow-hidden bg-surface-container-low">
                        <img src={img.image_url} alt={img.label} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-3 space-y-2">
                        <h4 className="font-label-sm text-label-sm font-medium text-on-surface truncate">{img.label}</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSection(img);
                            setSectionForm({ label: img.label, image_url: img.image_url });
                            setSectionFile(null);
                          }}
                          className="w-full py-1.5 px-3 rounded-lg border border-outline-variant text-on-surface font-label-sm text-label-sm hover:bg-surface-bg transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
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
                {form.image_url && (
                  <div className="rounded-lg overflow-hidden border border-border-subtle h-36">
                    <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
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
                <div className="flex items-center gap-2">
                  <label htmlFor="gallery-image" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-lg text-sm font-medium hover:bg-secondary/20 cursor-pointer transition-colors">
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    Choose File
                  </label>
                  {imageFile && <span className="text-xs text-on-surface-variant">{imageFile.name}</span>}
                </div>
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

      {editingSection && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-surface-container-lowest z-10">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Edit Section Item</h3>
              <button type="button" onClick={cancelSectionEdit} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Section</label>
                <p className="font-label-md text-on-surface capitalize">{editingSection.section === 'services' ? 'LGU Public Safety Services' : 'Community Safety Guides'}</p>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Label *</label>
                <input
                  className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                  value={sectionForm.label}
                  onChange={(e) => setSectionForm({ ...sectionForm, label: e.target.value })}
                  placeholder="e.g. Report an Incident"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-on-surface-variant">Image</label>
                <div className="rounded-lg overflow-hidden border border-border-subtle h-36">
                  <img src={sectionForm.image_url} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  id="section-image"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setSectionFile(file);
                    if (file) {
                      setSectionForm({ ...sectionForm, image_url: URL.createObjectURL(file) });
                    }
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <label htmlFor="section-image" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-lg text-sm font-medium hover:bg-secondary/20 cursor-pointer transition-colors">
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    {sectionFile ? 'Change File' : 'Choose File'}
                  </label>
                  {sectionFile && <span className="text-xs text-on-surface-variant">{sectionFile.name}</span>}
                </div>
                {!sectionFile && (
                  <p className="text-[11px] text-on-surface-variant">Leave empty to keep the current image.</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cancelSectionEdit} className="flex-1 bg-surface-container-low border border-border-subtle text-on-surface rounded-lg py-2 text-label-md font-medium hover:bg-surface-bg transition-colors">
                  Cancel
                </button>
                <button type="button" disabled={savingSection || !sectionForm.label.trim() || (sectionForm.label === editingSection.label && !sectionFile)} onClick={() => void saveSectionImage()} className="flex-1 bg-secondary hover:bg-secondary/90 text-on-secondary rounded-lg py-2 text-label-md font-medium disabled:opacity-50 transition-colors">
                  {savingSection ? 'Saving…' : 'Save Changes'}
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
