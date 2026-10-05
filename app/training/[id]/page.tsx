import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrainingPublic } from "@/app/components/training-public";
import { loadPublicTrainingForVisitor } from "@/app/lib/training-guests";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function TrainingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const training = await loadPublicTrainingForVisitor(id);
  if (!training) notFound();
  return <TrainingPublic training={training} />;
}
