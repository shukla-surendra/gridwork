import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Time Blocks was folded into the Calendar (focus blocks); keep old links working.
export default function TimeBlockRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/calendar'); }, [router]);
  return null;
}
