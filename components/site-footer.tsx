import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/[0.07] bg-white px-5 py-10 md:px-10 md:py-12">
      <div className="mx-auto grid max-w-[1480px] gap-10 md:grid-cols-[1.1fr_.55fr_.55fr_1fr]">
        <div>
          <div className="text-[28px] font-black tracking-[-0.085em]">MEET<span className="text-[#ff7fa9]">SET</span></div>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.18em] text-black/35">Fan Meets Real Moments</p>
        </div>
        <div className="text-xs">
          <p className="mb-3 font-bold text-black/75">Service</p>
          <div className="flex flex-col gap-2 text-black/45"><Link href="/#projects">Projects</Link><Link href="/#creators">Creators</Link><Link href="/#about">About</Link></div>
        </div>
        <div className="text-xs">
          <p className="mb-3 font-bold text-black/75">Support</p>
          <div className="flex flex-col gap-2 text-black/45"><span>공지사항</span><span>이용약관</span><span>개인정보처리방침</span><span>FAQ</span></div>
        </div>
        <div className="text-xs">
          <p className="mb-3 font-bold text-black/75">J&COMPANY</p>
          <div className="space-y-1.5 leading-5 text-black/42"><p>제이앤컴퍼니</p><p>사업자등록번호 · 통신판매업신고번호 · 대표자 · 주소는 론칭 전 실제 정보로 교체</p><p>contact@meetset.kr</p></div>
        </div>
      </div>
      <div className="mx-auto mt-9 flex max-w-[1480px] flex-col gap-2 border-t border-black/[0.06] pt-5 text-[10px] text-black/32 md:flex-row md:items-center md:justify-between">
        <span>© 2026 MEETSET. Operated by J&Company. All rights reserved.</span>
        <span>Instagram · X · YouTube · TikTok</span>
      </div>
    </footer>
  );
}
