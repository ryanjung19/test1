import { ModulePage } from "@/components/module-page";

export default function BookingsPage() {
  return (
    <ModulePage
      eyebrow="BOOKINGS"
      title="문의부터 확정·완료·취소까지 예약 상태를 관리합니다."
      description="예약 자체와 실제 공간 점유를 분리해 일정 변경, HOLD, 다중 공간 대관, 준비·철수 시간을 안전하게 처리합니다."
      items={[
        { title: "예약 상태", description: "inquiry / hold / tentative / confirmed / completed / cancelled 상태를 독립 관리합니다.", state: "SCHEMA READY" },
        { title: "공간 연결", description: "한 예약이 B1, 1F 또는 B1+1F를 동시에 점유할 수 있습니다.", state: "CORE READY" },
        { title: "견적 버전", description: "예약별 복수 견적과 세부 항목, 할인, VAT, 유효기간을 보존합니다.", state: "SCHEMA READY" },
        { title: "계약", description: "draft / sent / signed 상태 및 계약 문서 링크를 예약에 연결합니다.", state: "SCHEMA READY" },
      ]}
    />
  );
}
