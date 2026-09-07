import React from 'react';

export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="กำลังโหลดข้อมูล..."
      className="space-y-6 pb-12 animate-fade-in"
    >
      {/* 1. Top Header Banner Skeleton */}
      <div className="bg-slate-800 rounded-2xl p-6 shadow-md border border-slate-700 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400"></div>
              <div className="h-3.5 w-32 bg-slate-700 rounded"></div>
            </div>
            <div className="h-7 w-64 bg-slate-700 rounded-lg"></div>
            <div className="h-3 w-48 bg-slate-700/80 rounded"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-slate-700 rounded-xl"></div>
            <div className="h-9 w-32 bg-slate-700 rounded-xl"></div>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards Skeleton (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-slate-200 rounded"></div>
              <div className="w-6 h-6 rounded-md bg-slate-100"></div>
            </div>
            <div className="h-7 w-16 bg-slate-200 rounded"></div>
            <div className="h-2 w-28 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>

      {/* 3. Main Data Card / Table Skeleton */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4 animate-pulse">
        {/* Toolbar & Filter Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-slate-100 rounded-lg"></div>
            <div className="h-8 w-28 bg-slate-100 rounded-lg"></div>
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="space-y-2.5 pt-2">
          <div className="h-10 bg-slate-100 rounded-lg"></div>
          {[1, 2, 3, 4, 5, 6, 7].map((row) => (
            <div
              key={row}
              className="h-12 bg-slate-50 border border-slate-100 rounded-lg flex items-center px-4 justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-slate-200"></div>
                <div className="space-y-1">
                  <div className="h-3 w-16 bg-slate-200 rounded"></div>
                  <div className="h-2.5 w-12 bg-slate-100 rounded"></div>
                </div>
              </div>
              <div className="h-4 w-20 bg-slate-200 rounded"></div>
              <div className="h-4 w-16 bg-slate-200 rounded"></div>
              <div className="h-5 w-24 bg-slate-200 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
