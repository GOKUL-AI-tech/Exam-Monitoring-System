// Main Admin Dashboard
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { userAPI, collegeAPI } from '../../services/api';

export default function MainAdminDashboard() {
  const [stats, setStats] = useState({});
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([userAPI.getDashboardStats(), collegeAPI.getAll()])
      .then(([statsData, collegeData]) => {
        setStats(statsData.stats || {});
        setColleges(collegeData.colleges || []);
      }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="Admin Dashboard"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"/></div></Layout>;

  return (
    <Layout title="Main Admin Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <StatCard icon="🏫" label="Colleges" value={stats.total_colleges || 0} color="purple" />
        <StatCard icon="👥" label="Total Users" value={stats.total_users || 0} color="blue" />
        <StatCard icon="📝" label="Total Exams" value={stats.total_exams || 0} color="green" />
        <StatCard icon="✅" label="Submissions" value={stats.total_submissions || 0} color="orange" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/admin/colleges" className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center gap-4 border border-gray-100">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">🏫</div>
          <div>
            <p className="font-semibold text-gray-800">Manage Colleges</p>
            <p className="text-sm text-gray-500">Add, edit, activate colleges</p>
          </div>
        </Link>
        <Link to="/admin/users" className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center gap-4 border border-gray-100">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">👥</div>
          <div>
            <p className="font-semibold text-gray-800">Manage Users</p>
            <p className="text-sm text-gray-500">Admins, staff, students</p>
          </div>
        </Link>
        <Link to="/staff/exams/create" className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center gap-4 border border-gray-100">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">📝</div>
          <div>
            <p className="font-semibold text-gray-800">Create Exam</p>
            <p className="text-sm text-gray-500">Set up new exam</p>
          </div>
        </Link>
      </div>

      {/* Colleges List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Registered Colleges</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-600">
                <th className="px-4 py-3 rounded-l-lg">College</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3 rounded-r-lg">Status</th>
              </tr>
            </thead>
            <tbody>
              {colleges.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.code}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email}</td>
                  <td className="px-4 py-3">{c.total_users || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {colleges.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-8">No colleges yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = { purple: 'bg-purple-600', blue: 'bg-blue-600', green: 'bg-green-600', orange: 'bg-orange-500' };
  return (
    <div className={`${colors[color]} text-white rounded-xl p-5 shadow-md`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}
