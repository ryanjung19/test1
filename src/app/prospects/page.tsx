import { ModulePage } from "@/components/module-page";

export default function ProspectsPage() {
  return (
    <ModulePage
      eyebrow="LEAD FINDER"
      title="영역별 대관후보를 수집하고 검토합니다."
      description="행사대행사, 브랜드 마케팅, 촬영·프로덕션, 팝업, 기업행사 등 영역별 후보를 먼저 prospects에 적재한 뒤 검토된 대상만 CRM 리드로 전환합니다."
      items={[
        { title: "후보 수집", description: "웹·SNS·기존 데이터 등에서 발견된 후보와 출처 근거를 저장합니다.", state: "SCHEMA READY" },
        { title: "적합도 검토", description: "segment, fit score, rationale, evidence를 기준으로 영업대상 여부를 판정합니다.", state: "SCHEMA READY" },
        { title: "중복 방지", description: "dedupe key를 두어 동일 업체가 반복 적재되는 문제를 줄입니다.", state: "SCHEMA READY" },
        { title: "CRM 전환", description: "승인된 후보만 실제 leads 파이프라인으로 이동시키는 흐름을 연결합니다.", state: "NEXT" },
      ]}
    />
  );
}
