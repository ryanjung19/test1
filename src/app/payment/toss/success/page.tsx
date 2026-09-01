import { redirect } from "next/navigation";

import { customerPortalUrl } from "@/lib/auth/customer-portal";
import {
  confirmTossPaymentIntent,
  TossPaymentError,
} from "@/lib/payments/toss-flow";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    intentId?: string;
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    state?: string;
  }>;
};

export default async function TossSuccessPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const amount = Number(query.amount);

  if (!query.intentId || !query.paymentKey || !query.orderId || !query.state || !Number.isInteger(amount)) {
    return <main style={{ padding: 32 }}><h1>결제 승인 정보가 올바르지 않습니다.</h1></main>;
  }

  let result: Awaited<ReturnType<typeof confirmTossPaymentIntent>>;
  try {
    result = await confirmTossPaymentIntent({
      intentId: query.intentId,
      callbackState: query.state,
      paymentKey: query.paymentKey,
      orderId: query.orderId,
      amount,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof TossPaymentError ? error.code : "internal_error";
    return (
      <main style={{ padding: 32, fontFamily: "sans-serif" }}>
        <h1>결제 승인을 완료하지 못했습니다.</h1>
        <p>{message}</p>
        <p>원래 예약 링크로 돌아가 상태를 확인해 주세요.</p>
      </main>
    );
  }

  const returnUrl = customerPortalUrl(result.bookingId);
  if (!returnUrl) {
    return <main style={{ padding: 32 }}><h1>결제는 완료되었지만 예약 링크를 생성할 수 없습니다.</h1></main>;
  }

  redirect(`${returnUrl}&payment=success`);
}
