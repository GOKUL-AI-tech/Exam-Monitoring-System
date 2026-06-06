// College Admin Dashboard
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { userAPI, examAPI } from '../../services/api';

export default function CollegeAdminDashboard() {
  const [stats, setStats] = useState({});
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([userAPI.getDashboardStats(), examAPI.getAll()])
      .then(([s, e]) => { setStats(s.stats || {}); setExams(e.exams || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout title="College Admin Dashboard"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/></div></Layout>;

  return (
    <Layout title="College Admin Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        <StatCard icon="👥" label="Total Users" value={stats.total_users || 0} color="blue" />
        <StatCard icon="📝" label="Total Exams" value={stats.total_exams || 0} color="green" />
        <StatCard icon="✅" label="Submissions" value={stats.total_submissions || 0} color="orange" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link to="/admin/users" className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">👥</div>
          <div><p className="font-semibold">Manage Users</p><p className="text-sm text-gray-500">Students & Staff</p></div>
        </Link>
        <Link to="/staff/exams/create" className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">📝</div>
          <div><p className="font-semibold">Create Exam</p><p className="text-sm text-gray-500">Set up new exam</p></div>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-gray-800 mb-4">Recent Exams</h2>
        {exams.slice(0, 5).map(exam => (
          <div key={exam.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
            <div>
              <p className="font-medium text-gray-800">{exam.title}</p>
              <p className="text-sm text-gray-500">{exam.subject}</p>
            </div>
            <span className={`px-2 py-0.5 text-xs rounded-full ${exam.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {exam.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
        ))}
        {exams.length === 0 && <p className="text-center text-gray-400 py-6">No exams yet</p>}
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = { blue: 'bg-blue-600', green: 'bg-green-600', orange: 'bg-orange-500' };
  return (
    <div className={`${colors[color]} text-white rounded-xl p-5 shadow-md`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
}
