'use client';

import { useParams } from 'next/navigation';
import VideoPageContent from '@/components/pages/student/VideoPageContent';

export default function ClasePage() {
  const params = useParams();
  const cursoId = params.id as string;
  const evalId = params.evalId as string;
  const eventId = params.eventId as string;

  return <VideoPageContent cursoId={cursoId} evalId={evalId} eventId={eventId} />;
}
