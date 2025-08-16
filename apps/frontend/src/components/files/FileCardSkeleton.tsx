"use client";

export default function FileCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-0 shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      {/* Thumbnail Area */}
      <div className="h-32 bg-gray-200"></div>

      {/* File Info */}
      <div className="p-3">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}
