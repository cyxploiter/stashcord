"use client";

import { useState, useEffect } from "react";

interface HydrationBoundaryProps {
     children: React.ReactNode;
     fallback?: React.ReactNode;
}

export default function HydrationBoundary({
     children,
     fallback = <div className="flex min-h-screen items-center justify-center bg-background"><div className="text-xl text-foreground">Loading...</div></div>
}: HydrationBoundaryProps) {
     const [isHydrated, setIsHydrated] = useState(false);

     useEffect(() => {
          setIsHydrated(true);
     }, []);

     if (!isHydrated) {
          return <>{fallback}</>;
     }

     return <>{children}</>;
}
