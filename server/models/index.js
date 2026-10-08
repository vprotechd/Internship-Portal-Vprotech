import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const domainSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
domainSchema.index({ isActive: 1 });
export const Domain = model('Domain', domainSchema);

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  collegeName: { type: String, trim: true, maxlength: 150, default: '' },
  domainId: { type: Schema.Types.ObjectId, ref: 'Domain', index: true, default: null },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
}, { timestamps: true });
userSchema.index({ createdAt: -1 });
export const User = model('User', userSchema);

const questionSchema = new Schema({
  questionText: { type: String, required: true, trim: true, maxlength: 10000 },
  options: { type: [String], default: [] },
  correctOption: { type: Number, min: 0 },
  questionType: { type: String, enum: ['mcq', 'coding'], default: 'mcq' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  marks: { type: Number, min: 0, default: 1 },
  instructions: { type: String, trim: true, maxlength: 5000, default: '' },
}, { timestamps: true });
questionSchema.index({ createdAt: -1 });
export const Question = model('Question', questionSchema);

const testSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 5000, default: '' },
  domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true, index: true },
  durationMinutes: { type: Number, required: true, min: 1, max: 1440 },
  passingMarks: { type: Number, min: 0, default: 0 },
  questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  isActive: { type: Boolean, default: true, index: true },
  isReleased: { type: Boolean, default: false, index: true },
}, { timestamps: true });
testSchema.index({ domainId: 1, isActive: 1, isReleased: 1 });
export const Test = model('Test', testSchema);

const submissionSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
  answers: { type: Map, of: Schema.Types.Mixed, default: {} },
  score: { type: Number, default: 0 },
  manualScore: { type: Number, default: 0 },
  reviewed: { type: Boolean, default: false },
  tabSwitchCount: { type: Number, default: 0 },
  status: { type: String, enum: ['in-progress', 'submitted', 'auto-submitted'], default: 'in-progress' },
  startedAt: { type: Date, default: Date.now },
  deadline: { type: Date, required: true },
  submittedAt: Date,
}, { timestamps: true });
submissionSchema.index({ studentId: 1, testId: 1 }, { unique: true });
submissionSchema.index({ studentId: 1, status: 1 });
submissionSchema.index({ testId: 1, status: 1, submittedAt: -1 });
submissionSchema.index({ status: 1, submittedAt: -1 });
export const Submission = model('Submission', submissionSchema);
