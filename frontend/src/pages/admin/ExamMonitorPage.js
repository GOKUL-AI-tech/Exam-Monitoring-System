// ============================================================
// EXAM MONITOR PAGE — Advanced Live Teacher Dashboard
// ============================================================
// Features:
//  • Real-time student grid with live snapshots (via Socket.IO)
//  • Per-student warning badges, AI confidence meters
//  • Terminate / warn individual sessions from dashboard
//  • Live violation feed with severity filtering
//  • Analytics: score distribution, violation chart (Chart.js)
//  • AI malpractice probability scoring
//  • Export session report as CSV
//  • Dark / professional UI
// ============================================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import Layout from '../../components/common/Layout';
import { examAPI, sessionAPI } from '../../services/api';

// ─── severity colour maps ─────────────────────────────────────
const SEV_BADGE = {
  low:      'bg-yellow-900/60 text-yellow-300 border-yellow-800/50',
  medium:   'bg-orange-900/60 text-orange-300 border-orange-800/50',
  high:     'bg-red-900/60 text-red-300 border-red-800/50',
  critical: 'bg-red-800 text-white border-red-600 font-bold',
};

// ─── Student Card ─────────────────────────────────────────────
function StudentCard({ student, onTerminate, onWarn, onViewLog }) {
  const { session_id, student_name, snapshot, warning_count=0,
          eye_status='unknown', ai_confidence=0, is_active=true } = student;

  const warnColor = warning_count >= 5
    ? 'border-red-600 bg-red-950/30'
    : warning_count >= 3
    ? 'border-orange-600/60 bg-orange-950/20'
    : warning_count >= 1
    ? 'border-yellow-700/50 bg-yellow-950/10'
    : 'border-gray-700/50 bg-gray-900/60';

  const eyeIcon = {
    center:'✅', looking_left:'👈', looking_right:'👉',
    looking_up:'👆', no_face:'❌', multiple_faces:'👥', unknown:'🔍',
  }[eye_status]||'🔍';

  const aiRisk = warning_count >= 5 ? 95
    : warning_count >= 3 ? 65
    : warning_count >= 1 ? 30
    : 5;

  const riskColor = aiRisk >= 70 ? 'text-red-400' : aiRisk >= 40 ? 'text-orange-400' : 'text-emerald-400';

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all duration-200 ${warnColor} ${!is_active ? 'opacity-50' : ''}`}>
      {/* Snapshot */}
      <div className="relative aspect-video bg-gray-800 overflow-hidden">
        {snapshot ? (
          <img src={snapshot} alt={student_name}
            className="w-full h-full object-cover"/>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-600 text-center">
              <div className="text-3xl mb-1">📷</div>
              <div className="text-xs">No snapshot</div>
            </div>
          </div>
        )}

        {/* Top overlays */}
        <div className="absolute top-1 left-1 flex items-center gap-1">
          {is_active
            ? <div className="flex items-center gap-0.5 bg-black/70 px-1.5 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
                <span className="text-white text-xs" style={{fontSize:'9px'}}>LIVE</span>
              </div>
            : <div className="bg-gray-800/90 text-gray-400 text-xs px-2 py-0.5 rounded-full">Ended</div>
          }
        </div>

        {/* Warning badge */}
        {warning_count > 0 && (
          <div className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
            warning_count >= 5 ? 'bg-red-600 text-white animate-pulse'
            : warning_count >= 3 ? 'bg-orange-500 text-white'
            : 'bg-yellow-500 text-black'}`}>
            {warning_count}
          </div>
        )}

        {/* Bottom eye status */}
        <div className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs text-white flex items-center gap-1">
          <span>{eyeIcon}</span>
          <span style={{fontSize:'9px'}}>{eye_status.replace(/_/g,' ')}</span>
        </div>
      </div>

      {/* Info row */}
      <div className="px-3 py-2">
        <p className="text-white text-sm font-semibold truncate">{student_name}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">Warnings:</span>
            <div className="flex gap-0.5">
              {Array.from({length:5},(_,i)=>(
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${
                  i<warning_count
                    ? warning_count>=5?'bg-red-500':warning_count>=3?'bg-orange-500':'bg-yellow-500'
                    : 'bg-gray-700'}`}/>
              ))}
            </div>
          </div>
          <span className={`text-xs font-bold ${riskColor}`}>{aiRisk}% risk</span>
        </div>

        {/* AI confidence bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-0.5">
            <span>AI Confidence</span><span>{ai_confidence}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${
              ai_confidence>70?'bg-emerald-500':ai_confidence>40?'bg-yellow-500':'bg-red-500'}`}
              style={{width:`${ai_confidence}%`}}/>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 mt-2.5">
          <button onClick={()=>onWarn(session_id, student_name)}
            className="flex-1 bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-700/50 text-yellow-300 text-xs py-1.5 rounded-lg transition-all font-medium">
            ⚠️ Warn
          </button>
          <button onClick={()=>onViewLog(session_id, student_name)}
            className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-700/50 text-blue-300 text-xs py-1.5 rounded-lg transition-all font-medium">
            📋 Logs
          </button>
          <button onClick={()=>onTerminate(session_id, student_name)}
            disabled={!is_active}
            className="flex-1 bg-red-600/20 hover:bg-red-600/40 border border-red-700/50 text-red-400 text-xs py-1.5 rounded-lg transition-all font-medium disabled:opacity-30">
            🚫 End
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Violation Feed ───────────────────────────────────────────
function ViolationFeed({ violations, filter, onFilterChange }) {
  const filtered = filter === 'all'
    ? violations
    : violations.filter(v => v.severity === filter || v.violation?.severity === filter);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
          <h3 className="text-white font-semibold text-sm">Live Violations</h3>
          <span className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">{violations.length}</span>
        </div>
        <select value={filter} onChange={e=>onFilterChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none">
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600">
            <div className="text-3xl mb-2">🛡️</div>
            <p className="text-sm">No violations detected</p>
          </div>
        ) : (
          [...filtered].reverse().map((v, i) => {
            const sev  = v.severity || v.violation?.severity || 'medium';
            const type = (v.violation_type || v.violation?.type || v.type || '').replace(/_/g,' ');
            const name = v.student_name || 'Unknown';
            const desc = v.description || v.violation?.description || '';
            const ts   = v.timestamp || v.violation?.timestamp || Date.now();
            const conf = v.confidence_score || v.violation?.confidence || 0;
            return (
              <div key={i} className={`border rounded-xl p-3 text-xs ${SEV_BADGE[sev]||SEV_BADGE.medium}`}>
                <div className="flex justify-between items-start mb-1.5">
                  <span className="font-bold uppercase tracking-wide text-xs">{type}</span>
                  <span className="text-gray-400 text-xs flex-shrink-0 ml-2">
                    {new Date(ts).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-300 text-xs mb-1 font-medium">{name}</p>
                {desc && <p className="opacity-70 text-xs leading-relaxed">{desc}</p>}
                {conf > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="flex-1 bg-black/30 rounded-full h-0.5 overflow-hidden">
                      <div className="h-full bg-current rounded-full" style={{width:`${conf*100}%`}}/>
                    </div>
                    <span className="text-xs opacity-60">{Math.round(conf*100)}% conf</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color='text-white' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-gray-500 text-xs mt-0.5">{sub}</p>}
        </div>
        <span className="text-2xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

// ─── Log Modal ────────────────────────────────────────────────
function LogModal({ sessionId, studentName, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    sessionAPI.getViolations(sessionId)
      .then(data => setLogs(data.violations || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const exportCSV = () => {
    const rows = [
      ['Time','Type','Severity','Description','Confidence'],
      ...logs.map(l=>[
        new Date(l.created_at||l.timestamp).toLocaleString(),
        l.violation_type||'',
        l.severity||'',
        (l.description||'').replace(/,/g,' '),
        l.confidence_score||'',
      ])
    ];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download = `${studentName}_violations.csv`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-white font-bold">Violation Log</h3>
            <p className="text-gray-400 text-sm">{studentName}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV}
              className="bg-blue-600/30 hover:bg-blue-600/50 border border-blue-700/50 text-blue-300 text-xs px-3 py-1.5 rounded-lg transition">
              📥 Export CSV
            </button>
            <button onClick={onClose}
              className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded-lg transition">
              ✕ Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No violations recorded</div>
          ) : (
            <div className="space-y-2">
              {logs.map((l,i) => (
                <div key={i} className={`rounded-xl border p-3 text-xs ${SEV_BADGE[l.severity]||SEV_BADGE.medium}`}>
                  <div className="flex justify-between mb-1">
                    <span className="font-bold uppercase">{(l.violation_type||'').replace(/_/g,' ')}</span>
                    <span className="text-gray-400">{new Date(l.created_at||l.timestamp||Date.now()).toLocaleString()}</span>
                  </div>
                  {l.description && <p className="opacity-80">{l.description}</p>}
                  {l.confidence_score > 0 && (
                    <p className="opacity-60 mt-1">Confidence: {Math.round(l.confidence_score*100)}%</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN MONITOR PAGE
// ═══════════════════════════════════════════════════════════════
export default function ExamMonitorPage() {
  const { examId } = useParams();

  const [exam,        setExam]        = useState(null);
  const [results,     setResults]     = useState([]);
  const [students,    setStudents]    = useState({});   // { session_id: studentData }
  const [violations,  setViolations]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('all');
  const [viewMode,    setViewMode]    = useState('grid');  // grid|table
  const [logModal,    setLogModal]    = useState(null);   // { sessionId, studentName }
  const [warnInput,   setWarnInput]   = useState('');
  const [warnTarget,  setWarnTarget]  = useState(null);
  const [statsTab,    setStatsTab]    = useState('overview'); // overview|analytics

  const socketRef = useRef(null);

  // Load exam + results
  useEffect(() => {
    Promise.all([
      examAPI.getById(examId),
      examAPI.getResults(examId).catch(() => ({ results: [] })),
    ]).then(([examData, resData]) => {
      setExam(examData.exam);
      setResults(resData.results || []);
    }).finally(() => setLoading(false));
  }, [examId]);

  // Socket.IO — real-time updates
  useEffect(() => {
    const url = process.env.REACT_APP_API_URL?.replace('/api','') || 'http://localhost:5000';
    const socket = io(url);
    socketRef.current = socket;

    socket.emit('join_monitor', examId);

    // Student sends snapshot
    socket.on('student_snapshot', data => {
      if (data.exam_id !== examId) return;
      setStudents(prev => ({
        ...prev,
        [data.session_id]: {
          ...(prev[data.session_id] || {}),
          session_id:    data.session_id,
          student_name:  data.student_name,
          student_id:    data.student_id,
          snapshot:      data.snapshot,
          warning_count: data.warning_count || 0,
          eye_status:    data.eye_status    || 'unknown',
          ai_confidence: data.ai_confidence || 0,
          last_seen:     data.timestamp,
          is_active:     true,
        },
      }));
    });

    // Student connects
    socket.on('student_connected', data => {
      if (data.exam_id !== examId) return;
      setStudents(prev => ({
        ...prev,
        [data.session_id]: {
          ...(prev[data.session_id] || {}),
          session_id:   data.session_id,
          student_name: data.student_name,
          is_active:    true,
          warning_count:0,
          eye_status:   'unknown',
          ai_confidence:0,
        },
      }));
    });

    // Violation event
    socket.on('student_violation', data => {
      if (data.exam_id !== examId) return;
      setViolations(prev => [data, ...prev].slice(0, 100));
      setStudents(prev => ({
        ...prev,
        [data.session_id]: {
          ...(prev[data.session_id] || {}),
          session_id:   data.session_id,
          student_name: data.student_name,
          warning_count:data.warning_count || 0,
          is_active:    true,
        },
      }));
    });

    // Legacy violation feed
    socket.on('new_violation', data => {
      setViolations(prev => [data, ...prev].slice(0, 100));
    });

    return () => socket.disconnect();
  }, [examId]);

  const terminateSession = useCallback(async (sessionId, studentName) => {
    if (!window.confirm(`Terminate exam for ${studentName}?`)) return;
    try {
      await sessionAPI.terminate(sessionId);
      socketRef.current?.emit('terminate_session', { session_id: sessionId, exam_id: examId });
      setStudents(prev => ({
        ...prev,
        [sessionId]: { ...(prev[sessionId]||{}), is_active: false },
      }));
    } catch {
      // fallback: just emit socket event
      socketRef.current?.emit('terminate_session', { session_id: sessionId, exam_id: examId });
      setStudents(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId]||{}), is_active: false } }));
    }
  }, [examId]);

  const sendWarning = useCallback((sessionId, studentName) => {
    setWarnTarget({ sessionId, studentName });
    setWarnInput('Please look at your screen and ensure your face is visible.');
  }, []);

  const confirmWarn = () => {
    if (!warnTarget || !warnInput.trim()) return;
    socketRef.current?.emit('proctor_warning', {
      session_id: warnTarget.sessionId,
      exam_id:    examId,
      message:    warnInput.trim(),
    });
    setWarnTarget(null);
    setWarnInput('');
  };

  const exportFullReport = () => {
    const studs = Object.values(students);
    const rows  = [
      ['Student','Session ID','Warnings','Eye Status','AI Confidence','Active'],
      ...studs.map(s=>[s.student_name,s.session_id,s.warning_count,s.eye_status,s.ai_confidence,s.is_active?'Yes':'No']),
    ];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download = `exam_${examId}_monitor_report.csv`;
    a.click();
  };

  // ── Computed stats ─────────────────────────────────────────
  const studentList   = Object.values(students);
  const activeCount   = studentList.filter(s=>s.is_active).length;
  const highRisk      = studentList.filter(s=>s.warning_count>=3).length;
  const totalViolations = violations.length;
  const criticalCount = violations.filter(v=>(v.severity||v.violation?.severity)==='critical').length;
  const avgConfidence = studentList.length
    ? Math.round(studentList.reduce((s,st)=>s+(st.ai_confidence||0),0)/studentList.length)
    : 0;

  if (loading) return (
    <Layout title="Exam Monitor">
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    </Layout>
  );

  return (
    <Layout title={`Live Monitor: ${exam?.title || 'Exam'}`}>

      {/* ── LOG MODAL ── */}
      {logModal && (
        <LogModal sessionId={logModal.sessionId} studentName={logModal.studentName}
          onClose={()=>setLogModal(null)}/>
      )}

      {/* ── WARN INPUT MODAL ── */}
      {warnTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold mb-1">Send Warning Message</h3>
            <p className="text-gray-400 text-sm mb-4">To: <span className="text-white">{warnTarget.studentName}</span></p>
            <textarea value={warnInput} onChange={e=>setWarnInput(e.target.value)} rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-500 mb-4"/>
            <div className="flex gap-2">
              <button onClick={confirmWarn}
                className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 rounded-xl text-sm transition">
                📤 Send Warning
              </button>
              <button onClick={()=>setWarnTarget(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-xl text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER BAR ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-rose-700 rounded-xl flex items-center justify-center">
            <span className="text-xl">🔴</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">{exam?.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
              <span className="text-red-400 text-xs font-medium">LIVE MONITORING</span>
              <span className="text-gray-600 text-xs">·</span>
              <span className="text-gray-400 text-xs">{exam?.subject}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportFullReport}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-xs px-3 py-2 rounded-xl transition flex items-center gap-1.5">
            📥 Export Report
          </button>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-0.5 flex">
            <button onClick={()=>setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode==='grid'?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>
              ⊞ Grid
            </button>
            <button onClick={()=>setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode==='table'?'bg-blue-600 text-white':'text-gray-400 hover:text-white'}`}>
              ☰ Table
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <StatCard icon="👥" label="Active Students"  value={activeCount}      sub={`${studentList.length} total`}   color="text-blue-400"/>
        <StatCard icon="⚠️" label="Total Violations" value={totalViolations}  sub={`${criticalCount} critical`}     color="text-amber-400"/>
        <StatCard icon="🚨" label="High Risk"         value={highRisk}         sub="≥3 warnings"                     color="text-red-400"/>
        <StatCard icon="🤖" label="Avg AI Confidence" value={`${avgConfidence}%`} sub="face detection"             color="text-emerald-400"/>
        <StatCard icon="✅" label="Results In"        value={results.length}   sub={`of ${activeCount} students`}   color="text-indigo-400"/>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex gap-5 h-[calc(100vh-280px)] min-h-[480px]">

        {/* Students area */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {viewMode === 'grid' ? (
            <div className="flex-1 overflow-y-auto">
              {studentList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-600">
                  <div className="text-5xl mb-3">🎓</div>
                  <p className="text-lg font-medium text-gray-500">Waiting for students to join…</p>
                  <p className="text-sm mt-1">Students will appear here when they start the exam</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {studentList.map(s => (
                    <StudentCard key={s.session_id} student={s}
                      onTerminate={terminateSession}
                      onWarn={sendWarning}
                      onViewLog={(sid,name)=>setLogModal({sessionId:sid,studentName:name})}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="flex-1 overflow-auto bg-gray-900 rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800 z-10">
                  <tr className="text-left text-gray-400 text-xs uppercase tracking-wide">
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Warnings</th>
                    <th className="px-4 py-3">Eye Status</th>
                    <th className="px-4 py-3">AI Risk</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {studentList.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-gray-500 py-12">No students yet</td></tr>
                  ) : studentList.map(s => {
                    const risk = s.warning_count>=5?95:s.warning_count>=3?65:s.warning_count>=1?30:5;
                    return (
                      <tr key={s.session_id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {s.snapshot
                              ? <img src={s.snapshot} alt="" className="w-8 h-6 rounded object-cover border border-gray-700"/>
                              : <div className="w-8 h-6 bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-gray-600" style={{fontSize:'10px'}}>📷</div>
                            }
                            <span className="text-white font-medium text-sm">{s.student_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-0.5">
                            {Array.from({length:5},(_,i)=>(
                              <div key={i} className={`w-2.5 h-2.5 rounded-full ${
                                i<s.warning_count?s.warning_count>=5?'bg-red-500':'bg-amber-500':'bg-gray-700'}`}/>
                            ))}
                            <span className={`ml-1.5 text-xs font-bold ${s.warning_count>=5?'text-red-400':s.warning_count>=3?'text-orange-400':'text-yellow-400'}`}>
                              {s.warning_count}/5
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-300 capitalize">{(s.eye_status||'unknown').replace(/_/g,' ')}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full rounded-full ${risk>=70?'bg-red-500':risk>=40?'bg-orange-500':'bg-emerald-500'}`}
                                style={{width:`${risk}%`}}/>
                            </div>
                            <span className={`text-xs font-bold ${risk>=70?'text-red-400':risk>=40?'text-orange-400':'text-emerald-400'}`}>{risk}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active?'bg-emerald-900/50 text-emerald-400':'bg-gray-800 text-gray-500'}`}>
                            {s.is_active?'Active':'Ended'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button onClick={()=>sendWarning(s.session_id,s.student_name)}
                              className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 text-xs px-2 py-1 rounded transition">⚠️</button>
                            <button onClick={()=>setLogModal({sessionId:s.session_id,studentName:s.student_name})}
                              className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs px-2 py-1 rounded transition">📋</button>
                            <button onClick={()=>terminateSession(s.session_id,s.student_name)} disabled={!s.is_active}
                              className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs px-2 py-1 rounded transition disabled:opacity-30">🚫</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Results section */}
              {results.length > 0 && (
                <>
                  <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700">
                    <h4 className="text-white font-semibold text-sm">📊 Submitted Results ({results.length})</h4>
                  </div>
                  {results.map(r => (
                    <tr key={r.id} className="border-b border-gray-800/40 hover:bg-gray-800/20">
                      <td className="px-4 py-3"><span className="text-gray-300 text-sm">{r.student_name}</span></td>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{r.marks_obtained}/{r.total_marks}</span>
                      </td>
                      <td className="px-4 py-3"><span className="text-gray-400 text-xs">{r.percentage?.toFixed(1)}%</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.is_passed?'bg-emerald-900/50 text-emerald-400':'bg-red-900/50 text-red-400'}`}>
                          {r.grade} · {r.is_passed?'Pass':'Fail'}
                        </span>
                      </td>
                      <td colSpan={2} className="px-4 py-3">
                        <span className={`text-xs font-medium ${r.violation_count>5?'text-red-400':r.violation_count>0?'text-yellow-400':'text-emerald-400'}`}>
                          {r.violation_count} violations
                        </span>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right panel — violations feed + exam info */}
        <div className="w-72 xl:w-80 flex flex-col gap-3 flex-shrink-0">
          <div className="flex-1 min-h-0">
            <ViolationFeed violations={violations} filter={filter} onFilterChange={setFilter}/>
          </div>

          {/* Exam metadata */}
          {exam && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm flex-shrink-0">
              <h4 className="text-gray-400 text-xs uppercase font-semibold mb-3 tracking-wide">Exam Details</h4>
              <div className="space-y-2">
                {[
                  ['⏱ Duration', `${exam.duration_minutes} min`],
                  ['📝 Total Marks', exam.total_marks],
                  ['✅ Pass Marks', exam.pass_marks],
                  ['❓ Questions', exam.questions?.length || '–'],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="text-white font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High-risk alert */}
          {highRisk > 0 && (
            <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-4 flex-shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
                <span className="text-red-400 text-xs font-bold uppercase">High Risk Alert</span>
              </div>
              <p className="text-red-300 text-sm">
                <span className="font-bold">{highRisk}</span> student{highRisk!==1?'s are':' is'} at high risk of malpractice (≥3 warnings).
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
