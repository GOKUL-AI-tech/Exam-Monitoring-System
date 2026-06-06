// ============================================================
// CREATE EXAM PAGE — Step-by-step exam creation
// ============================================================
// Step 1: Exam details
// Step 2: Questions  (two modes)
//    A) Upload  — drag-drop .docx or .pdf → parse preview → edit → import
//    B) Manual  — add questions one by one
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { examAPI } from '../../services/api';
import API from '../../services/api';
import toast from 'react-hot-toast';

const BLANK_Q = {
  question_text: '', option_a: '', option_b: '',
  option_c: '', option_d: '', correct_option: 'A',
  marks: 1, difficulty: 'medium',
};

const DIFF_COLOR = { easy: 'text-emerald-600 bg-emerald-50', medium: 'text-amber-600 bg-amber-50', hard: 'text-red-600 bg-red-50' };

// ─── Small reusable field ────────────────────────────────────
function Field({ label, value, onChange, type='text', placeholder, required, className='' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
    </div>
  );
}

// ─── Step indicator ──────────────────────────────────────────
function StepBar({ step }) {
  const steps = [{ n:1, label:'Exam Details' }, { n:2, label:'Add Questions' }, { n:3, label:'Done' }];
  return (
    <div className="flex items-center gap-1 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            step > s.n  ? 'bg-emerald-100 text-emerald-700'
            : step === s.n ? 'bg-blue-600 text-white shadow-md'
            : 'bg-gray-100 text-gray-400'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              step > s.n  ? 'bg-emerald-500 text-white'
              : step === s.n ? 'bg-white text-blue-600'
              : 'bg-gray-300 text-gray-500'}`}>
              {step > s.n ? '✓' : s.n}
            </span>
            {s.label}
          </div>
          {i < steps.length-1 && (
            <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all ${step > s.n ? 'bg-emerald-400' : 'bg-gray-200'}`}/>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Upload Zone ─────────────────────────────────────────────
