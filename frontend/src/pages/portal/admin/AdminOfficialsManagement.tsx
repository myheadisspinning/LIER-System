import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { logAudit } from '../../../lib/admin';

type Official = {
  id: string;
  fullname: string;
  title: string;
  committee: string | null;
  icon: string | null;
  term: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  facebook: string | null;
  office_hours: string | null;
  visible: boolean;
  sort_order: number;
};

const EMPTY: Omit<Official, 'id'> = {
  fullname: '',
  title: 'Kagawad',
  committee: '',
  icon: 'person',
  term: '2023 - 2026',
  phone: '',
  email: '',
  photo_url: null,
  facebook: '',
  office_hours: '',
  visible: true,
  sort_order: 10,
};

export default function AdminOfficialsManagement() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Official | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Official | null>(null);

  const fetchAll = async () => {
    const res = await supabase.from('officials').select('*').order('sort_order').order('fullname');
    return (res.data ?? []) as Official[];
  };

  useEffect(() => {
    void (async () => {
      setOfficials(await fetchAll());
      setLoading(false);
    })();
  }, []);

  const startCreate = () => {
    setForm({ ...EMPTY, sort_order: officials.length + 1 });
    setPhotoFile(null);
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (o: Official) => {
    setForm({ ...o });
    setPhotoFile(null);
    setEditing(o);
    setCreating(false);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return form.photo_url;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('You must be signed in.');
    const path = `officials/${crypto.randomUUID()}-${photoFile.name.replace(/[^\w.-]+/g, '_')}`;
    const { error } = await supabase.storage.from('officials').upload(path, photoFile, { cacheControl: '3600', contentType: photoFile.type || 'image/jpeg' });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    const { data } = supabase.storage.from('officials').getPublicUrl(path);
    return data.publicUrl;
  };

  const save = async () => {
    if (!form.fullname.trim() || !form.title.trim()) return;
    setSaving(true);
    try {
      const photo_url = await uploadPhoto();
      const payload = { ...form, fullname: form.fullname.trim(), photo_url };
      if (editing) {
        const { error } = await supabase.from('officials').update(payload).eq('id', editing.id);
        if (error) throw new Error(error.message);
        await logAudit('Update official', `Updated official "${payload.fullname}".`);
      } else {
        const { error } = await supabase.from('officials').insert(payload);
        if (error) throw new Error(error.message);
        await logAudit('Add official', `Added official "${payload.fullname}".`);
      }
      setToast({ type: 'success', message: `Saved ${payload.fullname}.` });
      setCreating(false);
      setEditing(null);
      setOfficials(await fetchAll());
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleVisible = async (o: Official) => {
    const { error } = await supabase.from('officials').update({ visible: !o.visible }).eq('id', o.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Update official', `${o.visible ? 'Hidden' : 'Shown'} official "${o.fullname}" on the public page.`);
      setOfficials(await fetchAll());
    }
  };

  const remove = async (o: Official) => {
    const { error } = await supabase.from('officials').delete().eq('id', o.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Remove official', `Removed official "${o.fullname}".`);
      setOfficials(await fetchAll());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Officials Management</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage the barangay officials displayed on the public website.</p>
        </div>
        <button type="button" onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-lg text-label-md font-medium hover:bg-secondary/90 transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add New Official
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-on-surface-variant">Loading officials…</div>
      ) : officials.length === 0 ? (
        <div className="p-12 text-center text-sm text-on-surface-variant bg-surface-container-lowest border border-border-subtle rounded-xl">No officials yet. Add the barangay leadership.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {officials.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
              <div className="h-32 bg-slate-100 relative">
                {o.photo_url ? (
                  <img src={o.photo_url} alt={o.fullname} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[40px]">person</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button type="button" onClick={() => toggleVisible(o)} className={`px-2 py-1 rounded-md text-[11px] font-bold ${o.visible ? 'bg-success-green text-white' : 'bg-slate-500 text-white'}`}>
                    {o.visible ? 'VISIBLE' : 'HIDDEN'}
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{o.fullname}</h3>
                <p className="text-sm text-secondary font-semibold">{o.title}</p>
                <p className="text-xs text-on-surface-variant mt-1">{o.term ?? '—'}</p>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border-subtle">
                  <button type="button" onClick={() => startEdit(o)} className="text-secondary hover:underline text-sm font-medium">Edit</button>
                  <button type="button" onClick={() => setConfirmDelete(o)} className="text-error-red hover:underline text-sm font-medium">Remove</button>
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
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{editing ? `Edit: ${editing.fullname}` : 'Add New Official'}</h3>
              <button type="button" onClick={() => { setCreating(false); setEditing(null); }} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Full Name</label>
                  <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} placeholder="Hon. Juan Dela Cruz" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Title</label>
                  <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Barangay Captain / Kagawad" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Committee</label>
                  <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.committee ?? ''} onChange={(e) => setForm({ ...form, committee: e.target.value })} placeholder="Peace and Order" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Icon</label>
                  <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.icon ?? ''} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="security, school, medical_services…" />
                  <p className="text-[11px] text-on-surface-variant mt-1">Material Symbol name (e.g. security, construction, school)</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Term</label>
                  <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.term ?? ''} onChange={(e) => setForm({ ...form, term: e.target.value })} placeholder="2023 - 2026" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Sort Order</label>
                  <input type="number" className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Phone</label>
                <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+63 917 123 4567" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Email</label>
                <input type="email" className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="official@culiat.gov.ph" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Office Hours</label>
                <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.office_hours ?? ''} onChange={(e) => setForm({ ...form, office_hours: e.target.value })} placeholder="Mon-Fri: 8:00 AM - 5:00 PM" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Facebook Profile</label>
                <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.facebook ?? ''} onChange={(e) => setForm({ ...form, facebook: e.target.value })} placeholder="https://facebook.com/..." />
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-on-surface-variant">Photo</label>
                {(photoFile || form.photo_url) && (
                  <div className="rounded-lg overflow-hidden border border-border-subtle h-36">
                    <img src={photoFile ? URL.createObjectURL(photoFile) : form.photo_url!} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  id="official-photo"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <label htmlFor="official-photo" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-lg text-sm font-medium hover:bg-secondary/20 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-[18px]">upload</span>
                  Choose File
                </label>
                {photoFile && <span className="text-xs text-on-surface-variant ml-2">{photoFile.name}</span>}
                {editing && !photoFile && <p className="text-[11px] text-on-surface-variant">Current photo set. Choose a file to replace it.</p>}
              </div>
              <label className="flex items-center gap-2 text-sm text-on-surface">
                <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} className="w-4 h-4 text-secondary rounded" />
                Visible on public website
              </label>
              <button type="button" disabled={saving || !form.fullname.trim() || !form.title.trim()} onClick={save} className="w-full bg-secondary text-on-secondary rounded-lg py-2 text-label-md font-medium hover:bg-secondary/90 disabled:opacity-50 transition-colors">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
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
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Remove Official</h3>
                <p className="text-body-sm text-on-surface-variant">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-1">Are you sure you want to remove this official from the public website?</p>
            <p className="text-body-sm text-on-surface font-semibold mb-6">{confirmDelete.fullname} — {confirmDelete.title}</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-border-subtle rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors">
                Cancel
              </button>
              <button type="button" onClick={async () => { await remove(confirmDelete); setConfirmDelete(null); }} className="px-4 py-2 bg-error-red text-white rounded-lg text-sm font-medium hover:bg-error-red/90 transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-8 right-8 bg-surface-container-high text-on-surface px-4 py-3 rounded-lg shadow-lg text-sm z-[150]">{toast.message}</div>}
    </div>
  );
}
