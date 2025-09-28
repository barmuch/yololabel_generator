"use client";
import { useSession } from 'next-auth/react';

export function useSessionRole() {
  const { data, status } = useSession();
  const role = (data?.user as any)?.role as ('admin'|'member'|undefined);
  return { role, status };
}