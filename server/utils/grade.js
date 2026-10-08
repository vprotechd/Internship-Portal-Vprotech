export const gradeMcq = (questions, answers = {}) =>
  questions.reduce((total, q) => {
    if (q.questionType !== 'mcq') return total;
    const a = answers[String(q._id)];
    return total + (a != null && Number.isInteger(Number(a)) && Number(a) === q.correctOption ? Number(q.marks || 1) : 0);
  }, 0);
