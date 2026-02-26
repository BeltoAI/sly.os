'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GetStartedRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard/deploy'); }, [router]);
  return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
