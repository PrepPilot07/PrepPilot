/**
 * WhatsApp message templates for PrepPilot.
 * All functions return a plain string — no Twilio-specific types here.
 */

import { PracticeQuestion } from '../practiceContent';

export interface BundleQuestion {
  dayNumber: number;
  topic: string;
  questionText: string;
  difficulty: string;
}

/**
 * Single daily question message (kept for backward compatibility).
 */
export function dailyQuestionMessage(
  name: string,
  dayNumber: number,
  topic: string,
  questionText: string,
  difficulty: string
): string {
  const diffEmoji =
    difficulty === 'easy' ? '🟢' : difficulty === 'hard' ? '🔴' : '🟡';

  return [
    `🎯 *PrepPilot — Day ${dayNumber}*`,
    `Hi ${name}! Time for today's practice.`,
    ``,
    `📌 *Topic:* ${topic}`,
    `${diffEmoji} *Difficulty:* ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`,
    ``,
    `*Question:*`,
    questionText,
    ``,
    `Open PrepPilot to submit your answer and track your progress: ${process.env.FRONTEND_ORIGIN || 'https://preppilot.com'} 💪`,
  ].join('\n');
}

/**
 * Bundled message: all N daily questions in one WhatsApp message.
 * Used when DAILY_QUESTION_COUNT > 1.
 */
export function dailyBundleMessage(name: string, questions: BundleQuestion[]): string {
  const lines: string[] = [
    `🎯 *PrepPilot — ${questions.length} Questions for Today*`,
    `Hi ${name}! Here's your daily prep batch. Take your time with each one. 💪`,
    ``,
  ];

  questions.forEach((q, i) => {
    const diffEmoji =
      q.difficulty === 'easy' ? '🟢' : q.difficulty === 'hard' ? '🔴' : '🟡';
    lines.push(`*Q${i + 1} — Day ${q.dayNumber} | ${q.topic}* ${diffEmoji}`);
    lines.push(q.questionText);
    if (i < questions.length - 1) lines.push('');
  });

  const appUrl = process.env.FRONTEND_ORIGIN || 'https://preppilot.com';
  lines.push('');
  lines.push(`📲 Open PrepPilot to submit your answers and track your progress: ${appUrl}`);

  return lines.join('\n');
}

/**
 * Bundled message: 2-3 ACTUAL practice questions for a SINGLE day.
 */
export function dailyPracticeSetMessage(
  name: string,
  dayNumber: number,
  topic: string,
  questions: PracticeQuestion[]
): string {
  const lines: string[] = [
    `🎯 *PrepPilot — Day ${dayNumber}*`,
    `Hi ${name}! Here are your practice questions for today. 💪`,
    ``,
    `📌 *Topic:* ${topic}`,
    ``,
  ];

  const maxQuestions = Math.min(3, questions.length);
  for (let i = 0; i < maxQuestions; i++) {
    const q = questions[i];
    const diffEmoji = q.difficulty === 'easy' ? '🟢' : q.difficulty === 'hard' ? '🔴' : '🟡';
    lines.push(`*Q${i + 1}* ${diffEmoji}`);
    lines.push(q.text);
    if (i < maxQuestions - 1) lines.push('');
  }

  const appUrl = process.env.FRONTEND_ORIGIN || 'https://preppilot.com';
  lines.push('');
  lines.push(`📲 Open PrepPilot to submit your answers and track your progress: ${appUrl}`);

  return lines.join('\n');
}

export function allDoneMessage(name: string): string {
  return [
    `🏆 *PrepPilot — You did it!*`,
    `Hi ${name}! You've completed all days in your prep roadmap.`,
    ``,
    `Head back to PrepPilot to review your progress or start a new plan. 🎉`,
  ].join('\n');
}

export function streakMessage(name: string, streakDays: number): string {
  return [
    `🔥 *${streakDays}-day streak!*`,
    `Hi ${name}! You've practiced ${streakDays} days in a row.`,
    `Keep it up — consistency is what separates good candidates from great ones.`,
  ].join('\n');
}
