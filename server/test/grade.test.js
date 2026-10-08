import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeMcq } from '../utils/grade.js';

const qs = [
  { _id: 'a', questionType: 'mcq', correctOption: 1, marks: 2 },
  { _id: 'b', questionType: 'mcq', correctOption: 0, marks: 3 },
  { _id: 'c', questionType: 'coding', marks: 5 },
];

test('scores correct MCQs using configured marks', () => assert.equal(gradeMcq(qs, { a: 1, b: 2, c: 'code' }), 2));
test('unanswered scores zero', () => assert.equal(gradeMcq(qs, {}), 0));
test('null is not treated as option 0', () => assert.equal(gradeMcq(qs, { b: null }), 0));
test('wrong MCQ does not award marks', () => assert.equal(gradeMcq(qs, { a: 0, b: 0 }), 3));
