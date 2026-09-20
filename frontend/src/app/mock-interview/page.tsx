'use client';

import { useState, useEffect, useRef } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Job } from '@/types/job';
import type { Resume } from '@/types/resume';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorBanner } from '@/components/shared/ErrorBanner';

interface QuestionItem {
  id: number;
  category: string;
  question: string;
  time_limit_sec: number;
  focus: string;
}

interface StarBreakdown {
  situation: string;
  task: string;
  action: string;
  result: string;
}

interface AnswerEvaluation {
  score: number;
  star_breakdown: StarBreakdown;
  strengths: string[];
  improvements: string[];
  model_answer: string;
}

interface CompletedAnswerRecord {
  question_id: number;
  category: string;
  question: string;
  answer: string;
  score: number;
  evaluation: AnswerEvaluation;
}

interface FinalScorecard {
  job_title: string;
  company: string;
  total_questions_answered: number;
  overall_readiness_score: number;
  readiness_level: string;
  recommendation: string;
  badge_color: string;
  final_coaching_notes: string[];
}

export default function MockInterviewPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session state
  const [inSession, setInSession] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answer & Evaluation state
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<AnswerEvaluation | null>(null);
  const [completedAnswers, setCompletedAnswers] = useState<CompletedAnswerRecord[]>([]);

  // Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<unknown>(null);

  // Final Scorecard
  const [finalScorecard, setFinalScorecard] = useState<FinalScorecard | null>(null);
  const [completingInterview, setCompletingInterview] = useState(false);

  useEffect(() => {
    Promise.allSettled([api.jobs.list(), api.resume.list()]).then(([j, r]) => {
      if (j.status === 'fulfilled') {
        setJobs(j.value);
        if (j.value.length > 0) setSelectedJobId(j.value[0].id);
      }
      if (r.status === 'fulfilled') {
        setResumes(r.value);
        if (r.value.length > 0) setSelectedResumeId(r.value[0].id);
      }
      setFetchingData(false);
    });

    // Check Web Speech API support
    const windowObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const toggleSpeechRecognition = () => {
    const windowObj = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionConstructor = (windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition) as any;

    if (!SpeechRecognitionConstructor) {
      setError('Web Speech API is not supported in your browser. Please type your response.');
      return;
    }

    if (isListening) {
      // Stop listening
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (recognitionRef.current && (recognitionRef.current as any).stop) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recognitionRef.current as any).stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setCandidateAnswer((prev) => {
          const space = prev && !prev.endsWith(' ') ? ' ' : '';
          return prev + space + transcript;
        });
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch {
      setError('Unable to activate microphone. Please check permissions.');
      setIsListening(false);
    }
  };

  const handleStartInterview = async () => {
    if (!selectedJobId) {
      setError('Please select a target job position to begin.');
      return;
    }
    setError(null);
    setStartingSession(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.mockInterview.start(selectedJobId, selectedResumeId || undefined);
      setJobTitle(res.job_title);
      setCompany(res.company);
      setQuestions(res.questions);
      setCurrentIndex(0);
      setCompletedAnswers([]);
      setCurrentEvaluation(null);
      setCandidateAnswer('');
      setFinalScorecard(null);
      setInSession(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to initialize mock interview.';
      setError(msg);
    } finally {
      setStartingSession(false);
    }
  };

  const handleEvaluateCurrentAnswer = async () => {
    if (!candidateAnswer.trim() || candidateAnswer.trim().length < 8) {
      setError('Please provide or speak a substantive response before submitting.');
      return;
    }

    if (isListening && recognitionRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any).stop?.();
      setIsListening(false);
    }

    const currentQ = questions[currentIndex];
    setError(null);
    setEvaluating(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const evalRes: any = await api.mockInterview.evaluateAnswer({
        job_title: jobTitle,
        company,
        question_id: currentQ.id,
        question: currentQ.question,
        category: currentQ.category,
        answer: candidateAnswer,
      });

      setCurrentEvaluation(evalRes);
      const record: CompletedAnswerRecord = {
        question_id: currentQ.id,
        category: currentQ.category,
        question: currentQ.question,
        answer: candidateAnswer,
        score: evalRes.score,
        evaluation: evalRes,
      };
      setCompletedAnswers((prev) => [...prev, record]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to evaluate answer.';
      setError(msg);
    } finally {
      setEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
      setCurrentEvaluation(null);
      setCandidateAnswer('');
    } else {
      handleCompleteInterview();
    }
  };

  const handleCompleteInterview = async () => {
    setCompletingInterview(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await api.mockInterview.complete(jobTitle, company, completedAnswers);
      setFinalScorecard(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to generate interview scorecard.';
      setError(msg);
    } finally {
      setCompletingInterview(false);
    }
  };

  const handleReset = () => {
    setInSession(false);
    setFinalScorecard(null);
    setCurrentEvaluation(null);
    setCompletedAnswers([]);
    setCandidateAnswer('');
    setCurrentIndex(0);
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-400 border border-violet-500/30">
              Interactive AI Interview Simulator
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              STAR Method Analysis
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Live AI Mock Interview
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Simulate a high-stakes technical & behavioral interview with live voice speech-to-text,
            granular STAR evaluation per answer, and hiring readiness scoring.
          </p>
        </div>

        {inSession && (
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            Exit Session
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Start Setup State */}
      {!inSession && !finalScorecard && (
        <div className="glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center text-2xl font-bold">
              🎙️
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Interview Configuration</h2>
              <p className="text-xs text-zinc-400">
                Choose the role and resume context to tailor the technical and behavioral itinerary.
              </p>
            </div>
          </div>

          {fetchingData ? (
            <div className="flex items-center gap-3 py-6 text-zinc-500 text-sm">
              <LoadingSpinner size="sm" /> Loading available jobs and profiles...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Target Job Position *
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- Choose Job Position --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} at {j.company || 'Company'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Candidate Resume Context (Optional)
                </label>
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                >
                  <option value="">-- No Resume Context --</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.file_name} {r.is_active_version ? '★' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-400 space-y-2">
            <div className="font-semibold text-zinc-300">Session Structure:</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>5 Curated Questions: Elevator Pitch, Core Tech Deep-Dive, System Scalability, Behavioral Conflict, and Production Bug RCA.</li>
              <li>Dual Input: Answer via keyboard or live 🎙️ Microphone voice speech recognition.</li>
              <li>Instant STAR Feedback & 95+ score exemplar per answer.</li>
            </ul>
          </div>

          <button
            onClick={handleStartInterview}
            disabled={startingSession || !selectedJobId}
            className="w-full md:w-auto px-8 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-glow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {startingSession && <LoadingSpinner size="sm" />}
            {startingSession ? 'Generating Custom Interview...' : '🚀 Start Live Interview Session'}
          </button>
        </div>
      )}

      {/* Active Interview Session */}
      {inSession && !finalScorecard && currentQ && (
        <div className="space-y-6">
          {/* Progress Tracker */}
          <div className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/60 px-4 py-3 rounded-xl border border-zinc-800">
            <div>
              <span className="font-bold text-white">Role:</span> {jobTitle} at {company}
            </div>
            <div className="flex items-center gap-2 font-medium">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-violet-400">{currentQ.category}</span>
            </div>
          </div>

          {/* Question Card */}
          <div className="glass-card rounded-2xl p-6 md:p-8 border border-zinc-800 space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                AI
              </div>
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                    Lead Hiring Manager
                  </span>
                  <span className="text-xs text-zinc-500">
                    • Target Response: ~{currentQ.time_limit_sec}s
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-white leading-relaxed">
                  {currentQ.question}
                </h3>
                <p className="text-xs text-zinc-400 italic">
                  💡 Evaluation Focus: {currentQ.focus}
                </p>
              </div>
            </div>
          </div>

          {/* Candidate Response Section */}
          <div className="glass-card rounded-2xl p-6 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Your Answer (Type or Speak)
              </label>

              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    isListening
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                      : 'bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-rose-500' : 'bg-zinc-400'}`} />
                  {isListening ? '🎙️ Stop Listening' : '🎙️ Speak Answer (Mic)'}
                </button>
              )}
            </div>

            <textarea
              rows={6}
              value={candidateAnswer}
              onChange={(e) => setCandidateAnswer(e.target.value)}
              placeholder="Structure your answer using the STAR method: Situation (context), Task (goal), Action (specific technical implementation), and Result (quantifiable impact)..."
              disabled={evaluating || !!currentEvaluation}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 leading-relaxed disabled:opacity-75"
            />

            {!currentEvaluation && (
              <div className="flex justify-end">
                <button
                  onClick={handleEvaluateCurrentAnswer}
                  disabled={evaluating || !candidateAnswer.trim()}
                  className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-glow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {evaluating && <LoadingSpinner size="sm" />}
                  {evaluating ? 'Analyzing STAR Breakdown...' : 'Submit & Analyze with STAR'}
                </button>
              </div>
            )}
          </div>

          {/* STAR Evaluation Result */}
          {currentEvaluation && (
            <div className="glass-card rounded-2xl p-6 md:p-8 border border-violet-500/30 bg-violet-950/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-extrabold text-violet-400">
                    {currentEvaluation.score}
                    <span className="text-sm font-normal text-zinc-400">/100</span>
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">Answer Score & Assessment</h4>
                    <p className="text-xs text-zinc-400">STAR Method Evaluation</p>
                  </div>
                </div>

                <button
                  onClick={handleNextQuestion}
                  disabled={completingInterview}
                  className="px-5 py-2 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all flex items-center gap-2"
                >
                  {completingInterview ? (
                    <LoadingSpinner size="sm" />
                  ) : currentIndex + 1 < questions.length ? (
                    'Next Question →'
                  ) : (
                    'View Final Scorecard 🏆'
                  )}
                </button>
              </div>

              {/* STAR Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                    S — Situation
                  </span>
                  <p className="text-xs text-zinc-300 mt-1">
                    {currentEvaluation.star_breakdown.situation}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
                    T — Task
                  </span>
                  <p className="text-xs text-zinc-300 mt-1">
                    {currentEvaluation.star_breakdown.task}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                    A — Action
                  </span>
                  <p className="text-xs text-zinc-300 mt-1">
                    {currentEvaluation.star_breakdown.action}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                    R — Result
                  </span>
                  <p className="text-xs text-zinc-300 mt-1">
                    {currentEvaluation.star_breakdown.result}
                  </p>
                </div>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1.5">
                  <span className="font-semibold text-emerald-400">Key Strengths:</span>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                    {currentEvaluation.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-1.5">
                  <span className="font-semibold text-amber-400">Coaching Tips for 95+:</span>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                    {currentEvaluation.improvements.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Model Answer */}
              {currentEvaluation.model_answer && (
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs">
                  <span className="font-semibold text-zinc-200">
                    🌟 Exemplar 95+ Candidate Response:
                  </span>
                  <p className="text-zinc-400 italic leading-relaxed">
                    &quot;{currentEvaluation.model_answer}&quot;
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Final Scorecard */}
      {finalScorecard && (
        <div className="glass-card rounded-2xl p-8 md:p-10 border border-zinc-800 space-y-8">
          <div className="text-center space-y-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Mock Interview Completed
            </span>
            <h2 className="text-3xl font-display font-bold text-white">
              Hiring Readiness Scorecard
            </h2>
            <p className="text-sm text-zinc-400">
              Evaluated for <span className="text-zinc-200 font-semibold">{finalScorecard.job_title}</span> at{' '}
              <span className="text-zinc-200 font-semibold">{finalScorecard.company}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
              <span className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">
                Overall Score
              </span>
              <div className="text-5xl font-extrabold text-emerald-400">
                {finalScorecard.overall_readiness_score}%
              </div>
              <p className="text-xs text-zinc-500">Across {finalScorecard.total_questions_answered} questions</p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
              <span className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">
                Hiring Recommendation
              </span>
              <div className="text-xl font-bold text-white pt-3">
                {finalScorecard.recommendation}
              </div>
              <p className="text-xs text-zinc-400">{finalScorecard.readiness_level}</p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
              <span className="text-xs uppercase font-semibold text-zinc-400 tracking-wider">
                Readiness Tier
              </span>
              <div className="text-2xl font-bold text-cyan-400 pt-3">
                Top Candidate
              </div>
              <p className="text-xs text-zinc-400">STAR Mastery Confirmed</p>
            </div>
          </div>

          {/* Question Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Question Breakdown
            </h3>
            <div className="space-y-2">
              {completedAnswers.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-zinc-200">
                      Q{item.question_id}: {item.category}
                    </span>
                    <p className="text-zinc-400 truncate max-w-lg">{item.question}</p>
                  </div>
                  <span className="font-bold text-sm text-violet-400">{item.score}/100</span>
                </div>
              ))}
            </div>
          </div>

          {/* Coaching Notes */}
          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Executive Coaching Takeaways
            </h3>
            <ul className="list-disc pl-4 space-y-1.5 text-xs text-zinc-400">
              {finalScorecard.final_coaching_notes.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-glow"
            >
              Practice Another Role
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
