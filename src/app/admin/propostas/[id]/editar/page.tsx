import { notFound } from "next/navigation";
import { Metadata } from "next";
import { buscarProposta } from "@/lib/store";
import { EditarPropostaForm } from "@/components/EditarPropostaForm";

export const metadata: Metadata = { title: "Editar proposta" };
export const dynamic = "force-dynamic";

export default async function EditarPropostaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposta = await buscarProposta(id);
  if (!proposta) notFound();

  return <EditarPropostaForm proposta={proposta} />;
}
