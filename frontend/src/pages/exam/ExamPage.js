// ============================================================
// EXAM PAGE — Advanced AI-Powered Proctored Exam Interface
// ============================================================
// Features:
//  • 5-warning max with modal overlays & auto-termination
//  • Client-side face detection via face-api.js (CDN)
//  • Eye-gaze direction tracking with canvas overlay
//  • Multiple-face & no-face detection
//  • Full anti-cheat suite: copy/paste, context-menu, tab-switch,
//    fullscreen, keyboard shortcuts, DevTools, PrintScreen
//  • Real-time snapshots sent to teacher dashboard (Socket.IO)
//  • Auto-save answers to localStorage (offline-safe)
//  • Randomised question order per student
//  • Countdown timer with urgency states
//  • Dark professional UI
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Webcam from '../../components/common/SafeWebcam';
import { examAPI, sessionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const MAX_WARNINGS        = 5;
const SNAPSHOT_INTERVAL   = 10_000;
const FACE_DETECT_INTERVAL= 2_000;
const FACE_API_CDN     = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
const LOCAL_MODEL_URL  = `${process.env.PUBLIC_URL || ''}/weights`;
const CDN_MODEL_URL    = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function ExamTimer({ totalSeconds, onTimeUp }) {
  const [rem, setRem] = useState(totalSeconds);
  useEffect(() => {
    if (rem <= 0) { onTimeUp(); return; }
    const t = setInterval(() => setRem(r => r - 1), 1000);
    return () => clearInterval(t);
  }, [rem, onTimeUp]);
  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem % 3600) / 60);
  const s = rem % 60;
  const pad = n => String(n).padStart(2, '0');
  const pct = (rem / totalSeconds) * 100;
  const level = rem < 60 ? 'crit' : rem < 300 ? 'warn' : 'ok';
  return (
    <div className={`flex flex-col items-center px-4 py-1.5 rounded-xl border ${
      level==='crit'?'text-red-400 border-red-800 bg-red-950/50 animate-pulse':
      level==='warn'?'text-yellow-400 border-yellow-800 bg-yellow-950/40':
      'text-emerald-400 border-gray-700 bg-gray-900'}`}>
      <span className="font-mono text-xl font-bold tracking-widest leading-none">
        {h > 0 && `${pad(h)}:`}{pad(m)}:{pad(s)}
      </span>
      <div className="w-20 h-0.5 bg-gray-700 rounded-full mt-1 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${
          level==='crit'?'bg-red-500':level==='warn'?'bg-yellow-500':'bg-emerald-500'}`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-500 mt-0.5" style={{fontSize:'9px',letterSpacing:'0.08em'}}>TIME LEFT</span>
    </div>
  );
}

function WarningModal({ violation, warningCount, onDismiss }) {
  const [cd, setCd] = useState(8);
  const isFinal = warningCount >= MAX_WARNINGS;
  useEffect(() => {
    if (isFinal) return;
    const t = setInterval(() => setCd(c => { if (c <= 1) { clearInterval(t); onDismiss(); return 0; } return c-1; }), 1000);
    return () => clearInterval(t);
  }, [isFinal, onDismiss]);
  const remaining = MAX_WARNINGS - warningCount;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/92 backdrop-blur-sm">
      <div className={`max-w-md w-full mx-4 rounded-2xl p-8 border-2 text-center shadow-2xl ${
        isFinal?'border-red-600 bg-gradient-to-b from-red-950/90 to-black':'border-amber-500 bg-gradient-to-b from-amber-950/80 to-gray-950'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${isFinal?'bg-red-600':'bg-amber-500'}`}>
          <span className="text-4xl">{isFinal?'🚫':'⚠️'}</span>
        </div>
        <h2 className={`text-2xl font-bold mb-2 ${isFinal?'text-red-400':'text-amber-400'}`}>
          {isFinal?'Exam Terminated':`Warning ${warningCount} of ${MAX_WARNINGS}`}
        </h2>
        <p className="text-gray-300 text-sm mb-3 leading-relaxed">{violation.description}</p>
        {!isFinal && (
          <p className="text-amber-300 text-sm font-medium mb-4">
            ⚠️ {remaining} warning{remaining!==1?'s':''} remaining before automatic termination
          </p>
        )}
        {isFinal && (
          <p className="text-red-300 text-sm mb-4">
            Maximum warnings exceeded. Your exam has been terminated and all activity recorded.
          </p>
        )}
        <div className="text-xs text-gray-500 flex items-center justify-center gap-1.5 mb-5">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"/>
          This violation has been reported to your invigilator
        </div>
        {!isFinal && (
          <>
            <div className="w-full bg-gray-800 rounded-full h-1 mb-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-1000 ${warningCount>=4?'bg-red-500':'bg-amber-500'}`}
                style={{width:`${(cd/8)*100}%`}}/>
            </div>
            <button onClick={onDismiss}
              className={`w-full font-bold py-2.5 rounded-xl transition text-sm ${
                warningCount>=4?'bg-red-600 hover:bg-red-500 text-white':'bg-amber-500 hover:bg-amber-400 text-black'}`}>
              I Understand — Continue ({cd}s)
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TerminationScreen({ reason }) {
  const [cd, setCd] = useState(6);
  useEffect(() => { const t = setInterval(()=>setCd(c=>Math.max(0,c-1)),1000); return ()=>clearInterval(t); },[]);
  return (
    <div className="fixed inset-0 z-[99999] bg-black flex items-center justify-center">
      <div className="text-center px-8 max-w-lg">
        <div className="w-28 h-28 bg-red-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_80px_rgba(220,38,38,0.4)]">
          <span className="text-6xl">🚫</span>
        </div>
        <h1 className="text-4xl font-extrabold text-red-500 mb-3">Exam Terminated</h1>
        <p className="text-gray-400 mb-2">Your exam session has been automatically terminated.</p>
        <p className="text-gray-600 text-sm">{reason||'Maximum proctoring warnings exceeded.'}</p>
        <div className="mt-10 flex items-center justify-center gap-2 text-gray-700 text-sm">
          <div className="w-2 h-2 bg-gray-700 rounded-full animate-pulse"/>
          Redirecting in {cd}s…
        </div>
      </div>
    </div>
  );
}

