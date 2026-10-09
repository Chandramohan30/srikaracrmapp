import React from 'react';
import { InstallmentStatus, StudentPaymentStatus, StudentStatus, LeaveStatus } from '../types/crm';

export const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  // Check if has decimals
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  }).format(amount);
};

export const DueBadge: React.FC<{ amount: number; className?: string }> = ({ amount, className = '' }) => {
  if (amount <= 0) {
    return (
      <span className={`inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 tabular-nums ${className}`}>
        No Dues
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-0.5 tabular-nums ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
      {formatCurrency(amount)} DUE
    </span>
  );
};

export const InstallmentStatusBadge: React.FC<{ status: InstallmentStatus }> = ({ status }) => {
  switch (status) {
    case 'paid':
      return (
        <span className="inline-flex items-center text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
          Paid
        </span>
      );
    case 'partially_paid':
      return (
        <span className="inline-flex items-center text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
          Partially Paid
        </span>
      );
    case 'overdue':
      return (
        <span className="inline-flex items-center text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded px-2 py-0.5">
          Overdue
        </span>
      );
    case 'pending':
    default:
      return (
        <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded px-2 py-0.5">
          Pending
        </span>
      );
  }
};

export const StudentPaymentStatusBadge: React.FC<{ status: StudentPaymentStatus }> = ({ status }) => {
  switch (status) {
    case 'fully_paid':
    case 'paid':
      return (
        <span className="inline-flex items-center text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-0.5">
          Fully Paid
        </span>
      );
    case 'partially_paid':
      return (
        <span className="inline-flex items-center text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-0.5">
          Partially Paid
        </span>
      );
    case 'has_due':
      return (
        <span className="inline-flex items-center text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded px-2.5 py-0.5">
          Has Due
        </span>
      );
    case 'not_paid':
    default:
      return (
        <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded px-2.5 py-0.5">
          Not Paid
        </span>
      );
  }
};

export const StudentStatusBadge: React.FC<{ status: StudentStatus }> = ({ status }) => {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded px-2.5 py-0.5">
          Active
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-0.5">
          Completed
        </span>
      );
    case 'on_hold':
      return (
        <span className="inline-flex items-center text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-0.5">
          On Hold
        </span>
      );
    case 'dropped':
      return (
        <span className="inline-flex items-center text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded px-2.5 py-0.5">
          Dropped
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded px-2.5 py-0.5">
          Cancelled
        </span>
      );
    case 'onboarding':
      return (
        <span className="inline-flex items-center text-xs font-medium text-purple-800 bg-purple-50 border border-purple-200 rounded px-2.5 py-0.5">
          Onboarding
        </span>
      );
    case 'lead':
    default:
      return (
        <span className="inline-flex items-center text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded px-2.5 py-0.5">
          Lead
        </span>
      );
  }
};

export const LeaveStatusBadge: React.FC<{ status: LeaveStatus }> = ({ status }) => {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-0.5">
          Approved
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded px-2.5 py-0.5">
          Rejected
        </span>
      );
    case 'pending':
    default:
      return (
        <span className="inline-flex items-center text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-0.5">
          Pending
        </span>
      );
  }
};
