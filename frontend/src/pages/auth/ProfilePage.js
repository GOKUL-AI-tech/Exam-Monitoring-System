// ============================================================
// Profile Page — view account info & change password
// ============================================================
import React, { useState } from 'react';
import Layout from '../../components/common/Layout';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user } = useAuth();

  const [pwForm,   setPwForm]   = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving,   setSaving]   = useState(false);
  const [showPw,   setShowPw]   = useState({ current: false, new: false, confirm: false });

  const roleLabels = {
    main_admin:    'Main Administrator',
    college_admin: 'College Administrator',
    staff:         'Staff / Examiner',
    student:       'Student',
  };

  const roleColors = {
    main_admin:    'bg-purple-100 text-purple-700',
    college_admin: 'bg-blue-100 text-blue-700',
    staff:         'bg-green-100 text-green-700',
    student:       'bg-orange-100 text-orange-700',
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword({
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      toast.success('✅ Password changed successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (field) => setShowPw(p => ({ ...p, [field]: !p[field] }));

  return (
    <Layout title="My Profile">
      <div className="max-w-2xl space-y-6">

        {/* ── Account Info ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Account Information</h2>

          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{user?.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user?.role] || 'bg-gray-100 text-gray-500'}`}>
                {roleLabels[user?.role] || user?.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: '📧 Email',      value: user?.email },
              { label: '🏫 College',    value: user?.college_name || '—' },
              { label: '🏛 Department', value: user?.department   || '—' },
              { label: '🎓 Roll No.',   value: user?.roll_number  || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="font-medium text-gray-700 break-all">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Change Password ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-5">Change Password</h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { field: 'current', label: 'Current Password', key: 'current_password' },
              { field: 'new',     label: 'New Password',     key: 'new_password'     },
              { field: 'confirm', label: 'Confirm New Password', key: 'confirm_password' },
            ].map(({ field, label, key }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <div className="relative">
                  <input
                    type={showPw[field] ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-10 transition"
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                  <button
                    type="button"
                    onClick={() => toggle(field)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPw[field] ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
            ))}

            {/* Password strength hint */}
            {pwForm.new_password && (
              <div className={`text-xs px-3 py-2 rounded-lg ${
                pwForm.new_password.length >= 8 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
              }`}>
                {pwForm.new_password.length >= 8
                  ? '✅ Password length looks good'
                  : `⚠️ Password is short (${pwForm.new_password.length}/8 min chars)`}
              </div>
            )}

            {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
              <p className="text-xs text-red-500">⚠️ Passwords do not match</p>
            )}

            <button
              type="submit"
              disabled={saving || !pwForm.current_password || !pwForm.new_password || pwForm.new_password !== pwForm.confirm_password}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition shadow-md text-sm"
            >
              {saving ? 'Changing…' : '🔐 Change Password'}
            </button>
          </form>
        </div>

        {/* ── Security Tips ────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-sm text-blue-800">
          <p className="font-bold mb-2">🔒 Security Tips</p>
          <ul className="space-y-1 list-disc list-inside text-blue-700">
            <li>Use at least 8 characters with a mix of letters and numbers</li>
            <li>Never share your password with anyone</li>
            <li>Log out after each session on shared computers</li>
            <li>Change your password regularly</li>
          </ul>
        </div>

      </div>
    </Layout>
  );
}
