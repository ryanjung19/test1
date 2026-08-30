"use client";

import { useMemo, useState } from "react";

import { createQuoteAction } from "./actions";

type QuoteLine = {
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

const initialLines: QuoteLine[] = [
  { category: "대관", description: "공간 대관", quantity: 1, unitPrice: 0 },
];

function krw(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function QuoteEditor({ bookingId }: { bookingId: string }) {
  const [lines, setLines] = useState<QuoteLine[]>(initialLines);
  const [discount, setDiscount] = useState(0);
  const [vatRate, setVatRate] = useState(10);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    [lines],
  );
  const taxable = Math.max(subtotal - discount, 0);
  const vat = Math.round((taxable * vatRate) / 100);
  const total = taxable + vat;

  function patchLine(index: number, patch: Partial<QuoteLine>) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  }

  return (
    <form className="quote-editor" action={createQuoteAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="itemsJson" value={JSON.stringify(lines)} />

      <div className="quote-lines">
        {lines.map((line, index) => (
          <div className="quote-line" key={index}>
            <input
              aria-label="항목 분류"
              value={line.category}
              onChange={(event) => patchLine(index, { category: event.target.value })}
              placeholder="분류"
            />
            <input
              aria-label="항목 설명"
              value={line.description}
              onChange={(event) => patchLine(index, { description: event.target.value })}
              placeholder="항목 설명"
            />
            <input
              aria-label="수량"
              type="number"
              min="1"
              value={line.quantity}
              onChange={(event) =>
                patchLine(index, { quantity: Math.max(Number(event.target.value) || 1, 1) })
              }
            />
            <input
              aria-label="단가"
              type="number"
              min="0"
              step="1"
              value={line.unitPrice}
              onChange={(event) =>
                patchLine(index, { unitPrice: Math.max(Number(event.target.value) || 0, 0) })
              }
            />
            <strong>₩{krw(line.quantity * line.unitPrice)}</strong>
            <button
              className="quote-remove"
              type="button"
              disabled={lines.length === 1}
              onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <button
        className="button secondary quote-add"
        type="button"
        onClick={() =>
          setLines((current) => [
            ...current,
            { category: "옵션", description: "", quantity: 1, unitPrice: 0 },
          ])
        }
      >
        항목 추가
      </button>

      <div className="quote-settings">
        <label className="admin-field">
          <span>할인금액</span>
          <input
            name="discountAmount"
            type="number"
            min="0"
            step="1"
            value={discount}
            onChange={(event) => setDiscount(Math.max(Number(event.target.value) || 0, 0))}
          />
        </label>
        <label className="admin-field">
          <span>VAT %</span>
          <input
            name="vatRate"
            type="number"
            min="0"
            max="100"
            value={vatRate}
            onChange={(event) => setVatRate(Math.max(Number(event.target.value) || 0, 0))}
          />
        </label>
        <label className="admin-field">
          <span>견적 유효기간</span>
          <input name="validUntil" type="datetime-local" />
        </label>
        <label className="admin-field quote-notes">
          <span>메모</span>
          <input name="notes" />
        </label>
      </div>

      <div className="quote-total-box">
        <div><span>공급 예정액</span><strong>₩{krw(subtotal)}</strong></div>
        <div><span>할인</span><strong>-₩{krw(discount)}</strong></div>
        <div><span>VAT</span><strong>₩{krw(vat)}</strong></div>
        <div className="quote-grand-total"><span>TOTAL</span><strong>₩{krw(total)}</strong></div>
      </div>

      <div className="admin-form-actions">
        <button className="button primary" type="submit">새 견적 버전 저장</button>
      </div>
    </form>
  );
}
