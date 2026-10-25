import React, { useState } from 'react';
import { UserFeedbackReport } from '../../types';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onSubmit: (report: UserFeedbackReport) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  onSubmit,
}) => {
  const [type, setType] = useState<UserFeedbackReport['type']>('incorrect_match');
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    const report: UserFeedbackReport = {
      id: `report-${Date.now()}`,
      productId,
      productName,
      type,
      comment: comment.trim(),
      userEmail: email.trim() || undefined,
      timestamp: new Date().toISOString(),
    };

    onSubmit(report);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setComment('');
      onClose();
    }, 1400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-dialog-title"
    >
      <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-900 font-semibold text-base" id="feedback-dialog-title">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Report Issue or Correction
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center flex flex-col items-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-900">Thank you for reporting</h3>
            <p className="text-sm text-slate-600">
              Your feedback helps refine verification datasets and prevents misleading results.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                Target Product
              </label>
              <div className="text-sm font-semibold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {productName}
              </div>
            </div>

            <div>
              <label htmlFor="issue-type-select" className="block text-xs font-medium text-slate-700 mb-1">
                What seems inaccurate?
              </label>
              <select
                id="issue-type-select"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-sm rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="incorrect_match">Wrong Product Model / Candidate Match</option>
                <option value="inaccurate_specs">Inaccurate or Misleading Specifications</option>
                <option value="outdated_price">Outdated or Incorrect Retail Price</option>
                <option value="misleading_result">Unbalanced or Misleading Score Interpretation</option>
                <option value="other">Other Data Issue</option>
              </select>
            </div>

            <div>
              <label htmlFor="issue-comment-textarea" className="block text-xs font-medium text-slate-700 mb-1">
                Details or Correction Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                id="issue-comment-textarea"
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe what is incorrect and cite a source URL or correct spec if known..."
                className="w-full text-sm rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="issue-email-input" className="block text-xs font-medium text-slate-700 mb-1">
                Your Email (Optional, for clarification)
              </label>
              <input
                id="issue-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-sm rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-xs"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
