import type { Locale } from "@/lib/i18n";

/**
 * 법률 문서 콘텐츠 (이용약관 · 개인정보처리방침).
 *
 * ⚠️ 이 문서는 표준 양식을 기반으로 작성된 초안입니다. 정식 서비스 오픈 전
 * 반드시 법률 전문가(변호사)의 검토를 거치고, 아래 [ ] 표시된 항목
 * (사업자등록번호, 대표자, 통신판매업 신고번호 등)을 실제 값으로 채워야 합니다.
 *
 * 한국어가 법적 정본이며, 영어·중국어는 이용자 편의를 위한 참고 번역입니다.
 */

export type LegalSection = {
  id?: string; // 앵커 링크용 (예: #advertiser)
  heading: string;
  body: string[];
};

export type LegalDoc = {
  title: string;
  effectiveLabel: string;
  effectiveDate: string;
  disclaimer: string;
  companyLabel: string;
  company: { label: string; value: string }[];
  sections: LegalSection[];
};

export type LegalContent = {
  backToHome: string;
  langLabel: string;
  terms: LegalDoc;
  privacy: LegalDoc;
};

const COMPANY = {
  name: "주식회사 플랜더 (Plander Inc.)",
  address: "제주특별자치도 제주시 관덕로 44, 63168",
  email: "contact@plander.io",
  bizNo: "[사업자등록번호 기입 필요]",
  ceo: "[대표자명 기입 필요]",
  mailOrder: "[통신판매업 신고번호 기입 필요]",
};

