import { redirect } from "next/navigation";

import { customerPortalUrl } from "@/lib/auth/customer-portal";
import {
  confirmTossPaymentIntent,
  getTossPaymentIntentContext,
  TossPaymentError,
} from "@/lib/payments/toss-flow";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    intentId?: string;
    paymentKey?: string;
    orderId?: string;
    amount?: string;
  }>;
};

export default async function TossSuccessPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const amount = Number(query.amount);

  if (!query.intentId || !query.paymentKey || !query.orderId || !Number.isInteger(amount)) {
    return <main style={{ padding: 32 }}><h1>결제 승인 정보가 올바르지 않습니다.</h1></main>;
  }

  let result: Awaited<ReturnType<typeof confirmTossPaymentIntent>>;
  try {
    result = await confirmTossPaymentIntent({
      intentId: query.intentId,
      paymentKey: query.paymentKey,
      orderId: query.orderId,
      amount,
    });
  } catch (error) {
    console.error(error);
    const context = await getTossPaymentIntentContext(query.intentId);
    const returnUrl = context ? customerPortalUrl(context.bookingId) : null;
    const message = error instanceof TossPaymentError ? error.code : "internal_error";
    return (
      <main style={{ padding: 32, fontFamily: "sans-serif" }}>
        <h1>결제 승인을 완료하지 못했습니다.</h1>
        <p>{message}</p>
        {returnUrl ? <a href={`${returnUrl}&payment=confirm_failed`}>예약 상세로 돌아가기</a> : null}
      </main>
    );
  }

  const returnUrl = customerPortalUrl(result.bookingId);
  if (!returnUrl) {
    return <main style={{ padding: 32 }}><h1>결제는 완료되었지만 예약 링크를 생성할 수 없습니다.</h1></main>;
  }

  redirect(`${returnUrl}&payment=success`);
}
