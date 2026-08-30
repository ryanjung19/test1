import { ModulePage } from "@/components/module-page";

export default function CalendarPage() {
  return (
    <ModulePage
      eyebrow="VENUE CALENDAR"
      title="B1과 1F를 날짜·시간 단위로 블록합니다."
      description="공간별 HOLD, 확정예약, 준비, 철수, 내부행사, 점검 블록을 같은 시간축에서 관리하고 중복 예약을 차단합니다."
      items={[
        { title: "B1 / 1F 개별 점유", description: "각 공간은 독립적으로 블록되며 두 공간 동시대관은 동일 예약이 두 공간을 함께 점유합니다.", state: "CORE READY" },
        { title: "충돌 방지", description: "공간별 PostgreSQL advisory transaction lock 후 겹치는 시간블록을 검사합니다.", state: "CORE READY" },
        { title: "준비·철수 시간", description: "행사 본 시간과 별도로 setup/teardown 시간을 실제 점유시간으로 반영합니다.", state: "CORE READY" },
        { title: "HOLD 자동만료", description: "holdExpiresAt 이후 블록을 해제하는 자동화 작업은 다음 단계에서 연결합니다.", state: "NEXT" },
      ]}
    />
  );
}