const ko: LegalContent = {
  backToHome: "홈으로",
  langLabel: "언어",
  terms: {
    title: "이용약관",
    effectiveLabel: "시행일",
    effectiveDate: "2026년 7월 13일",
    disclaimer:
      "본 약관은 루비AI 서비스 이용에 관한 회사와 회원 간의 권리·의무를 규정합니다. 서비스를 이용함으로써 본 약관에 동의한 것으로 간주됩니다.",
    companyLabel: "사업자 정보",
    company: [
      { label: "상호", value: COMPANY.name },
      { label: "대표자", value: COMPANY.ceo },
      { label: "사업자등록번호", value: COMPANY.bizNo },
      { label: "통신판매업 신고번호", value: COMPANY.mailOrder },
      { label: "주소", value: COMPANY.address },
      { label: "이메일", value: COMPANY.email },
    ],
    sections: [
      {
        heading: "제1조 (목적)",
        body: [
          "본 약관은 주식회사 플랜더(이하 '회사')가 제공하는 글로벌 체험단 마케팅 플랫폼 '루비AI'(이하 '서비스')의 이용과 관련하여, 회사와 회원 간의 권리·의무 및 책임사항, 이용 조건 및 절차 등 기본적인 사항을 규정함을 목적으로 합니다.",
        ],
      },
      {
        heading: "제2조 (정의)",
        body: [
          "1. '서비스'란 회사가 제공하는, 광고주와 인플루언서를 AI로 연결하여 체험단 마케팅 캠페인을 운영할 수 있게 하는 온라인 플랫폼을 말합니다.",
          "2. '회원'이란 본 약관에 동의하고 서비스에 가입한 자로, 역할에 따라 '광고주'와 '인플루언서'로 구분됩니다.",
          "3. '광고주'란 제품·서비스 홍보를 위해 캠페인을 등록하고 인플루언서를 모집하는 회원을 말합니다.",
          "4. '인플루언서'란 SNS 채널을 등록하고 캠페인에 응모하여 콘텐츠를 발행하는 회원을 말합니다.",
          "5. '캠페인'이란 광고주가 등록한 체험단 모집 건을 말합니다.",
        ],
      },
      {
        heading: "제3조 (약관의 효력 및 변경)",
        body: [
          "1. 본 약관은 서비스 화면에 게시하거나 기타 방법으로 회원에게 공지함으로써 효력이 발생합니다.",
          "2. 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경사유를 명시하여 최소 7일 전(회원에게 불리한 변경은 30일 전)에 공지합니다.",
          "3. 회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.",
        ],
      },
      {
        heading: "제4조 (회원가입 및 계정)",
        body: [
          "1. 이용자는 회사가 정한 가입 양식에 정보를 기입하고 본 약관에 동의함으로써 회원가입을 신청합니다.",
          "2. 광고주는 가입 시 사업자등록번호 등 사업자 정보를 제공해야 하며, 회사는 이를 검수할 수 있습니다.",
          "3. 인플루언서는 운영자의 승인 절차를 거쳐 활동할 수 있으며, 회사는 계정 인증·활동 이력·부적합 여부를 심사할 수 있습니다.",
          "4. 회원은 계정 정보를 정확하게 유지할 의무가 있으며, 계정의 관리 소홀로 발생한 손해에 대해 책임을 집니다.",
        ],
      },
      {
        heading: "제5조 (서비스의 내용)",
        body: [
          "회사는 다음의 서비스를 제공합니다.",
          "1. AI 기반 캠페인 작성 지원 및 인플루언서 매칭 추천",
          "2. 캠페인 등록·응모·선정·콘텐츠 발행 관리 기능",
          "3. 역할별 대시보드 및 통계 제공",
          "4. 기타 회사가 정하는 부가 서비스",
        ],
      },
      {
        id: "advertiser",
        heading: "제6조 (광고주의 권리와 의무)",
        body: [
          "1. 광고주는 캠페인을 등록하고 응모한 인플루언서를 선정할 권리를 가집니다.",
          "2. 광고주는 캠페인에 허위·과장 정보를 기재해서는 안 되며, 제공하기로 한 제품·서비스·포인트를 성실히 이행해야 합니다.",
          "3. 광고주는 인플루언서로부터 제공받은 개인정보 및 콘텐츠를 캠페인 목적 외로 사용할 수 없습니다.",
          "4. 광고주가 관련 법령(표시광고법, 추천·보증 심사지침 등)을 위반하여 발생한 책임은 광고주에게 있습니다.",
        ],
      },
      {
        id: "creator",
        heading: "제7조 (인플루언서의 권리와 의무)",
        body: [
          "1. 인플루언서는 캠페인에 응모하고 선정 시 약정된 제공 내역과 포인트를 받을 권리를 가집니다.",
          "2. 인플루언서는 등록한 SNS 채널 및 활동 정보를 사실대로 기재해야 하며, 허위 정보나 부정한 방법(가짜 팔로워 등)을 사용해서는 안 됩니다.",
          "3. 인플루언서는 선정된 캠페인의 미션을 성실히 수행하고, 관련 법령에 따라 유료 광고임을 표시(예: #광고, #협찬)해야 합니다.",
          "4. 정당한 사유 없이 미션을 이행하지 않을 경우, 회사는 포인트 회수·이용 제한 등의 조치를 할 수 있습니다.",
        ],
      },
      {
        heading: "제8조 (요금 및 결제)",
        body: [
          "1. 서비스의 이용 요금 및 요금제는 서비스 화면에 게시된 바에 따릅니다.",
          "2. 유료 결제는 토스페이먼츠 등 회사가 지정한 결제대행사를 통해 처리됩니다. 회사는 회원의 카드 정보 등 결제 수단 정보를 직접 저장하지 않습니다.",
          "3. 요금은 부가가치세(VAT)가 별도로 부과될 수 있습니다.",
        ],
      },
      {
        heading: "제9조 (환불 및 구독 해지)",
        body: [
          "1. 회원은 관련 법령(전자상거래법 등)에 따라 청약철회 및 환불을 요청할 수 있습니다.",
          "2. 결제 후 서비스를 이용하지 않은 경우, 결제일로부터 7일 이내에 전액 환불을 요청할 수 있습니다. 단, 이미 캠페인을 등록·운영하는 등 서비스를 실질적으로 이용한 경우 이용분을 공제할 수 있습니다.",
          "3. 환불 문의는 contact@plander.io 로 접수합니다.",
        ],
      },
      {
        heading: "제10조 (콘텐츠 및 지식재산권)",
        body: [
          "1. 인플루언서가 캠페인을 통해 제작한 콘텐츠의 저작권은 원칙적으로 인플루언서에게 귀속됩니다.",
          "2. 광고주는 캠페인 등록 시 설정한 사용 권한 범위(2차 활용·기간·매체 등) 내에서 콘텐츠를 활용할 수 있으며, 구체적 범위는 양 당사자의 합의에 따릅니다.",
          "3. 서비스 자체 및 회사가 제작한 콘텐츠·상표·로고 등에 대한 지식재산권은 회사에 귀속됩니다.",
        ],
      },
      {
        heading: "제11조 (금지행위)",
        body: [
          "회원은 다음 행위를 해서는 안 됩니다.",
          "1. 타인의 정보 도용, 허위 정보 등록",
          "2. 서비스의 정상적 운영을 방해하는 행위",
          "3. 부정한 방법으로 포인트·혜택을 취득하는 행위",
          "4. 법령 또는 공서양속에 위반되는 행위",
        ],
      },
      {
        heading: "제12조 (서비스 이용제한 및 계약해지)",
        body: [
          "1. 회사는 회원이 본 약관을 위반하거나 서비스의 정상적 운영을 방해한 경우, 사전 통지 후(긴급한 경우 사후 통지) 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.",
          "2. 회원은 언제든지 서비스 내 탈퇴 기능 또는 contact@plander.io 를 통해 이용계약을 해지할 수 있습니다.",
        ],
      },
      {
        heading: "제13조 (책임의 제한)",
        body: [
          "1. 회사는 광고주와 인플루언서 간의 거래를 중개하는 플랫폼을 제공할 뿐, 당사자 간에 발생한 분쟁이나 콘텐츠의 내용에 대해서는 책임을 지지 않습니다. 다만 회사의 고의 또는 중대한 과실이 있는 경우는 예외로 합니다.",
          "2. 회사는 천재지변, 불가항력, 회원의 귀책사유로 인한 서비스 장애에 대해 책임을 지지 않습니다.",
        ],
      },
      {
        heading: "제14조 (준거법 및 분쟁해결)",
        body: [
          "1. 본 약관은 대한민국 법률에 따라 규율되고 해석됩니다.",
          "2. 서비스 이용과 관련하여 회사와 회원 간에 분쟁이 발생한 경우, 양 당사자는 성실히 협의하여 해결하며, 협의가 이루어지지 않을 경우 민사소송법상의 관할 법원에 소를 제기할 수 있습니다.",
        ],
      },
    ],
  },
  privacy: {
    title: "개인정보처리방침",
    effectiveLabel: "시행일",
    effectiveDate: "2026년 7월 13일",
    disclaimer:
      "주식회사 플랜더(이하 '회사')는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 다음과 같이 처리합니다.",
    companyLabel: "개인정보보호책임자",
    company: [
      { label: "책임자", value: COMPANY.ceo },
      { label: "문의", value: COMPANY.email },
      { label: "상호", value: COMPANY.name },
      { label: "주소", value: COMPANY.address },
    ],
    sections: [
      {
        heading: "제1조 (수집하는 개인정보 항목)",
        body: [
          "회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.",
          "1. 공통(회원가입): 이메일, 이름·닉네임, 비밀번호(암호화 저장), 연락처(선택)",
          "2. 광고주: 회사·상호명, 사업자등록번호",
          "3. 인플루언서: 활동 지역, SNS 채널 URL·핸들·팔로워 수, 자기소개",
          "4. 결제 시: 결제대행사(토스페이먼츠)를 통한 결제 승인 정보. 카드번호 등 결제수단 정보는 회사가 직접 보관하지 않습니다.",
          "5. 자동 수집: 접속 IP, 쿠키, 서비스 이용 기록, 기기·브라우저 정보",
        ],
      },
      {
        heading: "제2조 (개인정보의 수집·이용 목적)",
        body: [
          "1. 회원 식별 및 가입·인증, 서비스 제공",
          "2. 광고주·인플루언서 매칭 및 캠페인 운영",
          "3. 요금 결제 및 정산",
          "4. 고객 문의 대응 및 공지사항 전달",
          "5. 부정 이용 방지 및 서비스 개선",
        ],
      },
      {
        heading: "제3조 (개인정보의 보유 및 이용기간)",
        body: [
          "1. 회사는 원칙적으로 회원 탈퇴 시 지체 없이 개인정보를 파기합니다.",
          "2. 다만 관계 법령에 따라 다음 정보는 명시된 기간 동안 보관합니다.",
          "- 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)",
          "- 대금결제 및 재화 공급에 관한 기록: 5년 (전자상거래법)",
          "- 소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)",
          "- 접속 로그: 3개월 (통신비밀보호법)",
        ],
      },
      {
        heading: "제4조 (개인정보의 제3자 제공)",
        body: [
          "1. 회사는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다.",
          "2. 다만 캠페인 운영 목적상, 인플루언서가 캠페인에 응모한 경우 해당 광고주에게 인플루언서의 프로필 및 채널 정보가 제공됩니다. 이는 서비스의 본질적 기능이며, 광고주는 제공받은 정보를 캠페인 목적 외로 사용할 수 없습니다.",
          "3. 법령에 근거하거나 수사기관의 적법한 요청이 있는 경우 예외로 합니다.",
        ],
      },
      {
        heading: "제5조 (개인정보 처리의 위탁)",
        body: [
          "회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.",
          "- Supabase (데이터베이스·인증·저장, 서울 리전): 회원 데이터 저장 및 인증 처리",
          "- Vercel: 서비스 호스팅 및 인프라 운영",
          "- 토스페이먼츠: 결제 처리 및 결제 정보 관리",
          "- Anthropic: AI 캠페인 작성·매칭 기능 (업종 설명 등 캠페인 관련 정보 처리)",
          "- Google: 서비스 이용 통계 및 광고 성과 측정",
        ],
      },
      {
        heading: "제6조 (정보주체의 권리와 행사방법)",
        body: [
          "1. 이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요구할 수 있습니다.",
          "2. 권리 행사는 서비스 내 설정 기능 또는 contact@plander.io 를 통해 요청할 수 있으며, 회사는 지체 없이 조치합니다.",
        ],
      },
      {
        heading: "제7조 (개인정보의 파기)",
        body: [
          "1. 회사는 개인정보 보유기간이 경과하거나 처리목적이 달성된 경우 지체 없이 개인정보를 파기합니다.",
          "2. 전자적 파일은 복구 불가능한 방법으로 삭제하며, 출력물 등은 분쇄 또는 소각합니다.",
        ],
      },
      {
        heading: "제8조 (개인정보의 안전성 확보조치)",
        body: [
          "1. 비밀번호 등 중요 정보의 암호화 저장",
          "2. 행 단위 접근 제어(RLS)를 통한 데이터 접근 최소화",
          "3. 관리자 권한 통제 및 접근 기록 관리",
        ],
      },
      {
        heading: "제9조 (쿠키 및 자동수집장치)",
        body: [
          "1. 회사는 서비스 제공 및 이용 통계 분석을 위해 쿠키를 사용할 수 있습니다.",
          "2. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 일부 서비스 이용에 제한이 있을 수 있습니다.",
        ],
      },
      {
        heading: "제10조 (개인정보보호책임자)",
        body: [
          "개인정보 처리에 관한 문의·불만·피해구제는 아래로 연락 주시기 바랍니다.",
          `이메일: ${COMPANY.email}`,
          "또한 개인정보 침해에 대한 상담은 개인정보분쟁조정위원회(1833-6972), 개인정보침해신고센터(118) 등에 문의할 수 있습니다.",
        ],
      },
    ],
  },
};

