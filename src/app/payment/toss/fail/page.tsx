import { redirect } from "next/navigation";

import { customerPortalUrl } from "@/lib/auth/customer-portal";
import { cancelTossPaymentIntent } from "@/lib/payments/toss-flow";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    intentId?: string;
    code?: string;
    message?: string;
  }>;
};

export default async function TossFailPage({ searchParams }: PageProps) {
  const query = await searchParams;
  if (!query.intentId) {
    return <main style={{ padding: 32 }}><h1>결제가 취소되었거나 실패했습니다.</h1></main>;
  }

  let returnUrl: string | null = null;
  try {
    const result = await cancelTossPaymentIntent({
      intentId: query.intentId,
      code: query.code,
      message: query.message,
    });
    returnUrl = customerPortalUrl(result.bookingId);
  } catch (error) {
    console.error(error);
  }

  if (returnUrl) {
    redirect(`${returnUrl}&payment=failed&code=${encodeURIComponent(query.code ?? "PAYMENT_FAILED")}`);
  }

  return (
    <main style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h1>결제가 완료되지 않았습니다.</h1>
      <p>{query.message ?? query.code ?? "결제 요청이 취소되었습니다."}</p>
    </main>
  );
}