function UploadZone({ onFilePicked, uploading }) {
  const inputRef  = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFilePicked(file);
  }, [onFilePicked]);

  const handleDragOver = useCallback(e => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave= useCallback(() => setDragOver(false), []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 select-none ${
        uploading ? 'border-blue-400 bg-blue-50 cursor-default'
        : dragOver  ? 'border-blue-500 bg-blue-50 scale-[1.01]'
        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}>
      <input ref={inputRef} type="file"
        accept=".docx,.pdf,.xlsx,.xls,.csv"
        className="hidden"
        onChange={e => { if (e.target.files[0]) onFilePicked(e.target.files[0]); }} />

      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
          <p className="text-blue-600 font-semibold">Parsing questions from file…</p>
          <p className="text-gray-400 text-sm">This may take a moment for large PDFs</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
            <span className="text-4xl">📄</span>
          </div>
          <div>
            <p className="text-gray-700 font-semibold text-base">Drop your question file here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {[
              { ext:'PDF', color:'bg-red-100 text-red-700',   icon:'📕' },
              { ext:'DOCX', color:'bg-blue-100 text-blue-700', icon:'📘' },
              { ext:'XLSX', color:'bg-emerald-100 text-emerald-700', icon:'📗' },
              { ext:'CSV',  color:'bg-amber-100 text-amber-700',     icon:'📋' },
            ].map(f=>(
              <span key={f.ext} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${f.color}`}>
                {f.icon} {f.ext}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Max 20 MB</p>
        </div>
      )}
    </div>
  );
}

// ─── Editable Preview Row ────────────────────────────────────
function PreviewRow({ q, idx, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      !q.question_text || !q.option_a || !q.option_b
        ? 'border-red-300 bg-red-50/30'
        : 'border-gray-200 bg-white'}`}>

      {/* Collapsed header */}
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer" onClick={()=>setExpanded(v=>!v)}>
        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
          {idx+1}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${!q.question_text ? 'text-red-400 italic' : 'text-gray-800'}`}>
            {q.question_text || '⚠ Empty question text — click to edit'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">Correct: <strong className="text-emerald-600">{q.correct_option}</strong></span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">{q.marks} mark{q.marks!==1?'s':''}</span>
            <span className="text-gray-300">·</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFF_COLOR[q.difficulty]||DIFF_COLOR.medium}`}>{q.difficulty}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={e=>{e.stopPropagation();onRemove();}}
            className="text-red-400 hover:text-red-600 text-xs px-2 py-1 hover:bg-red-50 rounded transition">
            ✕
          </button>
          <span className="text-gray-400 text-xs">{expanded?'▲':'▼'}</span>
        </div>
      </div>

      {/* Expanded edit panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/60">
          <div className="pt-3 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Question Text</label>
              <textarea rows={2} value={q.question_text}
                onChange={e=>onChange('question_text',e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {['A','B','C','D'].map(opt=>(
                <div key={opt}>
                  <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-1">
                    <input type="radio" name={`correct_${idx}`} value={opt}
                      checked={q.correct_option===opt}
                      onChange={()=>onChange('correct_option',opt)}
                      className="accent-emerald-600"/>
                    Option {opt}
                    {q.correct_option===opt && <span className="text-emerald-600 font-bold">✓ Correct</span>}
                  </label>
                  <input value={q[`option_${opt.toLowerCase()}`]}
                    onChange={e=>onChange(`option_${opt.toLowerCase()}`,e.target.value)}
                    placeholder={`Option ${opt}…`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="w-24">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Marks</label>
                <input type="number" min={1} value={q.marks}
                  onChange={e=>onChange('marks',parseInt(e.target.value)||1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Difficulty</label>
                <select value={q.difficulty} onChange={e=>onChange('difficulty',e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Format guide modal ──────────────────────────────────────
function FormatGuide({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="font-bold text-gray-800 text-lg">📄 File Format Guide</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-gray-700">

          {/* Word / PDF format */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs">DOCX / PDF</span>
              Word & PDF Format
            </h4>
            <p className="text-gray-500 mb-3">Number each question and label options A–D. Add an "Answer:" line for the correct option.</p>
            <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs leading-relaxed">
              <pre>{`1. What does CPU stand for?
A. Central Processing Unit
B. Computer Personal Unit
C. Central Program Unit
D. Core Processing Utility
Answer: A
Marks: 1
Difficulty: easy

2. Which structure uses LIFO?
A) Queue
B) Stack
C) Array
D) Linked List
Ans: B
Marks: 1
Difficulty: medium`}</pre>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {[
                ['Question starters', '"1." or "1)" or "Q1." or "Question 1:"'],
                ['Option labels',     '"A." or "A)" or "(A)" — uppercase or lowercase'],
                ['Correct answer',    '"Answer: A" or "Ans: B" or "Correct: C"'],
                ['Marks (optional)',  '"Marks: 2" or "Points: 2"'],
                ['Difficulty (opt.)', '"Difficulty: easy/medium/hard"'],
              ].map(([k,v])=>(
                <div key={k} className="bg-gray-50 rounded-lg p-2">
                  <p className="font-semibold text-gray-600">{k}</p>
                  <p className="text-gray-400 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Spreadsheet format */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold text-xs">XLSX / CSV</span>
              Spreadsheet Format
            </h4>
            <p className="text-gray-500 mb-3">One question per row. Column order must match exactly:</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    {['Question Text','Option A','Option B','Option C','Option D','Correct','Marks','Difficulty'].map(h=>(
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="px-3 py-2 text-gray-600">What is 2+2?</td>
                    <td className="px-3 py-2">3</td><td className="px-3 py-2">4</td>
                    <td className="px-3 py-2">5</td><td className="px-3 py-2">6</td>
                    <td className="px-3 py-2 font-bold text-emerald-600">B</td>
                    <td className="px-3 py-2">1</td><td className="px-3 py-2">easy</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex gap-2 flex-shrink-0">
          <a href="#" onClick={e=>{e.preventDefault();
              fetch('/api/exams/0/import/template', {headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}})
                .then(r=>r.blob()).then(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='questions_template.xlsx';a.click();});
            }}
            className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-xl transition">
            📥 Download XLSX Template
          </a>
          <a href="#" onClick={e=>{e.preventDefault();
              fetch('/api/exams/0/import/word-template', {headers:{Authorization:`Bearer ${localStorage.getItem('token')}`}})
                .then(r=>r.blob()).then(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='question_format_guide.txt';a.click();});
            }}
            className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl transition">
            📥 Download Word/PDF Guide
          </a>
          <button onClick={onClose}
            className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function CreateExamPage() {
  const navigate = useNavigate();

  const [step,        setStep]        = useState(1);
  const [examData,    setExamData]    = useState({
    title:'', subject:'', department:'', description:'',
    duration_minutes:60, total_marks:100, pass_marks:40,
    start_time:'', end_time:'',
    shuffle_questions:true, shuffle_options:true, proctoring_enabled:true,
  });
  const [createdExam, setCreatedExam] = useState(null);
  const [saving,      setSaving]      = useState(false);

  // Question entry mode: 'upload' | 'manual'
  const [qMode,       setQMode]       = useState('upload');

  // Upload state
  const [uploading,   setUploading]   = useState(false);
  const [parsed,      setParsed]      = useState(null);   // { questions, fileName }
  const [importing,   setImporting]   = useState(false);
  const [parseError,  setParseError]  = useState(null);
  const [showGuide,   setShowGuide]   = useState(false);

  // Manual entry state
  const [manualQs,    setManualQs]    = useState([{...BLANK_Q}]);

  const updateExam = (f,v) => setExamData(p=>({...p,[f]:v}));

  // ── Step 1: Create exam ────────────────────────────────────
  const handleCreateExam = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await examAPI.create(examData);
      setCreatedExam(data.exam);
      toast.success('Exam created! Now add your questions.');
      setStep(2);
    } catch { toast.error('Failed to create exam'); }
    finally   { setSaving(false); }
  };

  // ── Upload: parse file (preview mode) ─────────────────────
  const handleFileUpload = useCallback(async file => {
    if (!createdExam) { toast.error('Please create the exam first'); return; }

    setUploading(true);
    setParseError(null);
    setParsed(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/exams/${createdExam.id}/import?preview=1`,
        { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: formData },
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        setParseError({
          message: data.message || 'Parse failed',
          hint:    data.hint,
          errors:  data.errors,
          partial: data.questions,
        });
        if (data.questions?.length) setParsed({ questions: data.questions, fileName: file.name });
        return;
      }

      setParsed({ questions: data.questions, fileName: file.name });
      toast.success(`✅ Parsed ${data.count} question${data.count!==1?'s':''} — review and import`);
    } catch {
      setParseError({ message: 'Upload failed. Check your network and try again.' });
    } finally {
      setUploading(false);
    }
  }, [createdExam]);

  // ── Upload: confirm import ─────────────────────────────────
  const handleConfirmImport = async () => {
    if (!parsed?.questions?.length || !createdExam) return;
    setImporting(true);
    try {
      const token = localStorage.getItem('token');
      const form  = new FormData();
      // Re-send as JSON body via a blob "file" — OR use the bulk API instead
      const resp  = await API.post(`/exams/${createdExam.id}/questions/bulk`, {
        questions: parsed.questions,
      });
      toast.success(`🎉 ${resp.added || parsed.questions.length} questions added to exam!`);
      setStep(3);
    } catch {
      toast.error('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  // Update a parsed question field
  const updateParsed = useCallback((idx, field, val) => {
    setParsed(prev => {
      const qs = [...prev.questions];
      qs[idx] = { ...qs[idx], [field]: val };
      return { ...prev, questions: qs };
    });
  }, []);

  const removeParsed = useCallback(idx => {
    setParsed(prev => {
      const qs = prev.questions.filter((_,i)=>i!==idx);
      return { ...prev, questions: qs };
    });
  }, []);

  // ── Manual: save questions ─────────────────────────────────
  const handleSaveManual = async () => {
    const invalid = manualQs.find(q=>!q.question_text||!q.option_a||!q.option_b||!q.option_c||!q.option_d);
    if (invalid) { toast.error('Please fill all fields (question + options A–D)'); return; }
    setSaving(true);
    try {
      await examAPI.bulkAddQuestions(createdExam.id, { questions: manualQs });
      toast.success(`${manualQs.length} questions saved!`);
      setStep(3);
    } catch { toast.error('Failed to save questions'); }
    finally   { setSaving(false); }
  };

  const updateManual = (idx,f,v) => setManualQs(p=>p.map((q,i)=>i===idx?{...q,[f]:v}:q));

  // ── Stats helpers ──────────────────────────────────────────
  const parsedOk = parsed?.questions.filter(q=>q.question_text&&q.option_a&&q.option_b).length || 0;

  // ─────────────── RENDER ───────────────────────────────────
  return (
    <Layout title="Create New Exam">
      {showGuide && <FormatGuide onClose={()=>setShowGuide(false)}/>}

      <StepBar step={step}/>

      {/* ── STEP 1: Exam Details ─────────────────────────── */}
      {step===1 && (
        <form onSubmit={handleCreateExam} className="max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm">1</span>
              Exam Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Exam Title *"      value={examData.title}            onChange={v=>updateExam('title',v)}            placeholder="e.g., Mid-Term Mathematics" required/>
              <Field label="Subject *"         value={examData.subject}          onChange={v=>updateExam('subject',v)}          placeholder="e.g., Mathematics" required/>
              <Field label="Department"        value={examData.department}       onChange={v=>updateExam('department',v)}       placeholder="e.g., Computer Science"/>
              <Field label="Duration (min) *"  value={examData.duration_minutes} onChange={v=>updateExam('duration_minutes',parseInt(v)||60)} type="number" required/>
              <Field label="Total Marks *"     value={examData.total_marks}      onChange={v=>updateExam('total_marks',parseInt(v)||100)} type="number" required/>
              <Field label="Pass Marks *"      value={examData.pass_marks}       onChange={v=>updateExam('pass_marks',parseInt(v)||40)} type="number" required/>
              <Field label="Start Time *"      value={examData.start_time}       onChange={v=>updateExam('start_time',v)} type="datetime-local" required/>
              <Field label="End Time *"        value={examData.end_time}         onChange={v=>updateExam('end_time',v)}   type="datetime-local" required/>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions / Description</label>
              <textarea value={examData.description} onChange={e=>updateExam('description',e.target.value)} rows={3}
                placeholder="Optional: exam rules, instructions or notes for students…"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"/>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[['shuffle_questions','🔀 Shuffle Questions'],['shuffle_options','🔀 Shuffle Options'],['proctoring_enabled','🤖 AI Proctoring']].map(([f,label])=>(
                <label key={f} className="flex items-center gap-2 cursor-pointer select-none p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                  <input type="checkbox" checked={examData[f]} onChange={e=>updateExam(f,e.target.checked)} className="w-4 h-4 accent-blue-600"/>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-md text-sm">
              {saving ? 'Creating…' : 'Create Exam & Continue →'}
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 2: Add Questions ────────────────────────── */}
      {step===2 && createdExam && (
        <div className="max-w-3xl">

          {/* Exam badge */}
          <div className="flex items-center gap-3 mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-emerald-600 text-xl">✅</span>
            <div>
              <p className="text-emerald-800 font-semibold text-sm">"{createdExam.title}" created successfully</p>
              <p className="text-emerald-600 text-xs">Now add questions via file upload or manually</p>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mb-5">
            <div className="flex border-b border-gray-200">
              {[['upload','📤 Upload File','Paste a .docx or .pdf'],['manual','✏️ Manual Entry','Type questions one-by-one']].map(([mode,label,sub])=>(
                <button key={mode} onClick={()=>setQMode(mode)}
                  className={`flex-1 px-5 py-4 text-left transition-all ${qMode===mode?'bg-blue-50 border-b-2 border-blue-600':'hover:bg-gray-50'}`}>
                  <p className={`font-semibold text-sm ${qMode===mode?'text-blue-700':'text-gray-600'}`}>{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </button>
              ))}
            </div>

            <div className="p-5">

              {/* ── UPLOAD MODE ─────────────────────────── */}
              {qMode==='upload' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">Upload a Word or PDF file containing your MCQ questions.</p>
                    <button onClick={()=>setShowGuide(true)}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
                      📖 Format Guide
                    </button>
                  </div>

                  {!parsed && (
                    <UploadZone onFilePicked={handleFileUpload} uploading={uploading}/>
                  )}

                  {/* Parse error banner */}
                  {parseError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
                        <div className="flex-1">
                          <p className="text-red-700 font-semibold text-sm">{parseError.message}</p>
                          {parseError.hint && <p className="text-red-500 text-xs mt-1">{parseError.hint}</p>}
                          {parseError.errors?.length > 0 && (
                            <ul className="mt-2 text-xs text-red-600 space-y-0.5">
                              {parseError.errors.slice(0,5).map((e,i)=><li key={i}>• {e}</li>)}
                              {parseError.errors.length>5 && <li>…and {parseError.errors.length-5} more</li>}
                            </ul>
                          )}
                        </div>
                        <button onClick={()=>{setParseError(null);setParsed(null);}}
                          className="text-red-400 hover:text-red-600 text-sm">✕</button>
                      </div>
                    </div>
                  )}

                  {/* Parsed preview */}
                  {parsed && (
                    <div className="space-y-3">
                      {/* Stats bar */}
                      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="text-2xl">📄</span>
                            <div>
                              <p className="font-semibold text-gray-800">{parsed.fileName}</p>
                              <p className="text-xs text-gray-400">{parsed.questions.length} questions extracted</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full"/>
                              {parsedOk} ready
                            </span>
                            {parsed.questions.length-parsedOk > 0 && (
                              <span className="flex items-center gap-1 text-red-500 font-medium">
                                <span className="w-2 h-2 bg-red-500 rounded-full"/>
                                {parsed.questions.length-parsedOk} need attention
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={()=>{setParsed(null);setParseError(null);}}
                          className="text-xs text-gray-400 hover:text-gray-600 underline">
                          Upload different file
                        </button>
                      </div>

                      {/* Editable questions list */}
                      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                        {parsed.questions.map((q,idx)=>(
                          <PreviewRow key={idx} q={q} idx={idx}
                            onChange={(f,v)=>updateParsed(idx,f,v)}
                            onRemove={()=>removeParsed(idx)}/>
                        ))}
                      </div>

                      {/* Confirm import */}
                      <div className="flex gap-3 pt-2">
                        <button onClick={handleConfirmImport} disabled={importing||parsedOk===0}
                          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-md text-sm flex items-center justify-center gap-2">
                          {importing
                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Importing…</>
                            : `🚀 Import ${parsedOk} Question${parsedOk!==1?'s':''} into Exam`}
                        </button>
                        <button onClick={()=>setQMode('manual')}
                          className="px-4 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl text-sm transition">
                          Add More Manually
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── MANUAL MODE ────────────────────────── */}
              {qMode==='manual' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">{manualQs.length} question{manualQs.length!==1?'s':''} added</p>
                    <button onClick={()=>setManualQs(p=>[...p,{...BLANK_Q}])}
                      className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
                      + Add Question
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {manualQs.map((q,idx)=>(
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="flex items-center gap-2">
                            <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-bold">{idx+1}</span>
                            <span className="text-sm font-semibold text-gray-700">Question {idx+1}</span>
                          </span>
                          {manualQs.length>1 && (
                            <button onClick={()=>setManualQs(p=>p.filter((_,i)=>i!==idx))}
                              className="text-red-400 hover:text-red-600 text-sm transition">✕ Remove</button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Question *</label>
                            <textarea rows={2} value={q.question_text} onChange={e=>updateManual(idx,'question_text',e.target.value)}
                              placeholder="Enter your question here…"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white"/>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {['A','B','C','D'].map(opt=>(
                              <div key={opt}>
                                <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-1">
                                  <input type="radio" name={`cor_${idx}`} value={opt}
                                    checked={q.correct_option===opt} onChange={()=>updateManual(idx,'correct_option',opt)}
                                    className="accent-emerald-600"/>
                                  Option {opt}
                                  {q.correct_option===opt && <span className="text-emerald-600 text-xs font-bold">✓</span>}
                                </label>
                                <input value={q[`option_${opt.toLowerCase()}`]}
                                  onChange={e=>updateManual(idx,`option_${opt.toLowerCase()}`,e.target.value)}
                                  placeholder={`Option ${opt}…`}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"/>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-3">
                            <div className="w-24">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Marks</label>
                              <input type="number" min={1} value={q.marks} onChange={e=>updateManual(idx,'marks',parseInt(e.target.value)||1)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"/>
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Difficulty</label>
                              <select value={q.difficulty} onChange={e=>updateManual(idx,'difficulty',e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button onClick={()=>setManualQs(p=>[...p,{...BLANK_Q}])}
                      className="flex-1 border-2 border-dashed border-blue-300 text-blue-600 py-3 rounded-xl hover:bg-blue-50 transition font-medium text-sm">
                      + Add Another Question
                    </button>
                    <button onClick={handleSaveManual} disabled={saving}
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition shadow-md text-sm">
                      {saving ? 'Saving…' : `💾 Save ${manualQs.length} Question${manualQs.length!==1?'s':''}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ────────────────────────────────── */}
      {step===3 && (
        <div className="max-w-lg">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
              <span className="text-4xl">🎉</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Exam Ready!</h2>
            <p className="text-gray-500 mb-1">
              <span className="font-semibold text-gray-700">"{createdExam?.title}"</span> has been created
            </p>
            <p className="text-gray-400 text-sm mb-8">Students can now take the exam when it opens.</p>

            <div className="flex flex-col gap-3">
              <button onClick={()=>navigate(`/admin/exams/${createdExam?.id}/monitor`)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition shadow-md text-sm">
                🔴 Open Live Monitor Dashboard
              </button>
              <button onClick={()=>navigate('/staff/dashboard')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition text-sm">
                ← Back to Dashboard
              </button>
              <button onClick={()=>{setStep(1);setCreatedExam(null);setParsed(null);setManualQs([{...BLANK_Q}]);setExamData({title:'',subject:'',department:'',description:'',duration_minutes:60,total_marks:100,pass_marks:40,start_time:'',end_time:'',shuffle_questions:true,shuffle_options:true,proctoring_enabled:true});}}
                className="text-blue-500 hover:text-blue-700 text-sm font-medium transition">
                + Create Another Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