// ── 영어 (참고 번역) ──────────────────────────────────────
const en: LegalContent = {
  backToHome: "Back to home",
  langLabel: "Language",
  terms: {
    title: "Terms of Service",
    effectiveLabel: "Effective",
    effectiveDate: "July 13, 2026",
    disclaimer:
      "These terms govern the rights and obligations between the company and members regarding use of the Luby AI service. By using the service, you agree to these terms. The Korean version is the legally binding original.",
    companyLabel: "Business information",
    company: [
      { label: "Company", value: "Plander Inc." },
      { label: "Address", value: "44 Gwandeok-ro, Jeju-si, Jeju, Republic of Korea" },
      { label: "Email", value: COMPANY.email },
    ],
    sections: [
      {
        heading: "1. Purpose",
        body: [
          "These terms set out the basic rights, obligations, responsibilities, conditions and procedures between Plander Inc. ('Company') and members regarding the use of 'Luby AI' ('Service'), a global reviewer marketing platform.",
        ],
      },
      {
        heading: "2. Definitions",
        body: [
          "1. 'Service' means the online platform that AI-matches advertisers and creators to run reviewer marketing campaigns.",
          "2. 'Member' means a person who agreed to these terms and signed up, divided into 'Advertiser' and 'Creator' by role.",
          "3. 'Advertiser' means a member who registers campaigns and recruits creators to promote products or services.",
          "4. 'Creator' means a member who registers SNS channels, applies to campaigns, and publishes content.",
        ],
      },
      {
        heading: "3. Effect and amendment of terms",
        body: [
          "1. These terms take effect when posted on the service or otherwise notified to members.",
          "2. The Company may amend these terms within the bounds of applicable law, notifying members at least 7 days in advance (30 days for changes unfavorable to members).",
        ],
      },
      {
        heading: "4. Registration and accounts",
        body: [
          "1. Users apply for membership by entering required information and agreeing to these terms.",
          "2. Advertisers must provide business information including a business registration number, which the Company may review.",
          "3. Creators may operate after an operator approval process; the Company may review account verification, activity history and suitability.",
        ],
      },
      {
        heading: "5. Service content",
        body: [
          "The Company provides: (1) AI-assisted campaign drafting and creator matching, (2) campaign registration, application, selection and content publishing management, (3) role-based dashboards and analytics, (4) other services the Company defines.",
        ],
      },
      {
        id: "advertiser",
        heading: "6. Advertiser rights and obligations",
        body: [
          "1. Advertisers may register campaigns and select applying creators.",
          "2. Advertisers must not include false or exaggerated information and must faithfully deliver the promised products, services and points.",
          "3. Advertisers may not use creators' personal information or content beyond campaign purposes.",
          "4. Advertisers are responsible for liability arising from violations of applicable advertising laws.",
        ],
      },
      {
        id: "creator",
        heading: "7. Creator rights and obligations",
        body: [
          "1. Creators may apply to campaigns and, upon selection, receive the agreed offerings and points.",
          "2. Creators must provide truthful channel and activity information and must not use fraudulent methods such as fake followers.",
          "3. Creators must faithfully carry out campaign missions and disclose paid advertising as required by law (e.g., #ad, #sponsored).",
          "4. If a mission is not fulfilled without justification, the Company may reclaim points or restrict use.",
        ],
      },
      {
        heading: "8. Fees and payment",
        body: [
          "1. Fees and plans follow what is posted on the service.",
          "2. Paid transactions are processed through payment processors designated by the Company, such as Toss Payments. The Company does not directly store payment method information such as card numbers.",
          "3. VAT may be charged separately.",
        ],
      },
      {
        heading: "9. Refunds and cancellation",
        body: [
          "1. Members may request withdrawal and refund under applicable law.",
          "2. If the service has not been used after payment, a full refund may be requested within 7 days. Where the service has been substantially used, the used portion may be deducted.",
          "3. Refund inquiries: contact@plander.io.",
        ],
      },
      {
        heading: "10. Content and intellectual property",
        body: [
          "1. Copyright in content created by creators through campaigns belongs, in principle, to the creator.",
          "2. Advertisers may use content within the usage scope set at campaign registration; the specific scope follows agreement between the parties.",
          "3. IP rights in the service itself and Company-created materials, trademarks and logos belong to the Company.",
        ],
      },
      {
        heading: "11. Prohibited conduct",
        body: [
          "Members must not: (1) misappropriate others' information or register false information, (2) interfere with normal operation of the service, (3) obtain points or benefits by fraudulent means, (4) act contrary to law or public order.",
        ],
      },
      {
        heading: "12. Restriction and termination",
        body: [
          "1. The Company may restrict use or terminate the agreement, with prior notice (or subsequent notice in urgent cases), if a member violates these terms.",
          "2. Members may terminate at any time via the in-service withdrawal function or contact@plander.io.",
        ],
      },
      {
        heading: "13. Limitation of liability",
        body: [
          "1. The Company provides a platform mediating transactions between advertisers and creators and is not liable for disputes between parties or content, except in cases of the Company's intent or gross negligence.",
          "2. The Company is not liable for service disruptions due to force majeure or a member's fault.",
        ],
      },
      {
        heading: "14. Governing law and disputes",
        body: [
          "1. These terms are governed by and construed under the laws of the Republic of Korea.",
          "2. Disputes shall be resolved through good-faith negotiation; failing that, either party may file suit in the court of competent jurisdiction under Korean civil procedure.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    effectiveLabel: "Effective",
    effectiveDate: "July 13, 2026",
    disclaimer:
      "Plander Inc. ('Company') complies with the Personal Information Protection Act and related laws and processes users' personal information as follows. The Korean version is the legally binding original.",
    companyLabel: "Privacy officer",
    company: [
      { label: "Contact", value: COMPANY.email },
      { label: "Company", value: "Plander Inc." },
      { label: "Address", value: "44 Gwandeok-ro, Jeju-si, Jeju, Republic of Korea" },
    ],
    sections: [
      {
        heading: "1. Information collected",
        body: [
          "1. Common (sign-up): email, name/nickname, password (stored encrypted), phone (optional)",
          "2. Advertiser: company name, business registration number",
          "3. Creator: activity region, SNS channel URL/handle/follower count, bio",
          "4. Payment: payment approval information via the payment processor (Toss Payments). Card numbers and other payment credentials are not stored by the Company.",
          "5. Automatically collected: access IP, cookies, usage logs, device/browser information",
        ],
      },
      {
        heading: "2. Purpose of collection and use",
        body: [
          "(1) Member identification, sign-up/authentication and service provision; (2) advertiser–creator matching and campaign operation; (3) payment and settlement; (4) customer support and notices; (5) fraud prevention and service improvement.",
        ],
      },
      {
        heading: "3. Retention period",
        body: [
          "1. In principle, personal information is destroyed without delay upon membership withdrawal.",
          "2. However, the following are retained per law: records on contracts/withdrawal of offer — 5 years; records on payment and supply of goods — 5 years; records on consumer complaints/disputes — 3 years; access logs — 3 months.",
        ],
      },
      {
        heading: "4. Provision to third parties",
        body: [
          "1. The Company does not, in principle, provide personal information to third parties.",
          "2. However, for campaign operation, when a creator applies to a campaign, the creator's profile and channel information are provided to that advertiser. This is an essential function of the service, and advertisers may not use such information beyond campaign purposes.",
          "3. Exceptions apply where required by law or lawful request from investigative authorities.",
        ],
      },
      {
        heading: "5. Consignment of processing",
        body: [
          "The Company consigns processing as follows: Supabase (database/auth/storage, Seoul region) — member data storage and authentication; Vercel — hosting and infrastructure; Toss Payments — payment processing; Anthropic — AI campaign drafting/matching; Google — usage analytics and ad performance measurement.",
        ],
      },
      {
        heading: "6. Rights of data subjects",
        body: [
          "1. Users may request access, correction, deletion or suspension of processing of their personal information at any time.",
          "2. Requests may be made via in-service settings or contact@plander.io; the Company acts without delay.",
        ],
      },
      {
        heading: "7. Destruction of personal information",
        body: [
          "Personal information is destroyed without delay once the retention period elapses or the purpose is achieved. Electronic files are deleted irrecoverably; printouts are shredded or incinerated.",
        ],
      },
      {
        heading: "8. Security measures",
        body: [
          "(1) Encrypted storage of sensitive information such as passwords; (2) minimized data access via row-level security (RLS); (3) admin privilege control and access logging.",
        ],
      },
      {
        heading: "9. Cookies",
        body: [
          "The Company may use cookies for service provision and usage analytics. Users may refuse cookie storage via browser settings, which may limit some service features.",
        ],
      },
      {
        heading: "10. Privacy officer",
        body: [
          "For inquiries, complaints or remedies regarding personal information processing, contact:",
          `Email: ${COMPANY.email}`,
        ],
      },
    ],
  },
};

// ── 중국어 (참고 번역) ────────────────────────────────────
const zh: LegalContent = {
  backToHome: "返回首页",
  langLabel: "语言",
  terms: {
    title: "服务条款",
    effectiveLabel: "生效日",
    effectiveDate: "2026年7月13日",
    disclaimer:
      "本条款规定了公司与会员之间关于使用 Luby AI 服务的权利与义务。使用本服务即视为同意本条款。韩文版为具有法律约束力的正式文本。",
    companyLabel: "企业信息",
    company: [
      { label: "公司", value: "Plander Inc.（株式会社 Plander）" },
      { label: "地址", value: "韩国济州特别自治道济州市观德路44号" },
      { label: "邮箱", value: COMPANY.email },
    ],
    sections: [
      {
        heading: "第1条（目的）",
        body: [
          "本条款旨在规定 Plander Inc.（以下称「公司」）提供的全球体验官营销平台「Luby AI」（以下称「服务」）使用相关的公司与会员之间的权利、义务、责任及使用条件与程序等基本事项。",
        ],
      },
      {
        heading: "第2条（定义）",
        body: [
          "1. 「服务」指通过 AI 连接广告主与达人、运营体验官营销活动的在线平台。",
          "2. 「会员」指同意本条款并注册的用户，按角色分为「广告主」与「达人」。",
          "3. 「广告主」指为推广产品·服务而登记活动并招募达人的会员。",
          "4. 「达人」指登记 SNS 渠道、报名活动并发布内容的会员。",
        ],
      },
      {
        heading: "第3条（条款的效力与变更）",
        body: [
          "1. 本条款经在服务页面公示或以其他方式通知会员后生效。",
          "2. 公司可在不违反相关法律的范围内变更本条款，并至少提前7日（对会员不利的变更提前30日）公示。",
        ],
      },
      {
        heading: "第4条（注册与账户）",
        body: [
          "1. 用户填写注册信息并同意本条款后申请注册。",
          "2. 广告主注册时须提供营业执照号等企业信息，公司可进行审核。",
          "3. 达人须经运营审批后方可活动，公司可审查账号认证、活动履历及适合性。",
        ],
      },
      {
        heading: "第5条（服务内容）",
        body: [
          "公司提供：（1）基于 AI 的活动撰写支持与达人匹配推荐；（2）活动登记·报名·选定·内容发布管理；（3）分角色仪表盘与统计；（4）公司规定的其他附加服务。",
        ],
      },
      {
        id: "advertiser",
        heading: "第6条（广告主的权利与义务）",
        body: [
          "1. 广告主有权登记活动并选定报名的达人。",
          "2. 广告主不得填写虚假·夸大信息，并须诚实履行承诺提供的产品·服务·积分。",
          "3. 广告主不得将从达人处获得的个人信息及内容用于活动目的之外。",
          "4. 广告主因违反相关广告法律产生的责任由其自行承担。",
        ],
      },
      {
        id: "creator",
        heading: "第7条（达人的权利与义务）",
        body: [
          "1. 达人有权报名活动，并在被选定时获得约定的提供内容与积分。",
          "2. 达人须如实填写渠道及活动信息，不得使用虚假信息或不正当手段（如虚假粉丝）。",
          "3. 达人须诚实完成活动任务，并依法标注付费广告（如 #广告、#赞助）。",
          "4. 无正当理由未履行任务的，公司可回收积分或限制使用。",
        ],
      },
      {
        heading: "第8条（费用与支付）",
        body: [
          "1. 服务费用及方案以服务页面公示为准。",
          "2. 付费交易通过公司指定的支付服务商（如 Toss Payments）处理。公司不直接保存卡号等支付方式信息。",
          "3. 费用可能另行加收增值税（VAT）。",
        ],
      },
      {
        heading: "第9条（退款与解约）",
        body: [
          "1. 会员可依相关法律申请撤回要约及退款。",
          "2. 支付后未使用服务的，可在7日内申请全额退款；若已实质使用服务，可扣除已使用部分。",
          "3. 退款咨询：contact@plander.io。",
        ],
      },
      {
        heading: "第10条（内容与知识产权）",
        body: [
          "1. 达人通过活动创作的内容著作权原则上归属达人。",
          "2. 广告主可在活动登记时设定的使用权限范围内使用内容，具体范围以双方约定为准。",
          "3. 服务本身及公司制作的内容·商标·标识等知识产权归公司所有。",
        ],
      },
      {
        heading: "第11条（禁止行为）",
        body: [
          "会员不得：（1）盗用他人信息或登记虚假信息；（2）妨碍服务正常运营；（3）以不正当手段获取积分·权益；（4）从事违反法律或公序良俗的行为。",
        ],
      },
      {
        heading: "第12条（使用限制与解约）",
        body: [
          "1. 会员违反本条款时，公司可在事先通知（紧急情况下事后通知）后限制使用或解除合同。",
          "2. 会员可随时通过服务内注销功能或 contact@plander.io 解除使用合同。",
        ],
      },
      {
        heading: "第13条（责任限制）",
        body: [
          "1. 公司仅提供中介广告主与达人交易的平台，对当事人间纠纷或内容不承担责任，但公司存在故意或重大过失的除外。",
          "2. 公司对因不可抗力或会员过错导致的服务故障不承担责任。",
        ],
      },
      {
        heading: "第14条（准据法与争议解决）",
        body: [
          "1. 本条款依大韩民国法律规范并解释。",
          "2. 发生争议时，双方应诚信协商解决；协商不成的，可依韩国民事诉讼法向管辖法院提起诉讼。",
        ],
      },
    ],
  },
  privacy: {
    title: "隐私政策",
    effectiveLabel: "生效日",
    effectiveDate: "2026年7月13日",
    disclaimer:
      "Plander Inc.（以下称「公司」）遵守《个人信息保护法》等相关法律，按如下方式处理用户个人信息。韩文版为具有法律约束力的正式文本。",
    companyLabel: "个人信息保护负责人",
    company: [
      { label: "联系", value: COMPANY.email },
      { label: "公司", value: "Plander Inc." },
      { label: "地址", value: "韩国济州特别自治道济州市观德路44号" },
    ],
    sections: [
      {
        heading: "第1条（收集的个人信息项目）",
        body: [
          "1. 通用（注册）：邮箱、姓名·昵称、密码（加密存储）、联系方式（选填）",
          "2. 广告主：公司·商号名称、营业执照号",
          "3. 达人：活动地区、SNS 渠道 URL·账号·粉丝数、个人简介",
          "4. 支付时：通过支付服务商（Toss Payments）的支付批准信息。卡号等支付方式信息不由公司保存。",
          "5. 自动收集：访问 IP、Cookie、使用记录、设备·浏览器信息",
        ],
      },
      {
        heading: "第2条（收集与使用目的）",
        body: [
          "（1）会员识别、注册·认证及服务提供；（2）广告主–达人匹配及活动运营；（3）费用支付与结算；（4）客户咨询应对及通知；（5）防止不正当使用及服务改进。",
        ],
      },
      {
        heading: "第3条（保有及使用期限）",
        body: [
          "1. 原则上会员注销时立即销毁个人信息。",
          "2. 但依相关法律保留：合同或撤回要约记录——5年；支付及货物供应记录——5年；消费者投诉·纠纷处理记录——3年；访问日志——3个月。",
        ],
      },
      {
        heading: "第4条（向第三方提供）",
        body: [
          "1. 公司原则上不向第三方提供个人信息。",
          "2. 但出于活动运营目的，达人报名活动时，其个人资料及渠道信息将提供给相应广告主。这是服务的本质功能，广告主不得将其用于活动目的之外。",
          "3. 依法律规定或侦查机关合法请求的情况除外。",
        ],
      },
      {
        heading: "第5条（处理委托）",
        body: [
          "公司委托处理如下：Supabase（数据库·认证·存储，首尔区域）——会员数据存储及认证；Vercel——托管及基础设施；Toss Payments——支付处理；Anthropic——AI 活动撰写·匹配；Google——使用统计及广告效果测量。",
        ],
      },
      {
        heading: "第6条（信息主体的权利）",
        body: [
          "1. 用户可随时要求查阅、更正、删除或停止处理其个人信息。",
          "2. 可通过服务内设置功能或 contact@plander.io 提出请求，公司将立即处理。",
        ],
      },
      {
        heading: "第7条（个人信息的销毁）",
        body: [
          "保有期限届满或处理目的达成后，公司立即销毁个人信息。电子文件以不可恢复方式删除，纸质文件粉碎或焚烧。",
        ],
      },
      {
        heading: "第8条（安全保障措施）",
        body: [
          "（1）密码等重要信息加密存储；（2）通过行级访问控制（RLS）最小化数据访问；（3）管理员权限管控及访问记录管理。",
        ],
      },
      {
        heading: "第9条（Cookie）",
        body: [
          "公司可为服务提供及使用统计分析而使用 Cookie。用户可通过浏览器设置拒绝 Cookie，但可能导致部分服务功能受限。",
        ],
      },
      {
        heading: "第10条（个人信息保护负责人）",
        body: [
          "关于个人信息处理的咨询、投诉或救济，请联系：",
          `邮箱：${COMPANY.email}`,
        ],
      },
    ],
  },
};

export const legalContent: Record<Locale, LegalContent> = { ko, en, zh };
