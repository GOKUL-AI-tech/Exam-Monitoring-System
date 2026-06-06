// Student Dashboard — shows enrolled exams, results, violations
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { examAPI, userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      examAPI.getAll(),
      userAPI.getResults(user.id),
    ]).then(([examData, resultData]) => {
      setExams(examData.exams || []);
      setResults(resultData.results || []);
    }).finally(() => setLoading(false));
  }, [user.id]);

  const now = new Date();
  const upcomingExams = exams.filter(e => new Date(e.start_time) > now);
  const activeExams = exams.filter(e => new Date(e.start_time) <= now && new Date(e.end_time) >= now);
  const completedExamIds = results.map(r => r.exam_id);

  const getExamStatus = (exam) => {
    if (completedExamIds.includes(exam.id)) return { label: 'Completed', color: 'bg-green-100 text-green-700' };
    if (new Date(exam.start_time) <= now && new Date(exam.end_time) >= now) return { label: 'Active', color: 'bg-blue-100 text-blue-700' };
    if (new Date(exam.start_time) > now) return { label: 'Upcoming', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Expired', color: 'bg-gray-100 text-gray-500' };
  };

  if (loading) return <Layout title="Student Dashboard"><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"/></div></Layout>;

  return (
    <Layout title="Student Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard icon="📋" label="Total Exams" value={exams.length} color="blue" />
        <StatCard icon="✅" label="Completed" value={results.length} color="green" />
        <StatCard icon="⚡" label="Active Now" value={activeExams.length} color="orange" />
      </div>

      {/* Active Exams Banner */}
      {activeExams.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <h2 className="font-bold text-green-800 mb-3">🟢 Exams Active Right Now</h2>
          {activeExams.map(exam => (
            !completedExamIds.includes(exam.id) && (
              <div key={exam.id} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                <div>
                  <p className="font-semibold text-gray-800">{exam.title}</p>
                  <p className="text-sm text-gray-500">{exam.subject} · {exam.duration_minutes} mins</p>
                </div>
                <button
                  onClick={() => navigate(`/exam/${exam.id}`)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Start Exam →
                </button>
              </div>
            )
          ))}
        </div>
      )}

      {/* All Exams */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">All Enrolled Exams</h2>
        {exams.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No exams enrolled yet.</p>
        ) : (
          <div className="space-y-3">
            {exams.map(exam => {
              const status = getExamStatus(exam);
              return (
                <div key={exam.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div>
                    <p className="font-semibold text-gray-800">{exam.title}</p>
                    <p className="text-sm text-gray-500">{exam.subject} · {exam.duration_minutes} mins · {exam.total_marks} marks</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(exam.start_time).toLocaleString()} — {new Date(exam.end_time).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                    {status.label === 'Active' && (
                      <button
                        onClick={() => navigate(`/exam/${exam.id}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">My Results</h2>
        {results.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No results yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2 rounded-l-lg">Exam</th>
                  <th className="px-4 py-2">Score</th>
                  <th className="px-4 py-2">Percentage</th>
                  <th className="px-4 py-2">Grade</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 rounded-r-lg">Violations</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.exam_title}</td>
                    <td className="px-4 py-3">{r.marks_obtained}/{r.total_marks}</td>
                    <td className="px-4 py-3">{r.percentage?.toFixed(1)}%</td>
                    <td className="px-4 py-3 font-bold">{r.grade}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${r.is_passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.is_passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${r.violation_count > 5 ? 'text-red-600' : r.violation_count > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {r.violation_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = { blue: 'from-blue-500 to-blue-600', green: 'from-green-500 to-green-600', orange: 'from-orange-400 to-orange-500' };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} text-white rounded-xl p-6 shadow-md`}>
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-80 mt-1">{label}</div>
    </div>
  );
}
