// Staff Dashboard — create exams, manage questions, enroll students, publish
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { examAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function StaffDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollModal, setEnrollModal] = useState(null); // exam object
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadExams();
    // Load students for enroll modal
    userAPI.getAll({ role: 'student' })
      .then(d => setStudents(d.users || []))
      .catch(() => {});
  }, []);

  const loadExams = () => {
    setLoading(true);
    examAPI.getAll()
      .then(data => setExams(data.exams || []))
      .finally(() => setLoading(false));
  };

  // Toggle publish/unpublish
  const togglePublish = async (exam) => {
    try {
      await examAPI.update(exam.id, { ...exam, is_published: !exam.is_published });
      setExams(prev => prev.map(e => e.id === exam.id ? { ...e, is_published: !e.is_published } : e));
      toast.success(exam.is_published ? 'Exam unpublished' : '✅ Exam published! Students can now see it.');
    } catch {}
  };

  // Delete exam
  const deleteExam = async (id) => {
    if (!window.confirm('Delete this exam permanently?')) return;
    try {
      await examAPI.delete(id);
      setExams(prev => prev.filter(e => e.id !== id));
      toast.success('Exam deleted');
    } catch {}
  };

  // Enroll selected students
  const handleEnroll = async () => {
    if (!enrollModal || selectedStudents.length === 0) {
      toast.error('Select at least one student');
      return;
    }
    try {
      await examAPI.enroll(enrollModal.id, { student_ids: selectedStudents });
      toast.success(`✅ ${selectedStudents.length} student(s) enrolled!`);
      setEnrollModal(null);
      setSelectedStudents([]);
    } catch {}
  };

  const toggleStudent = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedStudents(students.map(s => s.id));
  };

  const getStatus = (exam) => {
    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);
    if (!exam.is_published) return { label: 'Draft', color: 'bg-gray-100 text-gray-500' };
    if (start > now) return { label: 'Upcoming', color: 'bg-yellow-100 text-yellow-700' };
    if (start <= now && end >= now) return { label: '🟢 Active', color: 'bg-green-100 text-green-700' };
    return { label: 'Ended', color: 'bg-red-100 text-red-500' };
  };

  if (loading) return (
    <Layout title="Staff Dashboard">
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"/>
      </div>
    </Layout>
  );

  return (
    <Layout title="Staff Dashboard">

      {/* How-to banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <p className="font-bold mb-1">📋 How to run an exam:</p>
        <div className="flex flex-wrap gap-4">
          {['1. Create Exam →', '2. Add Questions (inside Create Exam)', '3. Enroll Students →', '4. Publish →', '5. Students can now attend!'].map((s, i) => (
            <span key={i} className="bg-blue-100 px-3 py-1 rounded-full">{s}</span>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-700">Your Exams ({exams.length})</h2>
        <button
          onClick={() => navigate('/staff/exams/create')}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          + Create New Exam
        </button>
      </div>

      {exams.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-500 text-lg mb-2">No exams yet</p>
          <p className="text-gray-400 text-sm mb-6">Create your first exam to get started</p>
          <button
            onClick={() => navigate('/staff/exams/create')}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-medium"
          >
            + Create Exam
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map(exam => {
            const status = getStatus(exam);
            return (
              <div key={exam.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col md:flex-row md:items-start gap-4">

                  {/* Exam info */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-800 text-lg">{exam.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-1">
                      📚 {exam.subject} &nbsp;·&nbsp; ⏱ {exam.duration_minutes} mins &nbsp;·&nbsp; 🏆 {exam.total_marks} marks &nbsp;·&nbsp; ✅ Pass: {exam.pass_marks}
                      &nbsp;·&nbsp; ❓ {exam.question_count ?? 0} Qs &nbsp;·&nbsp; 👥 {exam.enrolled_count ?? 0} enrolled
                    </p>
                    <p className="text-xs text-gray-400">
                      Start: {new Date(exam.start_time).toLocaleString()} &nbsp;→&nbsp; End: {new Date(exam.end_time).toLocaleString()}
                    </p>
                    {exam.proctoring_enabled && (
                      <span className="inline-block mt-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">🤖 AI Proctoring ON</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">

                    {/* STEP 3: Enroll Students */}
                    <button
                      onClick={() => { setEnrollModal(exam); setSelectedStudents([]); }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1"
                    >
                      👥 Enroll Students
                    </button>

                    {/* STEP 4: Publish / Unpublish */}
                    <button
                      onClick={() => togglePublish(exam)}
                      className={`${exam.is_published
                        ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
                        : 'bg-green-50 hover:bg-green-100 text-green-700'
                      } px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1`}
                    >
                      {exam.is_published ? '⬇ Unpublish' : '🚀 Publish'}
                    </button>

                    {/* Monitor */}
                    <button
                      onClick={() => navigate(`/admin/monitor/${exam.id}`)}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1"
                    >
                      📡 Monitor
                    </button>

                    {/* Results */}
                    <button
                      onClick={() => navigate(`/admin/exams/${exam.id}/results`)}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg text-sm font-medium transition"
                    >
                      📊 Results
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteExam(exam.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-sm font-medium transition"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Enroll Students Modal ─────────────────────────── */}
      {enrollModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Enroll Students</h3>
              <p className="text-sm text-gray-500 mt-1">Exam: <strong>{enrollModal.title}</strong></p>
            </div>

            <div className="p-6">
              {students.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>No students found.</p>
                  <p className="text-sm mt-1">Add students from the Users page first.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm text-gray-600">{selectedStudents.length} of {students.length} selected</p>
                    <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">Select All</button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-100 rounded-xl p-2">
                    {students.map(s => (
                      <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${selectedStudents.includes(s.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <div>
                          <p className="font-medium text-sm text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.email} {s.roll_number ? `· ${s.roll_number}` : ''}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => { setEnrollModal(null); setSelectedStudents([]); }}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEnroll}
                disabled={selectedStudents.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-xl transition font-medium"
              >
                Enroll {selectedStudents.length > 0 ? `${selectedStudents.length} Student(s)` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
