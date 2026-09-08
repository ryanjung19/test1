import Link from "next/link";
import { notFound } from "next/navigation";
import { consentDocument } from "@/lib/consent/documents";

export default async function LegalPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (type !== "terms" && type !== "privacy") notFound();
  const document = consentDocument(type);
  return <main className="legal-page"><Link href="/account">← 내 계정</Link><h1>{document.title}</h1><p>상용 서비스용 최종 문서가 아닙니다.</p><p>{document.text}</p><small>버전 {document.version}</small></main>;
}
