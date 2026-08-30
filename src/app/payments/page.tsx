import { ModulePage } from "@/components/module-page";

export default function PaymentsPage() {
  return (
    <ModulePage
      eyebrow="PAYMENTS"
      title="한 예약에 계약금·잔금·추가금·환불을 여러 건 연결합니다."
      description="현금·계좌이체·현장카드는 운영자가 기록하고, 온라인 카드는 PG webhook을 통해 자동 반영하는 구조입니다. 카드정보는 시스템에 저장하지 않습니다."
      items={[
        { title: "결제 요청", description: "deposit / interim / balance / additional 청구를 예약별로 여러 건 만들 수 있습니다.", state: "SCHEMA READY" },
        { title: "현금·계좌이체", description: "초기에는 입금 확인 후 거래를 수동 등록하고 추후 가상계좌 자동확인을 연결합니다.", state: "MODEL READY" },
        { title: "현장 카드", description: "카드단말기 승인내역을 거래로 등록하는 반자동 방식으로 시작합니다.", state: "MODEL READY" },
        { title: "온라인 카드", description: "Toss Payments 직접 연동을 우선안으로 두되 provider를 분리해 다른 PG로 교체 가능합니다.", state: "NEXT" },
      ]}
    />
  );
}
