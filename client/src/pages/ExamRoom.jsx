import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Check,
  Clock,
  Code2,
  FileText,
  Flag,
  Maximize,
  Minimize,
  RefreshCw,
  Send,
  ShieldAlert,
  Timer,
  Camera,
  CameraOff,
} from 'lucide-react';

import api, { msg } from '../api';
import useTabGuard from '../hooks/useTabGuard';

const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(
    s % 60
  ).padStart(2, '0')}`;

export default function ExamRoom() {
  const { id } = useParams();
  const nav = useNavigate();

  const [phase, setPhase] = useState('instructions');
  const [info, setInfo] = useState(null);
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [deadline, setDeadline] = useState(0);
  const [left, setLeft] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [warn, setWarn] = useState(false);
  const [err, setErr] = useState('');
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [starting, setStarting] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [marked, setMarked] = useState({});
  const [showQuestionNav, setShowQuestionNav] = useState(false);
  const [showSubmitPanel, setShowSubmitPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ---------------------------------------------------------
  // CAMERA STATE
  // ---------------------------------------------------------

  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraError, setCameraError] = useState('');

  const latest = useRef(answers);
  latest.current = answers;

  const busy = useRef(false);

  // ---------------------------------------------------------
  // LOAD TEST INFORMATION
  // ---------------------------------------------------------

  useEffect(() => {
    setLoadingInfo(true);

    api
      .get(`/exam/tests/${id}`)
      .then(({ data }) => {
        setInfo(data);

        if (
          data.status === 'submitted' ||
          data.status === 'auto-submitted'
        ) {
          setPhase('done');
        }
      })
      .catch((e) => setErr(msg(e)))
      .finally(() => setLoadingInfo(false));
  }, [id]);

  // ---------------------------------------------------------
  // FULLSCREEN STATE
  // ---------------------------------------------------------

  useEffect(() => {
    const handleFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener(
      'fullscreenchange',
      handleFullscreen
    );

    return () => {
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreen
      );
    };
  }, []);

  // =========================================================
  // CAMERA FUNCTIONS
  // =========================================================

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStatus('idle');
  };

  const startCamera = async () => {
    setCameraError('');
    setCameraStatus('starting');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera access is not supported by this browser.'
        );
      }

      // Stop any previous stream first.
      if (cameraStreamRef.current) {
        cameraStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        cameraStreamRef.current = null;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        try {
          await videoRef.current.play();
        } catch {
          // Browser may automatically handle playback.
        }
      }

      setCameraStatus('live');

      return true;
    } catch (error) {
      console.error('Camera error:', error);

      let message =
        'Unable to access your camera.';

      if (error?.name === 'NotAllowedError') {
        message =
          'Camera permission was denied. Please allow camera access in your browser and try again.';
      } else if (error?.name === 'NotFoundError') {
        message =
          'No camera was found on this device. Please connect a camera and try again.';
      } else if (error?.name === 'NotReadableError') {
        message =
          'Your camera is currently being used by another application. Close other camera applications and try again.';
      } else if (error?.name === 'OverconstrainedError') {
        message =
          'The camera does not support the requested settings. Please try again.';
      } else if (error?.message) {
        message = error.message;
      }

      setCameraStatus('error');
      setCameraError(message);

      return false;
    }
  };

  // ---------------------------------------------------------
  // CAMERA LIFECYCLE
  // ---------------------------------------------------------

  useEffect(() => {
    if (phase !== 'exam') {
      stopCamera();
      return undefined;
    }

    // Start camera when exam becomes active.
    startCamera();

    return () => {
      stopCamera();
    };
  }, [phase]);

  // ---------------------------------------------------------
  // START TEST
  // ---------------------------------------------------------

  const start = async () => {
    setErr('');
    setCameraError('');
    setStarting(true);

    try {
      // Camera must be available before starting the exam.
      const cameraReady = await startCamera();

      if (!cameraReady) {
        throw new Error(
          'Camera access is required to start this assessment. Please allow camera permission and try again.'
        );
      }

      // Request fullscreen.
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {}

      // Start test on server.
      const { data } = await api.post(
        `/exam/tests/${id}/start`
      );

      setTest(data.test);
      setStrikes(data.tabSwitchCount);
      setAnswers(data.answers || {});
      setDeadline(new Date(data.deadline).getTime());
      setLeft(data.remainingSeconds);
      setActiveQuestion(0);
      setPhase('exam');
    } catch (e) {
      stopCamera();

      const message =
        e?.message || msg(e);

      if (/expired|already submitted/i.test(message)) {
        setPhase('done');
      } else {
        setErr(message);
      }
    } finally {
      setStarting(false);
    }
  };

  // ---------------------------------------------------------
  // SUBMIT TEST
  // ---------------------------------------------------------

  const submit = async (auto = false) => {
    if (busy.current || phase !== 'exam') return;

    busy.current = true;
    setErr('');

    try {
      await api.post(`/exam/tests/${id}/submit`, {
        answers: latest.current,
        auto,
      });

      stopCamera();

      setPhase('done');

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {
      busy.current = false;
      setErr(msg(e));
    }
  };

  // ---------------------------------------------------------
  // SERVER AUTHORITATIVE TIMER
  // ---------------------------------------------------------

  useEffect(() => {
    if (!deadline || phase !== 'exam') return;

    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (deadline - Date.now()) / 1000
        )
      );

      setLeft(seconds);

      if (seconds <= 0) {
        submit(true);
      }
    };

    const t = setInterval(tick, 250);

    tick();

    return () => clearInterval(t);
  }, [deadline, phase]);

  // ---------------------------------------------------------
  // AUTOSAVE
  // ---------------------------------------------------------

  useEffect(() => {
    if (phase !== 'exam') return;

    const t = setTimeout(() => {
      api
        .put(`/exam/tests/${id}/answers`, {
          answers: latest.current,
        })
        .catch((e) => {
          if (/expired/i.test(msg(e))) {
            stopCamera();
            setPhase('done');
          }
        });
    }, 1200);

    return () => clearTimeout(t);
  }, [answers, phase, id]);

  // ---------------------------------------------------------
  // TAB / VISIBILITY GUARD
  // ---------------------------------------------------------

  useTabGuard(phase === 'exam', () => {
    if (busy.current) return;

    setWarn(true);

    api
      .post(`/exam/tests/${id}/violation`)
      .then((r) =>
        setStrikes(r.data.tabSwitchCount)
      )
      .catch((e) => {
        if (/expired/i.test(msg(e))) {
          stopCamera();
          setPhase('done');
        }
      });
  });

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------

  const questions = test?.questions || [];

  const answeredCount = questions.filter(
    (q) =>
      answers[q._id] !== undefined &&
      answers[q._id] !== null &&
      answers[q._id] !== ''
  ).length;

  const unansweredCount = Math.max(
    questions.length - answeredCount,
    0
  );

  const markedCount =
    Object.values(marked).filter(Boolean).length;

  const currentQuestion =
    questions[activeQuestion];

  const selectQuestion = (index) => {
    setActiveQuestion(index);
    setShowQuestionNav(false);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const toggleMarked = () => {
    if (!currentQuestion) return;

    setMarked((prev) => ({
      ...prev,
      [currentQuestion._id]:
        !prev[currentQuestion._id],
    }));
  };

  const goNext = () => {
    if (
      activeQuestion <
      questions.length - 1
    ) {
      setActiveQuestion((v) => v + 1);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  const goPrevious = () => {
    if (activeQuestion > 0) {
      setActiveQuestion((v) => v - 1);

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  const requestFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {}
  };

  const leaveFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {}
  };

  const handleAnswer = (
    questionId,
    value
  ) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value,
    }));
  };

  // =========================================================
  // INSTRUCTIONS SCREEN
  // =========================================================

  if (phase === 'instructions') {
    return (
      <div className="min-h-screen bg-stone-100 p-4 sm:p-6 grid place-items-center">
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">

            {/* HEADER */}
            <div className="bg-slate-800 text-white px-6 py-7 sm:px-8">
              <div className="flex items-start gap-4">

                <div className="w-12 h-12 rounded-xl bg-white/10 grid place-items-center shrink-0">
                  <FileText size={24} />
                </div>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-slate-300 font-medium">
                    Assessment
                  </p>

                  <h1 className="text-2xl sm:text-3xl font-bold mt-1 break-words">
                    {loadingInfo
                      ? 'Loading test...'
                      : info?.title ||
                        'Assessment Test'}
                  </h1>

                  {!loadingInfo &&
                    info?.description && (
                      <p className="text-sm text-slate-300 mt-2">
                        {info.description}
                      </p>
                    )}
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">

              {/* TEST OVERVIEW */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-7">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <Clock
                    size={19}
                    className="text-slate-600"
                  />

                  <p className="text-xs text-slate-500 mt-2">
                    Duration
                  </p>

                  <p className="font-bold text-slate-900 mt-0.5">
                    {info?.durationMinutes ||
                      '--'}{' '}
                    min
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <FileText
                    size={19}
                    className="text-slate-600"
                  />

                  <p className="text-xs text-slate-500 mt-2">
                    Questions
                  </p>

                  <p className="font-bold text-slate-900 mt-0.5">
                    {info?.questionsCount ??
                      info?.questionCount ??
                      '--'}
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <ShieldAlert
                    size={19}
                    className="text-slate-600"
                  />

                  <p className="text-xs text-slate-500 mt-2">
                    Attempts
                  </p>

                  <p className="font-bold text-slate-900 mt-0.5">
                    One attempt
                  </p>
                </div>

              </div>

              {/* CAMERA REQUIREMENT */}
              <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">

                <div className="flex items-start gap-3">

                  <div className="w-10 h-10 rounded-xl bg-white grid place-items-center shrink-0">
                    <Camera
                      size={20}
                      className="text-blue-700"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Camera Required
                    </h3>

                    <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                      Your camera must be enabled during
                      the assessment. Camera video is used
                      for live monitoring only and is not
                      recorded or stored by this page.
                    </p>
                  </div>

                </div>

              </div>

              {/* BEFORE YOU BEGIN */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">

                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-900">
                    Before you begin
                  </h2>
                </div>

                <div className="p-4 sm:p-5">

                  <div className="space-y-4">

                    <Instruction
                      icon={<Clock size={18} />}
                      title="Server-controlled timer"
                      text={`You have ${
                        info?.durationMinutes ||
                        '--'
                      } minutes. The server controls the deadline, so refreshing the page will not reset the timer.`}
                    />

                    <Instruction
                      icon={<Maximize size={18} />}
                      title="Fullscreen mode"
                      text="The assessment runs in fullscreen where supported."
                    />

                    <Instruction
                      icon={<Camera size={18} />}
                      title="Camera monitoring"
                      text="Camera permission is required. Your live camera preview is shown during the assessment."
                    />

                    <Instruction
                      icon={<ShieldAlert size={18} />}
                      title="Activity monitoring"
                      text="Tab switching and exiting fullscreen can be recorded for administration."
                    />

                    <Instruction
                      icon={<CheckCircle2 size={18} />}
                      title="One attempt"
                      text="Once submitted, the assessment cannot be attempted again."
                    />

                  </div>

                </div>
              </div>

              {err && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <AlertTriangle
                    size={19}
                    className="shrink-0 mt-0.5"
                  />

                  <span>{err}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-7">

                <button
                  type="button"
                  onClick={() => nav('/')}
                  disabled={starting}
                  className="sm:w-auto px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ArrowLeft size={17} />
                  Back
                </button>

                <button
                  type="button"
                  disabled={!info || starting}
                  onClick={start}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {starting ? (
                    <>
                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />

                      Starting Test...
                    </>
                  ) : (
                    <>
                      <Camera size={18} />
                      Start Test
                    </>
                  )}
                </button>

              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // COMPLETED SCREEN
  // =========================================================

  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-stone-100 p-4 grid place-items-center">

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-7 sm:p-9 text-center max-w-md w-full">

          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 grid place-items-center text-emerald-700">
            <CheckCircle2 size={32} />
          </div>

          <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-6">
            Submission Complete
          </p>

          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Test Successfully Submitted
          </h1>

          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            Your test has been successfully submitted.
          </p>

          <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4 text-left">

            <div className="flex gap-3">

              <ShieldAlert
                size={18}
                className="text-slate-600 shrink-0 mt-0.5"
              />

              <p className="text-sm text-slate-600">
                Your results will be reviewed by the administration.
                Marks and results are not displayed to students.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() => nav('/')}
            className="mt-6 w-full px-4 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition inline-flex items-center justify-center gap-2"
          >
            Back to Dashboard
            <ArrowLeft
              size={17}
              className="rotate-180"
            />
          </button>

        </div>

      </div>
    );
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (!test) {
    return (
      <div className="min-h-screen bg-stone-100 grid place-items-center p-4">

        <div className="text-center">

          <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-slate-700 animate-spin mx-auto" />

          <p className="text-sm text-slate-600 mt-4">
            Loading your assessment...
          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // EXAM UI
  // =========================================================

  return (
    <div className="min-h-screen bg-stone-100">

      {/* STICKY HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">

        <div className="max-w-6xl mx-auto px-3 sm:px-5 py-3">

          <div className="flex items-center gap-3">

            <div className="min-w-0 flex-1">

              <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Assessment
              </p>

              <h1 className="font-bold text-slate-900 truncate text-sm sm:text-base">
                {test.title}
              </h1>

            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 size={15} />

              <span>
                {answeredCount}/{questions.length}{' '}
                answered
              </span>
            </div>

            {/* TIMER */}
            <div
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl
                font-mono font-bold text-sm sm:text-base
                border
                ${
                  left <= 60
                    ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                    : left <= 300
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-800 border-slate-200'
                }
              `}
            >
              <Timer size={17} />
              {fmt(left)}
            </div>

            <button
              type="button"
              onClick={() =>
                setShowQuestionNav((v) => !v)
              }
              className="sm:hidden w-10 h-10 rounded-xl border border-slate-200 grid place-items-center hover:bg-slate-50"
              aria-label="Question navigation"
            >
              <FileText size={18} />
            </button>

          </div>

          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">

            <div
              className="h-full bg-slate-700 rounded-full transition-all duration-300"
              style={{
                width: `${
                  questions.length
                    ? (answeredCount /
                        questions.length) *
                      100
                    : 0
                }%`,
              }}
            />

          </div>

        </div>
      </header>

      {/* VIOLATION WARNING */}
      {warn && (
        <div className="sticky top-[65px] z-20 bg-red-800 text-white px-4 py-3 shadow-md">

          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-sm">

            <span className="flex items-center gap-2">

              <AlertTriangle size={17} />

              <span>
                Activity violation recorded.

                <strong className="ml-1">
                  ({strikes})
                </strong>
              </span>

            </span>

            <div className="flex items-center gap-3 shrink-0">

              {document.fullscreenEnabled &&
                !document.fullscreenElement && (
                  <button
                    type="button"
                    onClick={requestFullscreen}
                    className="underline hover:no-underline"
                  >
                    Enter Fullscreen
                  </button>
                )}

              <button
                type="button"
                onClick={() => setWarn(false)}
                className="underline hover:no-underline"
              >
                Dismiss
              </button>

            </div>

          </div>

        </div>
      )}

      {/* MOBILE QUESTION NAVIGATION */}
      {showQuestionNav && (
        <div className="sm:hidden fixed inset-0 z-40 bg-black/30">

          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl p-5 overflow-y-auto">

            <div className="flex items-center justify-between mb-5">

              <div>

                <h2 className="font-bold text-slate-900">
                  Questions
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {answeredCount} of{' '}
                  {questions.length} answered
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowQuestionNav(false)
                }
                className="w-9 h-9 rounded-lg border border-slate-200 grid place-items-center"
              >
                ×
              </button>

            </div>

            <QuestionGrid
              questions={questions}
              answers={answers}
              marked={marked}
              activeQuestion={activeQuestion}
              onSelect={selectQuestion}
            />

          </div>

        </div>
      )}

      <main className="max-w-6xl mx-auto p-3 sm:p-5 lg:p-6">

        <div className="grid lg:grid-cols-[1fr_260px] gap-5">

          {/* QUESTION */}
          <section>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* QUESTION HEADER */}
              <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">

                <div className="flex items-center gap-3">

                  <div className="w-9 h-9 rounded-lg bg-slate-800 text-white grid place-items-center font-bold text-sm">
                    {activeQuestion + 1}
                  </div>

                  <div>

                    <p className="font-semibold text-slate-900">
                      Question {activeQuestion + 1}
                    </p>

                    <p className="text-xs text-slate-500">
                      of {questions.length}
                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-2">

                  <span className="text-xs text-slate-500">
                    {currentQuestion?.marks || 1}{' '}
                    mark
                    {(currentQuestion?.marks || 1) !==
                    1
                      ? 's'
                      : ''}
                  </span>

                  <button
                    type="button"
                    onClick={toggleMarked}
                    className={`
                      w-9 h-9 rounded-lg border grid place-items-center
                      transition
                      ${
                        marked[
                          currentQuestion?._id
                        ]
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                      }
                    `}
                    title="Mark for review"
                  >
                    <Flag size={16} />
                  </button>

                </div>

              </div>

              {/* QUESTION CONTENT */}
              {currentQuestion && (
                <div className="p-4 sm:p-6">

                  <h2 className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                    {currentQuestion.questionText}
                  </h2>

                  {currentQuestion.instructions && (
                    <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">

                      <div className="flex gap-2">

                        <FileText
                          size={16}
                          className="shrink-0 mt-0.5"
                        />

                        <span>
                          {currentQuestion.instructions}
                        </span>

                      </div>

                    </div>
                  )}

                  {/* MCQ */}
                  {currentQuestion.questionType ===
                    'mcq' && (
                    <div className="mt-6 space-y-3">

                      {currentQuestion.options?.map(
                        (option, index) => {

                          const isSelected =
                            answers[
                              currentQuestion._id
                            ] === index;

                          return (
                            <label
                              key={index}
                              className={`
                                group flex items-center gap-3 p-3 sm:p-4
                                rounded-xl border cursor-pointer
                                transition-all
                                ${
                                  isSelected
                                    ? 'border-slate-700 bg-slate-50 ring-1 ring-slate-300'
                                    : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'
                                }
                              `}
                            >

                              <input
                                type="radio"
                                name={
                                  currentQuestion._id
                                }
                                checked={isSelected}
                                onChange={() =>
                                  handleAnswer(
                                    currentQuestion._id,
                                    index
                                  )
                                }
                                className="sr-only"
                              />

                              <span
                                className={`
                                  w-9 h-9 rounded-full border
                                  grid place-items-center shrink-0
                                  text-sm font-semibold
                                  transition
                                  ${
                                    isSelected
                                      ? 'bg-slate-800 border-slate-800 text-white'
                                      : 'border-slate-300 text-slate-500 group-hover:border-slate-500'
                                  }
                                `}
                              >
                                {String.fromCharCode(
                                  65 + index
                                )}
                              </span>

                              <span className="text-sm sm:text-base text-slate-700 flex-1">
                                {option}
                              </span>

                              {isSelected && (
                                <Check
                                  size={18}
                                  className="text-slate-800 shrink-0"
                                />
                              )}

                            </label>
                          );
                        }
                      )}

                    </div>
                  )}

                  {/* CODING */}
                  {currentQuestion.questionType !==
                    'mcq' && (
                    <div className="mt-6">

                      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500">
                        <Code2 size={15} />
                        Your solution
                      </div>

                      <textarea
                        rows={12}
                        className="w-full border border-slate-200 rounded-xl p-4 font-mono text-sm bg-slate-950 text-slate-100 outline-none focus:ring-2 focus:ring-slate-300 resize-y"
                        placeholder="Write your code here..."
                        value={
                          answers[
                            currentQuestion._id
                          ] || ''
                        }
                        onChange={(e) =>
                          handleAnswer(
                            currentQuestion._id,
                            e.target.value
                          )
                        }
                      />

                      <p className="text-xs text-slate-400 mt-2">
                        Your code will be reviewed by
                        the administration.
                      </p>

                    </div>
                  )}

                </div>
              )}

              {/* NAVIGATION */}
              <div className="px-4 sm:px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">

                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={activeQuestion === 0}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-xs text-slate-400 hidden sm:block">
                  {marked[
                    currentQuestion?._id
                  ]
                    ? 'Marked for review'
                    : 'Answer the question and continue'}
                </span>

                {activeQuestion <
                questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="px-5 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setShowSubmitPanel(true)
                    }
                    className="px-5 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition inline-flex items-center gap-2"
                  >
                    Review & Submit
                    <Send size={15} />
                  </button>
                )}

              </div>

            </div>
          </section>

          {/* DESKTOP SIDEBAR */}
          <aside className="hidden lg:block">

            <div className="sticky top-24 space-y-4">

              {/* QUESTIONS CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="font-bold text-slate-900">
                      Questions
                    </h2>

                    <p className="text-xs text-slate-500 mt-1">
                      {answeredCount}/
                      {questions.length} answered
                    </p>

                  </div>

                  <div className="text-xs font-semibold text-slate-500">
                    {Math.round(
                      questions.length
                        ? (answeredCount /
                            questions.length) *
                            100
                        : 0
                    )}
                    %
                  </div>

                </div>

                <div className="mt-4">

                  <QuestionGrid
                    questions={questions}
                    answers={answers}
                    marked={marked}
                    activeQuestion={activeQuestion}
                    onSelect={selectQuestion}
                  />

                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">

                  <Legend
                    className="bg-slate-800 border-slate-800"
                    text="Current question"
                  />

                  <Legend
                    className="bg-emerald-50 border-emerald-300"
                    text="Answered"
                  />

                  <Legend
                    className="bg-amber-50 border-amber-300"
                    text="Marked for review"
                  />

                </div>

              </div>

              {/* =================================================
                  CAMERA PREVIEW
              ================================================= */}

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Camera
                      size={17}
                      className="text-slate-700"
                    />

                    <span className="font-semibold text-sm text-slate-800">
                      Camera Preview
                    </span>

                  </div>

                  <div className="flex items-center gap-1.5">

                    {cameraStatus === 'live' ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />

                        <span className="text-xs text-emerald-600 font-medium">
                          Live
                        </span>
                      </>
                    ) : cameraStatus ===
                      'starting' ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />

                        <span className="text-xs text-amber-600 font-medium">
                          Starting
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />

                        <span className="text-xs text-red-600 font-medium">
                          Off
                        </span>
                      </>
                    )}

                  </div>

                </div>

                {/* VIDEO */}
                <div className="mt-3 relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-200">

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* CAMERA STARTING */}
                  {cameraStatus === 'starting' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white">

                      <RefreshCw
                        size={28}
                        className="animate-spin text-slate-300"
                      />

                      <p className="text-xs mt-3 text-slate-300">
                        Starting camera...
                      </p>

                    </div>
                  )}

                  {/* CAMERA ERROR */}
                  {cameraStatus === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-center p-4">

                      <CameraOff
                        size={30}
                        className="text-red-400"
                      />

                      <p className="text-xs text-red-300 mt-3">
                        Camera unavailable
                      </p>

                      <button
                        type="button"
                        onClick={startCamera}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-white text-slate-800 text-xs font-semibold hover:bg-slate-100"
                      >
                        Retry Camera
                      </button>

                    </div>
                  )}

                  {/* CAMERA ON BADGE */}
                  {cameraStatus === 'live' && (
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] flex items-center gap-1.5">

                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />

                      Camera On

                    </div>
                  )}

                </div>

                {cameraStatus === 'live' ? (
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                   
                  </p>
                ) : cameraError ? (
                  <p className="text-xs text-red-500 mt-2 leading-relaxed">
                    {cameraError}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">
                    Camera permission is required for this
                    assessment.
                  </p>
                )}

              </div>

              {/* SECURITY CARD */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">

                <div className="flex items-center gap-2">

                  <ShieldAlert
                    size={17}
                    className="text-slate-600"
                  />

                  <span className="font-semibold text-sm text-slate-800">
                    Assessment Monitoring
                  </span>

                </div>

                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Tab switching and fullscreen exits may
                  be recorded.
                </p>

                <div className="mt-3 flex items-center justify-between text-xs">

                  <span className="text-slate-500">
                    Violations
                  </span>

                  <span className="font-semibold text-slate-800">
                    {strikes}
                  </span>

                </div>

              </div>

              {/* FULLSCREEN */}
              <button
                type="button"
                onClick={
                  isFullscreen
                    ? leaveFullscreen
                    : requestFullscreen
                }
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                {isFullscreen ? (
                  <>
                    <Minimize size={16} />
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize size={16} />
                    Enter Fullscreen
                  </>
                )}
              </button>

              {/* SUBMIT */}
              <button
                type="button"
                onClick={() =>
                  setShowSubmitPanel(true)
                }
                className="w-full py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition flex items-center justify-center gap-2"
              >
                <Send size={16} />
                Submit Test
              </button>

            </div>

          </aside>

        </div>

        {/* ERROR */}
        {err && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex gap-2">

            <AlertTriangle
              size={17}
              className="shrink-0"
            />

            <span>{err}</span>

          </div>
        )}

      </main>

      {/* =====================================================
          SUBMIT REVIEW MODAL
      ===================================================== */}

      {showSubmitPanel && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 grid place-items-center">

          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">

            <div className="flex items-start gap-3">

              <div className="w-10 h-10 rounded-xl bg-slate-100 grid place-items-center shrink-0">

                <Send
                  size={19}
                  className="text-slate-700"
                />

              </div>

              <div>

                <h2 className="font-bold text-lg text-slate-900">
                  Submit Test?
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Please review your progress before submitting.
                </p>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">

              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">

                <p className="text-xs text-emerald-700">
                  Answered
                </p>

                <p className="text-xl font-bold text-emerald-800 mt-1">
                  {answeredCount}
                </p>

              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">

                <p className="text-xs text-amber-700">
                  Unanswered
                </p>

                <p className="text-xl font-bold text-amber-800 mt-1">
                  {unansweredCount}
                </p>

              </div>

            </div>

            {unansweredCount > 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex gap-2">

                <AlertTriangle
                  size={17}
                  className="shrink-0 mt-0.5"
                />

                <span>
                  You still have {unansweredCount}{' '}
                  unanswered question
                  {unansweredCount !== 1
                    ? 's'
                    : ''}
                  .
                </span>

              </div>
            )}

            {markedCount > 0 && (
              <p className="text-xs text-slate-500 mt-3">
                {markedCount} question
                {markedCount !== 1
                  ? 's are'
                  : ' is'}{' '}
                marked for review.
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">

              <button
                type="button"
                onClick={() =>
                  setShowSubmitPanel(false)
                }
                disabled={busy.current}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                Continue Test
              </button>

              <button
                type="button"
                onClick={() => submit(false)}
                disabled={
                  busy.current || left <= 0
                }
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Send size={16} />
                Confirm Submit
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

// ============================================================
// INSTRUCTION COMPONENT
// ============================================================

function Instruction({
  icon,
  title,
  text,
}) {
  return (
    <div className="flex gap-3">

      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0">
        {icon}
      </div>

      <div>

        <h3 className="text-sm font-semibold text-slate-800">
          {title}
        </h3>

        <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
          {text}
        </p>

      </div>

    </div>
  );
}

// ============================================================
// QUESTION NAVIGATION GRID
// ============================================================

function QuestionGrid({
  questions,
  answers,
  marked,
  activeQuestion,
  onSelect,
}) {
  return (
    <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">

      {questions.map(
        (question, index) => {

          const answered =
            answers[question._id] !==
              undefined &&
            answers[question._id] !==
              null &&
            answers[question._id] !== '';

          const isActive =
            index === activeQuestion;

          const isMarked = Boolean(
            marked[question._id]
          );

          let className =
            'w-full aspect-square rounded-lg border text-xs font-semibold transition relative ';

          if (isActive) {
            className +=
              'bg-slate-800 text-white border-slate-800 ';
          } else if (isMarked) {
            className +=
              'bg-amber-50 text-amber-800 border-amber-300 ';
          } else if (answered) {
            className +=
              'bg-emerald-50 text-emerald-800 border-emerald-300 ';
          } else {
            className +=
              'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-400 ';
          }

          return (
            <button
              key={question._id}
              type="button"
              onClick={() =>
                onSelect(index)
              }
              className={className}
            >
              {index + 1}

              {isMarked &&
                !isActive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                )}
            </button>
          );
        }
      )}

    </div>
  );
}

// ============================================================
// LEGEND
// ============================================================

function Legend({
  className,
  text,
}) {
  return (
    <div className="flex items-center gap-2">

      <span
        className={`w-3 h-3 rounded-sm border ${className}`}
      />

      <span>{text}</span>

    </div>
  );
}