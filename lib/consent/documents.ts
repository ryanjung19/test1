import { createHash } from "node:crypto";

export const documents = {
  terms: {
    title: "서비스 이용약관 초안",
    version: "2026-09-08-draft-1",
    text: "StockPulse는 가격·거래량의 움직임과 관련 정보를 제공하는 구독형 서비스입니다. DEMO로 표시된 데이터는 실제 시세가 아닙니다. 제공 정보는 매수·매도 권유가 아닙니다. 현재 유료 결제는 개시되지 않았습니다. 실제 판매 전 사업자 정보, 요금, 청약철회·환불 기준, 서비스 제공 조건을 확정하여 새로운 약관으로 안내합니다.",
  },
  privacy: {
    title: "개인정보 처리 안내 초안",
    version: "2026-09-08-draft-1",
    text: "계정 인증과 서비스 제공을 위해 계정 식별자와 알림 설정을 처리합니다. Push를 등록하면 해당 기기의 수신 주소와 암호화 공개정보를 보관합니다. 회원 탈퇴 시 운영 데이터를 삭제하며, 보존 의무가 있는 계약·결제·환불·분쟁 증빙은 제한된 별도 보관 영역에 남습니다. 상용 서비스 개시 전 운영자, 처리위탁·국외이전, 보존기간 및 문의처를 확정해 다시 안내합니다.",
  },
} as const;

export function consentDocument(type: string) {
  if (type !== "terms" && type !== "privacy") throw new TypeError("Unknown document");
  const document = documents[type];
  return { ...document, type, hash: createHash("sha256").update(document.text, "utf8").digest("hex") };
}
