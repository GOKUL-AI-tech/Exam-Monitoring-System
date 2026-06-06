// Login Page — role-based authentication with demo credentials
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { role: 'Main Admin',     email: 'admin@examproctoring.com',      password: 'Admin@123', color: 'purple' },
  { role: 'College Admin',  email: 'collegeadmin@democollege.edu',   password: 'Demo@123',  color: 'blue'   },
  { role: 'Staff',          email: 'staff@democollege.edu',          password: 'Demo@123',  color: 'green'  },
  { role: 'Student',        email: 'student@democollege.edu',        password: 'Demo@123',  color: 'orange' },
];

const ROLE_COLORS = {
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  green:  'bg-green-100 text-green-700 border-green-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
};

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome, ${user.name}!`);
      const routes = {
        main_admin:    '/admin/dashboard',
        college_admin: '/college/dashboard',
        staff:         '/staff/dashboard',
        student:       '/student/dashboard',
      };
      navigate(routes[user.role] || '/dashboard');
    } catch {
      // Error shown by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  // One-click fill from demo card
  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex flex-col lg:flex-row gap-6">

        {/* ── Left: Login Form ── */}
        <div className="bg-white rounded-2xl shadow-2xl w-full lg:w-96 p-8 flex-shrink-0">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">ExamProctor AI</h1>
            <p className="text-gray-500 text-sm mt-1">Secure Online Exam Platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"/>
                  Signing in...
                </>
              ) : '🔐 Sign In'}
            </button>
          </form>
        </div>

        {/* ── Right: Demo Accounts ── */}
        <div className="flex-1">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-1">🧪 Demo Accounts</h2>
            <p className="text-blue-200 text-sm mb-4">Click any card to auto-fill the login form</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  onClick={() => fillDemo(acc)}
                  className={`text-left p-4 rounded-xl border-2 bg-white transition hover:scale-105 hover:shadow-lg cursor-pointer ${
                    email === acc.email ? 'ring-2 ring-white shadow-lg scale-105' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${ROLE_COLORS[acc.color]}`}>
                      {acc.role}
                    </span>
                    {email === acc.email && <span className="text-green-500 text-xs">✓ Selected</span>}
                  </div>
                  <p className="text-gray-800 text-sm font-medium truncate">{acc.email}</p>
                  <p className="text-gray-400 text-xs mt-0.5">Password: {acc.password}</p>
                </button>
              ))}
            </div>

            {/* Student note */}
            <div className="mt-4 bg-orange-500/20 border border-orange-400/30 rounded-xl p-4">
              <p className="text-orange-100 text-sm font-semibold mb-1">🎓 For Student AI Testing:</p>
              <ol className="text-orange-200 text-xs space-y-1 list-decimal list-inside">
                <li>Click the <strong className="text-white">Student</strong> card above</li>
                <li>Click <strong className="text-white">Sign In</strong></li>
                <li>A <strong className="text-white">live exam is waiting</strong> on the dashboard</li>
                <li>Click <strong className="text-white">Start Exam</strong> — webcam + AI proctoring activates</li>
                <li>Answer questions — tab switches &amp; face detection are monitored</li>
              </ol>
            </div>

            <p className="text-blue-300 text-xs mt-4 text-center">
              Run <code className="bg-white/10 px-1 rounded">database/seed_demo.sql</code> first to load demo data
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
