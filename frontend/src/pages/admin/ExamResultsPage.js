// ============================================================
// Exam Results Page — staff / admin leaderboard view
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { examAPI } from '../../services/api';

export default function ExamResultsPage() {
  const { examId } = useParams();
  const navigate   = useNavigate();

  const [exam,    setExam]    = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort,    setSort]    = useState({ col: 'marks_obtained', dir: 'desc' });
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    Promise.all([
      examAPI.getById(examId),
      examAPI.getResults(examId),
    ]).then(([examData, resData]) => {
      setExam(examData.exam);
      setResults(resData.results || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [examId]);

  // ── Sorting ───────────────────────────────────────────────
  const sortedResults = [...results]
    .filter(r =>
      !search ||
      r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.roll_number?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sort.col] ?? 0;
      const bv = b[sort.col] ?? 0;
      return sort.dir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const toggleSort = (col) => {
    setSort(prev => ({ col, dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc' }));
  };

  // ── Stats ─────────────────────────────────────────────────
  const passed  = results.filter(r => r.is_passed).length;
  const failed  = results.length - passed;
  const avgPct  = results.length
    ? (results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length).toFixed(1)
    : 0;
  const highest = results.length ? Math.max(...results.map(r => r.marks_obtained || 0)) : 0;
  const lowest  = results.length ? Math.min(...results.map(r => r.marks_obtained || 0)) : 0;

  // ── CSV export ────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const header = ['Rank','Name','Roll No','Email','Score','Total','Percentage','Grade','Status','Violations'];
    const rows   = sortedResults.map((r, i) => [
      i + 1, r.student_name, r.roll_number || '', r.student_email || '',
      r.marks_obtained, r.total_marks,
      (r.percentage || 0).toFixed(1) + '%',
      r.grade,
      r.is_passed ? 'PASS' : 'FAIL',
      r.violation_count || 0,
    ]);
    const csv  = [header, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `results_${exam?.title?.replace(/\s+/g,'_') || examId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedResults, exam, examId]);

  // ── Grade badge colour ─────────────────────────────────────
  const gradeColor = g => ({
    'A+': 'bg-emerald-100 text-emerald-700',
    'A':  'bg-green-100 text-green-700',
    'B':  'bg-blue-100 text-blue-700',
    'C':  'bg-yellow-100 text-yellow-700',
    'D':  'bg-orange-100 text-orange-700',
    'F':  'bg-red-100 text-red-700',
  }[g] || 'bg-gray-100 text-gray-500');

  const SortArrow = ({ col }) => {
    if (sort.col !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) return (
    <Layout title="Exam Results">
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"/>
      </div>
    </Layout>
  );

  return (
    <Layout title={`Results — ${exam?.title || 'Exam'}`}>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-5 text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 transition"
      >
        ← Back
      </button>

      {/* Exam header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 mb-6 shadow-md">
        <h2 className="text-xl font-bold">{exam?.title}</h2>
        <p className="text-indigo-200 text-sm mt-1">
          {exam?.subject} &nbsp;·&nbsp; {exam?.duration_minutes} mins &nbsp;·&nbsp; Total: {exam?.total_marks} marks &nbsp;·&nbsp; Pass: {exam?.pass_marks}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Appeared', value: results.length, color: 'bg-blue-600' },
          { label: 'Passed',         value: passed,         color: 'bg-emerald-600' },
          { label: 'Failed',         value: failed,         color: 'bg-red-500' },
          { label: 'Avg Score',      value: avgPct + '%',   color: 'bg-purple-600' },
          { label: 'Highest Marks',  value: highest,        color: 'bg-orange-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`${color} text-white rounded-xl p-4 shadow text-center`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs mt-1 opacity-80">{label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search by name or roll number…"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button
          onClick={exportCSV}
          disabled={results.length === 0}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          📥 Export CSV
        </button>
        <button
          onClick={() => navigate(`/admin/monitor/${examId}`)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
        >
          📡 Live Monitor
        </button>
      </div>

      {/* Pass rate bar */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 font-medium">Pass Rate</span>
            <span className="font-bold text-gray-800">{((passed / results.length) * 100).toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-700"
              style={{ width: `${(passed / results.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1 text-gray-400">
            <span>{passed} passed</span>
            <span>{failed} failed</span>
          </div>
        </div>
      )}

      {/* Results table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {sortedResults.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-lg">{search ? 'No results match your search' : 'No results yet'}</p>
            <p className="text-sm mt-1">Results appear here after students submit the exam</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-semibold">#</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-semibold">Student</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-semibold cursor-pointer hover:text-gray-800"
                    onClick={() => toggleSort('marks_obtained')}>
                    Score <SortArrow col="marks_obtained"/>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-500 font-semibold cursor-pointer hover:text-gray-800"
                    onClick={() => toggleSort('percentage')}>
                    % <SortArrow col="percentage"/>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-500 font-semibold">Grade</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-semibold cursor-pointer hover:text-gray-800"
                    onClick={() => toggleSort('correct_answers')}>
                    Correct <SortArrow col="correct_answers"/>
                  </th>
                  <th className="px-4 py-3 text-left text-gray-500 font-semibold cursor-pointer hover:text-gray-800"
                    onClick={() => toggleSort('violation_count')}>
                    Violations <SortArrow col="violation_count"/>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r, idx) => (
                  <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${idx === 0 && sort.col === 'marks_obtained' && sort.dir === 'desc' ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3 text-gray-400 font-medium">
                      {idx === 0 && sort.col === 'marks_obtained' && sort.dir === 'desc' ? '🥇' : idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{r.student_name}</p>
                      <p className="text-xs text-gray-400">{r.roll_number || r.student_email}</p>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">
                      {r.marks_obtained}
                      <span className="text-gray-400 font-normal">/{r.total_marks}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${r.is_passed ? 'bg-emerald-500' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(r.percentage || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm">{(r.percentage || 0).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${gradeColor(r.grade)}`}>
                        {r.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.is_passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {r.is_passed ? '✓ PASS' : '✗ FAIL'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.correct_answers}/{r.total_questions}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${(r.violation_count || 0) >= 5 ? 'text-red-600' : (r.violation_count || 0) > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {r.violation_count || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        {sortedResults.length} of {results.length} result{results.length !== 1 ? 's' : ''} shown
        {search && ` — filtered by "${search}"`}
      </p>

    </Layout>
  );
}
