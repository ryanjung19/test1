import { ModulePage } from "@/components/module-page";

export default function CrmPage() {
  return (
    <ModulePage
      eyebrow="SALES CRM"
      title="모든 인바운드·아웃바운드 접촉을 한 타임라인으로 관리합니다."
      description="전화, 이메일, 홈페이지, 기존 챗봇, 카카오채널, SNS, 광고 유입을 동일한 lead와 interaction 구조에 연결합니다."
      items={[
        { title: "리드 파이프라인", description: "new → qualified → contacted → responded → opportunity → won/lost 상태를 관리합니다.", state: "SCHEMA READY" },
        { title: "접촉 이력", description: "채널·방향·요약·외부 ID·다음 액션 시점을 interaction으로 축적합니다.", state: "SCHEMA READY" },
        { title: "다음 영업 액션", description: "nextActionAt 기준으로 재접촉 대상과 누락된 후속조치를 큐로 만들 예정입니다.", state: "NEXT" },
        { title: "인바운드 통합", description: "홈페이지 예약 모듈은 public inquiry endpoint로 들어오며 챗봇·메일·카카오 adapter를 추가합니다.", state: "IN PROGRESS" },
      ]}
    />
  );
}