function EyeStatusBadge({ status }) {
  const cfg = {
    center:         {cls:'bg-emerald-700/80 text-emerald-100',          icon:'👁️',  label:'Focused'},
    looking_left:   {cls:'bg-amber-700/80 text-amber-100 animate-pulse', icon:'👈',  label:'Looking Left'},
    looking_right:  {cls:'bg-amber-700/80 text-amber-100 animate-pulse', icon:'👉',  label:'Looking Right'},
    looking_up:     {cls:'bg-amber-700/80 text-amber-100 animate-pulse', icon:'👆',  label:'Looking Up'},
    looking_down:   {cls:'bg-amber-700/80 text-amber-100 animate-pulse', icon:'👇',  label:'Looking Down'},
    no_face:        {cls:'bg-red-700/80 text-red-100 animate-pulse',     icon:'❌',  label:'No Face'},
    multiple_faces: {cls:'bg-red-700/80 text-red-100 animate-pulse',     icon:'👥',  label:'Multiple Faces'},
    unknown:        {cls:'bg-gray-700/80 text-gray-300',                 icon:'🔍',  label:'Scanning…'},
  };
  const c = cfg[status]||cfg.unknown;
  return (
    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${c.cls}`}>
      <span>{c.icon}</span><span>{c.label}</span>
    </div>
  );
}

function WarningPips({ count }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-1">
        {Array.from({length:MAX_WARNINGS},(_,i)=>(
          <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${
            i<count?(count>=MAX_WARNINGS?'bg-red-600 animate-pulse':count>=3?'bg-orange-500':'bg-amber-400'):'bg-gray-700'}`}/>
        ))}
      </div>
      <span className="text-gray-500" style={{fontSize:'9px',letterSpacing:'0.08em'}}>WARNINGS</span>
    </div>
  );
}

