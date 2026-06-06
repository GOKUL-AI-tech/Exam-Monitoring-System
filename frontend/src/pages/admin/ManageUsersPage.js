// Manage Users Page — Admin & College Admin
import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { userAPI, authAPI, collegeAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ManageUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const isStaff = user.role === 'staff';
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', department: '', phone: '', roll_number: '', college_id: '' });

  useEffect(() => {
    // Staff only fetches students; others fetch all
    const params = isStaff ? { role: 'student' } : {};
    Promise.all([
      userAPI.getAll(params),
      user.role === 'main_admin' ? collegeAPI.getAll() : Promise.resolve({ colleges: [] })
    ]).then(([userData, collegeData]) => {
      setUsers(userData.users || []);
      setColleges(collegeData.colleges || []);
    }).finally(() => setLoading(false));
  }, [user.role, isStaff]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await authAPI.register(form);
      toast.success('User created successfully');
      setShowForm(false);
      // Refresh
      const data = await userAPI.getAll();
      setUsers(data.users || []);
    } catch {}
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await userAPI.delete(id);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: false } : u));
      toast.success('User deactivated');
    } catch {}
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase()) ||
    u.role.includes(filter.toLowerCase())
  );

  const allowedRoles = user.role === 'main_admin'
    ? ['college_admin', 'staff', 'student']
    : user.role === 'college_admin'
    ? ['staff', 'student']
    : ['student']; // staff can only add students

  if (loading) return <Layout title="Manage Users"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/></div></Layout>;

  return (
    <Layout title={isStaff ? 'Manage Students' : 'Manage Users'}>
      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="🔍 Search by name, email, role..."
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-72"
        />
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          {showForm ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-4">Create New User</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Full Name', field: 'name', required: true },
              { label: 'Email', field: 'email', type: 'email', required: true },
              { label: 'Password', field: 'password', type: 'password', required: true },
              { label: 'Phone', field: 'phone' },
              { label: 'Department', field: 'department' },
              { label: 'Roll Number (students)', field: 'roll_number' },
            ].map(f => (
              <div key={f.field}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={form[f.field]}
                  onChange={e => setForm(prev => ({ ...prev, [f.field]: e.target.value }))}
                  required={f.required}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}

            {!isStaff && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {allowedRoles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
            )}

            {user.role === 'main_admin' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">College</label>
                <select value={form.college_id} onChange={e => setForm(prev => ({ ...prev, college_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select college...</option>
                  {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <button type="submit" className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition">
            Create User
          </button>
        </form>
      )}

      {/* Users table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'main_admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'college_admin' ? 'bg-blue-100 text-blue-700' :
                      u.role === 'staff' ? 'bg-green-100 text-green-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>{u.role.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.department || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active && u.role !== 'main_admin' && (
                      <button onClick={() => handleDeactivate(u.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-10">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
