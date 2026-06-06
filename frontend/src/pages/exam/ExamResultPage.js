// Exam Result Page — shown after submission
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ExamResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const result = state?.result;
  const exam = state?.exam;

  // Exit fullscreen & remove any lingering overlays when result page loads
  useEffect(() => {
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
    // Remove CRA dev error overlay if present
    setTimeout(() => {
      document.querySelectorAll('body > div').forEach(div => {
        if ((div.style.zIndex > 9000 || div.style.position === 'fixed') &&
            div.textContent?.includes('Permissions')) {
          div.remove();
        }
      });
    }, 100);
  }, []);

  if (!result) {
    navigate('/student/dashboard');
    return null;
  }

  const gradeColors = {
    'A+': 'text-green-600', 'A': 'text-green-500', 'B': 'text-blue-600',
    'C': 'text-yellow-600', 'D': 'text-orange-500', 'F': 'text-red-600'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8">
        {/* Result header */}
        <div className="text-center mb-8">
          <div className={`text-7xl font-black mb-2 ${gradeColors[result.grade] || 'text-gray-600'}`}>
            {result.grade}
          </div>
          <div className={`text-2xl font-bold ${result.is_passed ? 'text-green-600' : 'text-red-600'}`}>
            {result.is_passed ? '🎉 Congratulations! You Passed!' : '😔 Better Luck Next Time'}
          </div>
          <p className="text-gray-500 mt-2">{exam?.title}</p>
        </div>

        {/* Score circle */}
        <div className="flex justify-center mb-8">
          <div className="relative w-36 h-36">
            <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E5E7EB" strokeWidth="2"/>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={result.is_passed ? '#10B981' : '#EF4444'}
                strokeWidth="2"
                strokeDasharray={`${result.percentage}, 100`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-gray-800">{result.percentage?.toFixed(1)}%</span>
              <span className="text-xs text-gray-500">Score</span>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatBox label="Marks Obtained" value={`${result.marks_obtained}/${result.total_marks}`} color="blue" />
          <StatBox label="Correct Answers" value={`${result.correct_answers}/${result.total_questions}`} color="green" />
          <StatBox label="Wrong Answers" value={result.wrong_answers} color="red" />
          <StatBox label="Violations" value={result.violation_count} color={result.violation_count > 5 ? 'red' : 'gray'} />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  const colors = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700', gray: 'bg-gray-50 text-gray-700' };
  return (
    <div className={`${colors[color]} rounded-xl p-4 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1">{label}</div>
    </div>
  );
}
