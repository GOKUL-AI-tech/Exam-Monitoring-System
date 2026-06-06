// Manage Colleges Page — Main Admin
import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { collegeAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ManageCollegesPage() {
  const [colleges, setColleges] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', code: '', email: '', phone: '', address: '' });

  useEffect(() => {
    collegeAPI.getAll().then(d => setColleges(d.colleges || [])).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = await collegeAPI.create(form);
      setColleges(prev => [data.college, ...prev]);
      setForm({ name: '', code: '', email: '', phone: '', address: '' });
      setShowForm(false);
      toast.success('College created!');
    } catch {}
  };

  const handleToggle = async (college) => {
    try {
      await collegeAPI.update(college.id, { ...college, is_active: !college.is_active });
      setColleges(prev => prev.map(c => c.id === college.id ? { ...c, is_active: !c.is_active } : c));
    } catch {}
  };

  if (loading) return <Layout title="Manage Colleges"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"/></div></Layout>;

  return (
    <Layout title="Manage Colleges">
      <div className="flex justify-end mb-6">
        <button onClick={() => setShowForm(!showForm)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
          {showForm ? '✕ Cancel' : '+ Add College'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">Register New College</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'College Name', field: 'name', required: true },
              { label: 'College Code', field: 'code', required: true },
              { label: 'Email', field: 'email', type: 'email', required: true },
              { label: 'Phone', field: 'phone' },
            ].map(f => (
              <div key={f.field}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input type={f.type || 'text'} value={form[f.field]} onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                  required={f.required} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
              <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none" rows={2} />
            </div>
          </div>
          <button type="submit" className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition">
            Register College
          </button>
        </form>
      )}

      <div className="grid gap-4">
        {colleges.map(c => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800">{c.name}</h3>
              <p className="text-sm text-gray-500">{c.code} · {c.email} · {c.total_users || 0} users</p>
              {c.address && <p className="text-xs text-gray-400 mt-1">{c.address}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {c.is_active ? 'Active' : 'Inactive'}
              </span>
              <button onClick={() => handleToggle(c)} className={`${c.is_active ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'} px-3 py-1.5 rounded-lg text-sm transition`}>
                {c.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
        {colleges.length === 0 && <div className="bg-white rounded-xl p-12 text-center text-gray-400">No colleges registered yet</div>}
      </div>
    </Layout>
  );
}