export default function ExamPage() {
  const { examId } = useParams();
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [exam,         setExam]         = useState(null);
  const [session,      setSession]      = useState(null);
  const [questions,    setQuestions]    = useState([]);
  const [answers,      setAnswers]      = useState({});
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [phase,        setPhase]        = useState('verify');

  const [warningCount,     setWarningCount]     = useState(0);
  const [allWarnings,      setAllWarnings]      = useState([]);
  const [activeWarning,    setActiveWarning]    = useState(null);
  const [showWarnModal,    setShowWarnModal]    = useState(false);
  const [eyeStatus,        setEyeStatus]        = useState('unknown');
  const [faceCount,        setFaceCount]        = useState(0);
  const [aiConfidence,     setAiConfidence]     = useState(0);
  const [webcamError,      setWebcamError]      = useState(false);
  const [aiReady,          setAiReady]          = useState(false);
  const [aiLoading,        setAiLoading]        = useState(false);
  const [networkStatus,    setNetworkStatus]    = useState('online');
  const [termReason,       setTermReason]       = useState('');

  const webcamRef        = useRef(null);
  const canvasRef        = useRef(null);
  const socketRef        = useRef(null);
  const faceIntRef       = useRef(null);
  const snapIntRef       = useRef(null);
  const saveIntRef       = useRef(null);
  const vCooldown        = useRef({});
  const isTerminating    = useRef(false);
  const startGrace       = useRef(false);   // true for first 4s — suppresses false-positive violations
  const warnCountRef     = useRef(0);
  const answersRef       = useRef({});
  const sessionRef       = useRef(null);
  const lookAwaySeq      = useRef(0);
  const lookViolCount    = useRef(0);

  answersRef.current  = answers;
  sessionRef.current  = session;
  warnCountRef.current= warningCount;

  // Load face-api — tries local models first (fast), falls back to CDN
  useEffect(() => {
    setAiLoading(true);
    const loadModels = async (url) => {
      await Promise.all([
        window.faceapi.nets.tinyFaceDetector.loadFromUri(url),
        window.faceapi.nets.faceLandmark68TinyNet.loadFromUri(url),
      ]);
    };
    loadScript(FACE_API_CDN).then(async () => {
      try {
        await loadModels(LOCAL_MODEL_URL);   // fast — served from public/weights/
        setAiReady(true);
      } catch {
        try {
          await loadModels(CDN_MODEL_URL);   // fallback — CDN (slower)
          setAiReady(true);
        } catch {}                           // models failed entirely — face detection disabled
      }
    }).catch(()=>{}).finally(()=>setAiLoading(false));
  },[]);

  // Socket.IO
  useEffect(() => {
    const url = process.env.REACT_APP_API_URL?.replace('/api','') || 'http://localhost:5000';
    const socket = io(url);
    socketRef.current = socket;
    socket.on('terminate_session', d => {
      if (d.session_id === sessionRef.current?.id) triggerTermination('Exam terminated by invigilator');
    });
    socket.on('proctor_warning', d => {
      if (d.session_id === sessionRef.current?.id) toast(`📢 ${d.message}`,{icon:'⚠️',duration:6000});
    });
    return () => socket.disconnect();
  },[]); // eslint-disable-line

  // Network
  useEffect(() => {
    const up   = () => { setNetworkStatus('online');  toast.success('Connection restored'); };
    const down = () => { setNetworkStatus('offline'); toast.error('⚠️ Network lost. Answers saved locally.'); };
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online',up); window.removeEventListener('offline',down); };
  },[]);

  // Load exam
  useEffect(() => {
    examAPI.getById(examId)
      .then(data => {
        setExam(data.exam);
        setQuestions(shuffleArray(data.exam?.questions||[]));
      })
      .catch(() => toast.error('Failed to load exam'))
      .finally(() => setLoading(false));
  },[examId]);

  const triggerTermination = useCallback((reason='') => {
    if (isTerminating.current) return;
    isTerminating.current = true;
    setTermReason(reason);
    setPhase('terminated');
    setShowWarnModal(false);
    clearInterval(faceIntRef.current);
    clearInterval(snapIntRef.current);
    clearInterval(saveIntRef.current);
    const sess = sessionRef.current;
    if (sess) sessionAPI.submit(sess.id,{auto_submit:true,terminated:true,reason}).catch(()=>{});
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
    setTimeout(() => navigate('/dashboard'), 6000);
  },[navigate]);

  const handleViolation = useCallback((type, description, severity='medium', confidence=0.8) => {
    if (isTerminating.current) return;
    if (startGrace.current) return;   // ignore events fired during exam startup transition
    const now = Date.now();
    if ((now-(vCooldown.current[type]||0)) < 2500) return;
    vCooldown.current[type] = now;

    const v = { type, description, severity, confidence, timestamp: new Date().toISOString() };
    setAllWarnings(prev=>[...prev, v]);

    setWarningCount(prev => {
      const next = prev + 1;
      warnCountRef.current = next;
      const sess = sessionRef.current;
      if (sess) {
        sessionAPI.logViolation(sess.id,{violation_type:type,severity,description,confidence_score:confidence}).catch(()=>{});
        socketRef.current?.emit('student_violation',{
          session_id:sess.id, exam_id:examId,
          student_name: user?.name||user?.email||'Student',
          violation: v, warning_count: next,
        });
      }
      setActiveWarning({...v, warningCount: next});
      setShowWarnModal(true);
      if (next >= MAX_WARNINGS) setTimeout(()=>triggerTermination('Maximum proctoring violations exceeded'),4000);
      return next;
    });
  },[examId, user, triggerTermination]);

  const startSession = async () => {
    try {
      const data = await sessionAPI.start({ exam_id: examId });
      setSession(data.session);
      sessionRef.current = data.session;
      if (data.resumed) {
        const saved = await sessionAPI.getAnswers(data.session.id);
        const map   = {};
        (saved.answers||[]).forEach(a=>{ map[a.question_id]=a.selected_option; });
        const local = JSON.parse(localStorage.getItem(`ems_ans_${data.session.id}`)||'{}');
        setAnswers({...local,...map});
        toast.success('Resuming exam…');
      }
      // Suppress violations for 4 s while fullscreen kicks in and socket connects
      startGrace.current = true;
      setTimeout(() => { startGrace.current = false; }, 4000);
      setPhase('exam');
      socketRef.current?.emit('join_session', data.session.id);
      socketRef.current?.emit('student_connected',{
        session_id:data.session.id, exam_id:examId,
        student_name: user?.name||user?.email,
      });
    } catch { toast.error('Failed to start exam session'); }
  };

  // Anti-cheat
  useEffect(() => {
    if (phase !== 'exam') return;
    const block = e => { e.preventDefault(); handleViolation('copy_paste','Copy/paste attempted','high',0.99); };
    document.addEventListener('copy',        block);
    document.addEventListener('paste',       block);
    document.addEventListener('cut',         block);
    document.addEventListener('selectstart', e=>e.preventDefault());
    document.addEventListener('contextmenu', e=>e.preventDefault());
    document.addEventListener('dragstart',   e=>e.preventDefault());

    const onKey = e => {
      const ctrl = e.ctrlKey||e.metaKey;
      const key  = e.key.toLowerCase();
      const fk   = ['F12','F11','F5','F7','F8'];
      const ctrlB= ctrl && ['c','v','x','a','u','p','s','f','r','i','j','k','e','g'].includes(key);
      const csB  = ctrl && e.shiftKey && ['i','j','c'].includes(key);
      if (ctrlB||csB||fk.includes(e.key)||e.key==='PrintScreen'||e.key==='Tab') {
        e.preventDefault();
        if (e.key==='PrintScreen') handleViolation('screenshot_attempt','Screenshot key pressed','critical',1.0);
        else if (e.key==='F12'||csB||(ctrl&&['i','j','u'].includes(key))) handleViolation('devtools_attempt','DevTools shortcut detected','high',0.95);
        else if (ctrlB) handleViolation('keyboard_shortcut',`Blocked: ${ctrl?'Ctrl+':''}${e.key}`,'medium',0.99);
      }
    };
    document.addEventListener('keydown', onKey);

    let blurCD = false;
    const onHide = () => {
      if (document.hidden && !blurCD) {
        blurCD = true;
        handleViolation('tab_switch','Switched tab or minimised window','high',0.99);
        setTimeout(()=>{ blurCD=false; },4000);
      }
    };
    const onBlur = () => {
      if (!blurCD) {
        blurCD = true;
        handleViolation('window_focus_loss','Exam window lost focus','medium',0.95);
        setTimeout(()=>{ blurCD=false; },4000);
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onBlur);

    const dtCheck = setInterval(()=>{
      if (window.outerWidth-window.innerWidth>160||window.outerHeight-window.innerHeight>160)
        handleViolation('devtools_open','Developer tools appear to be open','high',0.8);
    },5000);

    return () => {
      document.removeEventListener('copy',block);
      document.removeEventListener('paste',block);
      document.removeEventListener('cut',block);
      document.removeEventListener('selectstart',()=>{});
      document.removeEventListener('contextmenu',()=>{});
      document.removeEventListener('dragstart',()=>{});
      document.removeEventListener('keydown',onKey);
      document.removeEventListener('visibilitychange',onHide);
      window.removeEventListener('blur',onBlur);
      clearInterval(dtCheck);
    };
  },[phase, handleViolation]);

  // Fullscreen
  useEffect(() => {
    if (phase!=='exam') return;
    const enter = () => {
      try {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen().catch(()=>{});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } catch {}
    };
    enter();
    const onChange = () => {
      if (!document.fullscreenElement && phase==='exam' && !isTerminating.current) {
        handleViolation('fullscreen_exit','Exited fullscreen mode','high',0.99);
        setTimeout(enter,1500);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
    };
  },[phase, handleViolation]);

  // Face detection loop
  useEffect(() => {
    if (phase!=='exam'||!aiReady||webcamError) return;
    const detect = async () => {
      if (isTerminating.current||!webcamRef.current) return;
      try {
        const video = webcamRef.current.video;
        if (!video||video.readyState<3) return;
        const dets = await window.faceapi
          .detectAllFaces(video, new window.faceapi.TinyFaceDetectorOptions({scoreThreshold:0.4}))
          .withFaceLandmarks(true);
        const count = dets.length;
        setFaceCount(count);
        if (count===0) {
          setEyeStatus('no_face');
          lookAwaySeq.current += 1;
          if (lookAwaySeq.current >= 3) {
            handleViolation('face_not_detected','No face detected — student may have left','high',0.92);
            lookAwaySeq.current = 0;   // reset so it re-arms after another 6 s absence
          }
        } else if (count>1) {
          setEyeStatus('multiple_faces');
          lookAwaySeq.current = 0;
          handleViolation('multiple_faces',`${count} faces detected — possible assistance`,'critical',0.95);
        } else {
          lookAwaySeq.current = 0;
          const det   = dets[0];
          const score = Math.round(det.detection.score*100);
          setAiConfidence(score);
          const lm    = det.landmarks;
          const lE    = lm.getLeftEye();
          const rE    = lm.getRightEye();
          const nose  = lm.getNose();
          const box   = det.detection.box;
          const jaw   = lm.getJawOutline();        // 17 points; jaw[8] = chin tip
          const eCX   = (lE.reduce((s,p)=>s+p.x,0)/lE.length + rE.reduce((s,p)=>s+p.x,0)/rE.length)/2;
          const eCY   = (lE.reduce((s,p)=>s+p.y,0)/lE.length + rE.reduce((s,p)=>s+p.y,0)/rE.length)/2;
          const nt    = nose[3];                   // nose tip (landmark 30)
          const chin  = jaw[8];                    // chin bottom
          // Normalise by FACE size (not video size) — works at any camera distance
          const dev      = (nt.x - eCX) / (box.width  || 1);
          const noseDev  = (nt.y - eCY) / (box.height || 1);
          // Chin-to-eye vertical ratio: large = chin down (head tilted down)
          // small = chin raised (head tilted up toward ceiling)
          const chinDev  = (chin.y - eCY) / (box.height || 1);
          let gaze = 'center';
          if      (dev < -0.12)     gaze = 'looking_right';
          else if (dev >  0.12)     gaze = 'looking_left';
          else if (noseDev < 0.10)  gaze = 'looking_up';     // nose near eye-level → chin dropped toward cam
          else if (chinDev < 0.35)  gaze = 'looking_down';   // chin unusually high → head tilted down/away
          setEyeStatus(gaze);
          if (gaze !== 'center') {
            lookViolCount.current += 1;
            // Fire after 3 consecutive look-aways (3 × 2 s = 6 s of sustained gaze-off)
            if (lookViolCount.current >= 3) {
              handleViolation('eye_movement_suspicious',
                `Gaze away from screen — ${gaze.replace('looking_','')}`, 'medium', det.detection.score);
              lookViolCount.current = 0; // reset so next 6 s can fire again
            }
          } else {
            lookViolCount.current = 0;
          }

          if (canvasRef.current) {
            const vW = video.videoWidth||640;
            const vH = video.videoHeight||480;
            const canvas = canvasRef.current;
            canvas.width = vW; canvas.height = vH;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0,0,vW,vH);
            ctx.strokeStyle = gaze==='center'?'#10b981':'#f59e0b';
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x,box.y,box.width,box.height);
            ctx.fillStyle = gaze==='center'?'#10b981':'#f59e0b';
            ctx.font = `bold ${Math.max(10,vW*0.018)}px monospace`;
            ctx.fillText(gaze.toUpperCase().replace(/_/g,' '), box.x+2, box.y-5);
            ctx.beginPath();
            ctx.arc(box.x+box.width-6,box.y+6,4,0,Math.PI*2);
            ctx.fillStyle = score>70?'#10b981':'#f59e0b';
            ctx.fill();
          }
        }
      } catch {}
    };
    faceIntRef.current = setInterval(detect, FACE_DETECT_INTERVAL);
    return () => clearInterval(faceIntRef.current);
  },[phase,aiReady,webcamError,handleViolation]);

  // Snapshot sender
  useEffect(() => {
    if (phase!=='exam'||webcamError||!session) return;
    const send = () => {
      if (!webcamRef.current||isTerminating.current) return;
      try {
        const shot = webcamRef.current.getScreenshot({width:320,height:240});
        if (!shot) return;
        socketRef.current?.emit('student_snapshot',{
          session_id:   session.id,
          exam_id:      examId,
          student_name: user?.name||user?.email||'Student',
          student_id:   user?.id,
          snapshot:     shot,
          warning_count:warnCountRef.current,
          eye_status:   eyeStatus,
          ai_confidence:aiConfidence,
          timestamp:    Date.now(),
        });
      } catch {}
    };
    snapIntRef.current = setInterval(send, SNAPSHOT_INTERVAL);
    return () => clearInterval(snapIntRef.current);
  },[phase,session,webcamError,examId,user,eyeStatus,aiConfidence]);

  // Auto-save
  useEffect(() => {
    if (phase!=='exam'||!session) return;
    saveIntRef.current = setInterval(()=>{
      localStorage.setItem(`ems_ans_${session.id}`,JSON.stringify(answersRef.current));
    },20_000);
    return () => clearInterval(saveIntRef.current);
  },[phase,session]);

  useEffect(() => {
    if (!session) return;
    const raw = localStorage.getItem(`ems_ans_${session.id}`);
    if (raw) { try { setAnswers(prev=>({...JSON.parse(raw),...prev})); } catch {} }
  },[session]);

  const selectAnswer = useCallback(async (qId, opt) => {
    setAnswers(prev => {
      const next = {...prev,[qId]:opt};
      answersRef.current = next;
      if (sessionRef.current) localStorage.setItem(`ems_ans_${sessionRef.current.id}`,JSON.stringify(next));
      return next;
    });
    if (session) sessionAPI.saveAnswer(session.id,{question_id:qId,selected_option:opt}).catch(()=>{});
  },[session]);

  const submitExam = useCallback(async (auto=false) => {
    if (submitting||isTerminating.current) return;
    if (!auto && !window.confirm('Submit exam? This cannot be undone.')) return;
    setSubmitting(true);
    try {
      const result = await sessionAPI.submit(session.id,{auto_submit:auto});
      localStorage.removeItem(`ems_ans_${session.id}`);
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
      navigate(`/exam/result/${session.id}`,{state:{result:result.result,exam}});
    } catch {
      toast.error('Submission failed — please try again');
      setSubmitting(false);
    }
  },[session,submitting,navigate,exam]);

  // ── RENDER ─────────────────────────────────────────────
  if (phase==='terminated') return <TerminationScreen reason={termReason}/>;

  if (phase==='verify') return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700/60 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-3xl">🎓</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Secure Exam Portal</h2>
        <p className="text-gray-400 text-sm mb-6">AI-powered identity verification before you begin</p>

        {!webcamError ? (
          <div className="relative inline-block mb-6">
            <div className="w-60 h-44 rounded-xl overflow-hidden border-2 border-blue-500 mx-auto">
              <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg"
                className="w-full h-full object-cover" onUserMediaError={()=>setWebcamError(true)}/>
            </div>
            <div className="absolute inset-0 border-2 border-blue-400/50 rounded-xl pointer-events-none animate-pulse"/>
            <div className="absolute -top-2 -right-2 flex items-center gap-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"/>LIVE
            </div>
            {aiLoading && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-700/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin"/>
                Loading AI models…
              </div>
            )}
            {aiReady && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-emerald-700/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-white rounded-full"/>AI Proctoring Ready
              </div>
            )}
          </div>
        ) : (
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">⚠️ Camera unavailable. Monitoring will be limited.</p>
          </div>
        )}

        <div className="text-left space-y-2 mb-6 mt-6">
          {[
            ['🤖',`AI monitors your face & eye movement every 2 seconds`],
            ['⚠️',`You get ${MAX_WARNINGS} warnings — exceed them and the exam is terminated`],
            ['🚫','Copying, tab switching & shortcuts are completely blocked'],
            ['📡','Live snapshots sent to your invigilator every 10 seconds'],
            ['🔒','Fullscreen mode is enforced throughout the exam'],
            ['💾','Answers auto-saved locally in case of network issues'],
          ].map(([icon,text])=>(
            <div key={text} className="flex items-start gap-2.5 text-sm text-gray-400">
              <span className="flex-shrink-0">{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        <button onClick={()=>{ if (!loading) startSession(); }} disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 shadow-lg text-sm">
          {loading?'Loading Exam…':'Accept Terms & Enter Exam'}
        </button>
      </div>
    </div>
  );

  if (loading||!exam) return (
    <div className="fixed inset-0 bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-gray-400 text-sm">Initialising secure exam environment…</p>
      </div>
    </div>
  );

  const currentQ    = questions[currentIdx];
  const answeredCnt = Object.keys(answers).length;

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col overflow-hidden" style={{userSelect:'none'}}>

      {showWarnModal && activeWarning && (
        <WarningModal violation={activeWarning} warningCount={activeWarning.warningCount}
          onDismiss={()=>setShowWarnModal(false)}/>
      )}

      {/* TOP BAR */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-base">🎓</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-semibold text-sm leading-tight truncate">{exam.title}</h1>
            <p className="text-gray-500 text-xs truncate">{exam.subject} · {questions.length} Questions · {exam.total_marks} Marks</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 mx-4 flex-shrink-0">
          <EyeStatusBadge status={eyeStatus}/>
          {aiReady
            ? <div className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 rounded-full text-xs text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>
                AI Active{aiConfidence>0&&` · ${aiConfidence}%`}
              </div>
            : <div className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 rounded-full text-xs text-gray-500">
                <span className="w-1.5 h-1.5 bg-gray-600 rounded-full"/>AI Loading…
              </div>
          }
          {networkStatus==='offline' && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-red-950/50 border border-red-900/50 rounded-full text-xs text-red-400">
              ⚡ Offline — saving locally
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {!webcamError && (
            <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0">
              <Webcam ref={webcamRef} audio={true} screenshotFormat="image/jpeg"
                className="w-full h-full object-cover" onUserMediaError={()=>setWebcamError(true)}/>
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{pointerEvents:'none'}}/>
              <div className="absolute top-0.5 left-1 flex items-center gap-0.5 bg-black/60 px-1 py-0.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
                <span className="text-white" style={{fontSize:'7px'}}>REC</span>
              </div>
              {faceCount===0 && <div className="absolute inset-0 border-2 border-red-500 rounded-lg animate-pulse"/>}
              {faceCount>1  && <div className="absolute inset-0 border-2 border-orange-500 rounded-lg animate-pulse"/>}
            </div>
          )}

          <WarningPips count={warningCount}/>

          {session && (
            <ExamTimer totalSeconds={exam.duration_minutes*60} onTimeUp={()=>submitExam(true)}/>
          )}

          <button onClick={()=>submitExam(false)} disabled={submitting}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow">
            {submitting?'Submitting…':'Submit Exam'}
          </button>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-52 bg-gray-900/80 border-r border-gray-800 overflow-y-auto p-3 flex-shrink-0">
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">Answered</span>
              <span className="text-white font-semibold">{answeredCnt}<span className="text-gray-600">/{questions.length}</span></span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-300"
                style={{width:`${questions.length?(answeredCnt/questions.length)*100:0}%`}}/>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 mb-4">
            {questions.map((q,idx)=>(
              <button key={q.id} onClick={()=>setCurrentIdx(idx)} title={`Q${idx+1}`}
                className={`aspect-square rounded text-xs font-bold transition-all duration-150 ${
                  idx===currentIdx?'bg-blue-600 text-white ring-1 ring-blue-400 scale-105':
                  answers[q.id]?'bg-emerald-700/70 text-emerald-100':
                  'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'}`}>
                {idx+1}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-800 pt-3">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded"/><span>Current</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-700 rounded"/><span>Answered</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-800 border border-gray-700 rounded"/><span>Unanswered</span></div>
          </div>

          {allWarnings.length>0 && (
            <div className="mt-4 border-t border-gray-800 pt-3">
              <p className="text-xs text-amber-400 font-semibold mb-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"/>Recent Alerts
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {[...allWarnings].reverse().slice(0,5).map((w,i)=>(
                  <div key={i} className="bg-gray-800/60 rounded-lg p-2">
                    <p className="text-amber-300 text-xs font-medium capitalize leading-tight">{w.type.replace(/_/g,' ')}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{new Date(w.timestamp).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Question area */}
        <main className="flex-1 overflow-y-auto bg-gray-950 p-5">
          {currentQ ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">

                <div className="bg-gray-800/50 px-6 py-3 flex items-center justify-between border-b border-gray-700/60">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 text-sm font-semibold">Q{currentIdx+1}</span>
                    <span className="text-gray-600 text-sm">of {questions.length}</span>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-800 px-2.5 py-1 rounded-full">
                    {currentQ.marks||1} mark{(currentQ.marks||1)!==1?'s':''}
                  </span>
                </div>

                <div className="p-6">
                  <p className="text-white text-base leading-relaxed font-medium mb-5">{currentQ.question_text}</p>
                  {currentQ.question_image_url && (
                    <img src={currentQ.question_image_url} alt="Q"
                      className="max-h-52 object-contain mb-5 rounded-xl border border-gray-700 mx-auto block"/>
                  )}
                  <div className="space-y-2.5">
                    {['A','B','C','D'].map(opt => {
                      const text     = currentQ[`option_${opt.toLowerCase()}`];
                      if (!text) return null;
                      const selected = answers[currentQ.id]===opt;
                      return (
                        <button key={opt} onClick={()=>selectAnswer(currentQ.id,opt)}
                          className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-150 ${
                            selected?'border-blue-500 bg-blue-600/15 text-white shadow-sm':
                            'border-gray-700/60 bg-gray-800/30 text-gray-300 hover:border-blue-600/50 hover:bg-gray-800/60 hover:text-white'}`}>
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                            selected?'bg-blue-600 text-white':'bg-gray-700 text-gray-400'}`}>{opt}</span>
                          <span className="text-sm leading-relaxed flex-1">{text}</span>
                          {selected && <span className="text-blue-400 ml-auto">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-800/60 flex items-center justify-between">
                  <button onClick={()=>setCurrentIdx(i=>Math.max(0,i-1))} disabled={currentIdx===0}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-all">
                    ← Previous
                  </button>
                  {answers[currentQ.id] && (
                    <button onClick={()=>{
                        setAnswers(prev=>{const n={...prev};delete n[currentQ.id];answersRef.current=n;return n;});
                        sessionAPI.saveAnswer(session?.id,{question_id:currentQ.id,selected_option:null}).catch(()=>{});
                      }} className="text-xs text-red-500 hover:text-red-400 transition-colors">
                      ✕ Clear Answer
                    </button>
                  )}
                  <button onClick={()=>setCurrentIdx(i=>Math.min(questions.length-1,i+1))} disabled={currentIdx===questions.length-1}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-all">
                    Next →
                  </button>
                </div>
              </div>

              {currentIdx>=questions.length-3 && (
                <div className="mt-4 flex justify-center">
                  <button onClick={()=>submitExam(false)} disabled={submitting}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-8 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all disabled:opacity-50">
                    {submitting?'Submitting…':`🎯 Submit Exam (${answeredCnt}/${questions.length} answered)`}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">No questions available</div>
          )}
        </main>
      </div>
    </div>
  );
}
