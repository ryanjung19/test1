type TossConfirmInput = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

export async function confirmTossPayment(input: TossConfirmInput) {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) throw new Error("TOSS_SECRET_KEY is not configured.");

  const authorization = Buffer.from(`${secretKey}:`).toString("base64");
  const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || "Toss payment confirmation failed.");
  }

  return payload;
}
