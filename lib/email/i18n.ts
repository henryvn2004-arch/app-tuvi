// lib/email/i18n.ts
// ============================================================
// Nội dung 6 loại email theo ngôn ngữ người nhận (W11). MỘT nguồn duy nhất cho
// chữ trong email — nơi gọi (invoice.ts, marketing/*, email-pdf) chỉ truyền dữ
// liệu, KHÔNG tự nối chuỗi. Gửi vẫn đi qua lib/email/send.ts.
//
// Giọng: ngắn, theo thương hiệu (vi Tử Vi Minh Bảo · en Minh Bao · ja 明宝 ·
// ko 명보 · zh-tw 明寶 · zh-cn 明宝). KHÔNG nhắc "AI" ở email (luật chữ hiển thị).
// Thuật ngữ "Lượng" khớp từ điển giao diện: en credits · ja クレジット ·
// zh-tw 點數 · ko 크레딧 · zh-cn 点数.
//
// zh-cn SINH từ zh-tw bằng OpenCC (cùng luật W4) — `node scripts/check-email-i18n.mjs --write`
// sinh lại, `npm run check:emaili18n` bắt lệch. KHÔNG sửa tay khối zh-cn. Module này không nạp
// opencc-js lúc chạy (devDependency), nên bản sinh được chép thẳng vào mã nguồn.
// ============================================================
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/locales';

export const BRAND: Record<Locale, string> = {
  vi: 'Tử Vi Minh Bảo',
  en: 'Minh Bao',
  ja: '明宝',
  ko: '명보',
  'zh-tw': '明寶',
  'zh-cn': '明宝',
};

const SITE = 'https://tuviminhbao.com';
const TIMEZONE: Record<Locale, string> = {
  vi: 'Asia/Ho_Chi_Minh',
  en: 'UTC',
  ja: 'Asia/Tokyo',
  ko: 'Asia/Seoul',
  'zh-tw': 'Asia/Taipei',
  'zh-cn': 'Asia/Shanghai',
};
const INTL: Record<Locale, string> = {
  vi: 'vi-VN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', 'zh-tw': 'zh-TW', 'zh-cn': 'zh-CN',
};

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** `/ja` + path cho locale khác vi; vi giữ nguyên (không tiền tố). */
export function siteUrl(locale: Locale, path = '/app'): string {
  return SITE + (locale === 'vi' ? '' : '/' + locale) + path;
}

export function fmtDate(locale: Locale, d = new Date()): string {
  const s = d.toLocaleString(INTL[locale], { timeZone: TIMEZONE[locale], dateStyle: 'medium', timeStyle: 'short' });
  return locale === 'en' ? `${s} UTC` : s;
}

export function fmtUsd(locale: Locale, usd: number): string {
  return new Intl.NumberFormat(INTL[locale], { style: 'currency', currency: 'USD', currencyDisplay: 'symbol' }).format(usd);
}

export function fmtVnd(n: number): string {
  return n.toLocaleString('vi-VN') + 'đ';
}

// ── Chữ theo ngôn ngữ ───────────────────────────────────────
interface Strings {
  invoice: {
    subject: (credits: number) => string;
    title: string;
    orderId: string;
    pkg: string;
    credits: string;
    creditsValue: (n: number) => string;
    amount: string;
    gateway: string;
    gateways: { paypal: string; bank: string; momo: string };
    balance: string;
    note: string;
  };
  pdf: {
    toolLabel: { laso: string; 'chu-trinh-cuoc-doi': string };
    subject: (tool: string, name: string) => string;
    body: (tool: string, nameHtml: string) => string;
    foot: string;
  };
  reminder: {
    subject: string;
    lead: string;
    body: (balance: number) => string;
    voucher: (percent: number, days: number) => string;
    cta: string;
  };
  abandoned: {
    subject: (tool: string) => string;
    subjectGeneric: string;
    lead: (toolHtml: string) => string;
    leadGeneric: string;
    body: string;
    voucher: (percent: number, hours: number) => string;
    cta: string;
  };
  crossSell: {
    subject: (label: string) => string;
    lead: string;
    cta: (label: string) => string;
    pairs: Record<string, { label: string; reason: string }>;
  };
  footer: { why: string; unsub: string };
}

const S: Record<Locale, Strings> = {
  vi: {
    invoice: {
      subject: (c) => `Biên nhận nạp ${c} Lượng — Tử Vi Minh Bảo`,
      title: 'Biên nhận nạp Lượng',
      orderId: 'Mã đơn',
      pkg: 'Gói',
      credits: 'Số Lượng nạp',
      creditsValue: (n) => `${n} Lượng`,
      amount: 'Số tiền',
      gateway: 'Cổng thanh toán',
      gateways: { paypal: 'PayPal', bank: 'Chuyển khoản ngân hàng', momo: 'MoMo' },
      balance: 'Số dư hiện tại',
      note: 'Đây là biên nhận tự động, không cần phản hồi email này. Cần hỗ trợ, liên hệ qua trang',
    },
    pdf: {
      toolLabel: { laso: 'Luận Giải Lá Số', 'chu-trinh-cuoc-doi': 'Chu Trình Cuộc Đời' },
      subject: (t, n) => `PDF ${t}${n ? ' — ' + n : ''} — Tử Vi Minh Bảo`,
      body: (t, n) => `Gửi bạn bản PDF ${t.toLowerCase()}${n ? ' của ' + n : ''} — đính kèm trong email này.`,
      foot: 'Bạn luôn xem lại bản đầy đủ trên tài khoản tại',
    },
    reminder: {
      subject: 'Bạn còn Lượng chưa dùng — Tử Vi Minh Bảo',
      lead: 'Tử Vi Minh Bảo nhớ bạn ghé lâu rồi chưa quay lại.',
      body: (b) => `Bạn đang còn <b>${b} Lượng</b> chưa dùng trong tài khoản — vận trình mỗi ngày một khác, ghé xem lá số/vận hạn mới nhất của một thời gian qua nhé.`,
      voucher: (p, d) => `Quà quay lại: giảm thêm <b>${p}%</b> cho lượt mua tiếp theo, có hiệu lực <b>${d} ngày</b> — đã nằm sẵn trong tài khoản, tự động áp lúc thanh toán, không cần nhập mã.`,
      cta: 'Xem ngay →',
    },
    abandoned: {
      subject: (t) => `Bạn còn dở "${t}" — Tử Vi Minh Bảo`,
      subjectGeneric: 'Bạn còn dở một lượt xem — Tử Vi Minh Bảo',
      lead: (t) => `Bạn vừa xem <b>${t}</b> nhưng chưa hoàn tất mở khoá.`,
      leadGeneric: 'Bạn vừa xem một kết quả nhưng chưa hoàn tất mở khoá.',
      body: 'Kết quả vẫn đang chờ — quay lại hoàn tất để đọc trọn bản luận nhé.',
      voucher: (p, h) => `Hoàn tất trong <b>${h} giờ</b> tới để được giảm thêm <b>${p}%</b> — đã nằm sẵn trong tài khoản, tự động áp lúc thanh toán, không cần nhập mã.`,
      cta: 'Quay lại →',
    },
    crossSell: {
      subject: (l) => `Gợi ý cho bạn: ${l} — Tử Vi Minh Bảo`,
      lead: 'Gợi ý dành riêng cho bạn',
      cta: (l) => `Xem ${l} →`,
      pairs: {
        'luan-giai>bat-tu': { label: 'Bát Tự (Tứ Trụ)', reason: 'Bạn đã xem Tử Vi Đẩu Số — Bát Tự soi mệnh theo góc Can Chi Tứ Trụ, một lớp phân tích khác bổ trợ cho lá số vừa xem.' },
        'bat-tu>luan-giai': { label: 'Tử Vi Đẩu Số — Luận Giải', reason: 'Bạn đã xem Bát Tự — Luận Giải Tử Vi Đẩu Số cho góc nhìn 12 cung/vận hạn chi tiết theo từng năm.' },
        'bat-trach>chon-ngay': { label: 'Chọn Ngày Tốt', reason: 'Bạn đã xem hướng nhà hợp mệnh — Chọn Ngày Tốt giúp chọn thời điểm động thổ/nhập trạch hợp mệnh luôn.' },
        'chan-dung-tien-kiep>duyen-no-tien-kiep': { label: 'Duyên Nợ Tiền Kiếp', reason: 'Bạn đã xem Chân Dung Tiền Kiếp — Duyên Nợ Tiền Kiếp soi thêm về các mối duyên gắn với kiếp trước.' },
        'day-con>huong-nghiep-tre': { label: 'Hướng Nghiệp Trẻ', reason: 'Bạn đã xem cách Dạy Con hợp mệnh — Hướng Nghiệp Trẻ gợi ý luôn định hướng ngành nghề phù hợp về sau.' },
      },
    },
    footer: {
      why: 'Bạn nhận được thư này vì đã đăng ký tài khoản tại tuviminhbao.com.',
      unsub: 'Huỷ nhận email này',
    },
  },

  en: {
    invoice: {
      subject: (c) => `Receipt: ${c} credits added — Minh Bao`,
      title: 'Credit top-up receipt',
      orderId: 'Order ID',
      pkg: 'Package',
      credits: 'Credits added',
      creditsValue: (n) => `${n} credits`,
      amount: 'Amount',
      gateway: 'Payment method',
      gateways: { paypal: 'PayPal', bank: 'Bank transfer', momo: 'MoMo' },
      balance: 'Current balance',
      note: 'This is an automated receipt; no reply is needed. If you need help, contact us via',
    },
    pdf: {
      toolLabel: { laso: 'Chart Reading', 'chu-trinh-cuoc-doi': 'Life Course' },
      subject: (t, n) => `PDF: ${t}${n ? ' — ' + n : ''} — Minh Bao`,
      body: (t, n) => `Your ${t} PDF${n ? ' for ' + n : ''} is attached to this email.`,
      foot: 'You can always view the full version in your account at',
    },
    reminder: {
      subject: 'You still have credits to use — Minh Bao',
      lead: "It's been a while since your last visit to Minh Bao.",
      body: (b) => `You still have <b>${b} credits</b> in your account. Your fortune shifts day by day. Come back and see your latest chart and yearly outlook.`,
      voucher: (p, d) => `Welcome-back gift: <b>${p}% off</b> your next purchase, valid for <b>${d} days</b>. It is already in your account and applies automatically at checkout, with no code to enter.`,
      cta: 'Open now →',
    },
    abandoned: {
      subject: (t) => `You left "${t}" unfinished — Minh Bao`,
      subjectGeneric: 'You left a reading unfinished — Minh Bao',
      lead: (t) => `You viewed <b>${t}</b> but did not finish unlocking it.`,
      leadGeneric: 'You viewed a result but did not finish unlocking it.',
      body: 'Your result is still waiting. Come back to finish and read the full reading.',
      voucher: (p, h) => `Finish within the next <b>${h} hours</b> to get an extra <b>${p}% off</b>. It is already in your account and applies automatically at checkout, with no code to enter.`,
      cta: 'Go back →',
    },
    crossSell: {
      subject: (l) => `Suggested for you: ${l} — Minh Bao`,
      lead: 'A suggestion just for you',
      cta: (l) => `View ${l} →`,
      pairs: {
        'luan-giai>bat-tu': { label: 'Bazi (Four Pillars)', reason: 'You have read your Zi Wei Dou Shu chart. Bazi looks at your destiny through the Four Pillars of Heavenly Stems and Earthly Branches, a complementary layer to the chart you just viewed.' },
        'bat-tu>luan-giai': { label: 'Zi Wei Dou Shu Reading', reason: 'You have read your Bazi. The Zi Wei Dou Shu reading adds a year-by-year view across the 12 palaces and your yearly outlook.' },
        'bat-trach>chon-ngay': { label: 'Auspicious Dates', reason: 'You checked the house directions that suit you. Auspicious Dates helps you choose the right day to break ground or move in.' },
        'chan-dung-tien-kiep>duyen-no-tien-kiep': { label: 'Past-Life Bonds', reason: 'You viewed your Past-Life Portrait. Past-Life Bonds looks further into the relationships tied to a previous life.' },
        'day-con>huong-nghiep-tre': { label: "Children's Career Path", reason: "You viewed how to raise your child in harmony with their chart. Children's Career Path suggests the careers that may suit them later." },
      },
    },
    footer: {
      why: 'You are receiving this email because you registered an account at tuviminhbao.com.',
      unsub: 'Unsubscribe from these emails',
    },
  },

  ja: {
    invoice: {
      subject: (c) => `ご利用明細: ${c} クレジットをチャージしました — 明宝`,
      title: 'クレジットチャージの領収メール',
      orderId: '注文番号',
      pkg: 'プラン',
      credits: 'チャージしたクレジット',
      creditsValue: (n) => `${n} クレジット`,
      amount: 'お支払い金額',
      gateway: 'お支払い方法',
      gateways: { paypal: 'PayPal', bank: '銀行振込', momo: 'MoMo' },
      balance: '現在の残高',
      note: 'このメールは自動送信です。ご返信は不要です。ご不明な点は次のページからお問い合わせください:',
    },
    pdf: {
      toolLabel: { laso: '命盤の鑑定', 'chu-trinh-cuoc-doi': '人生の流れ' },
      subject: (t, n) => `PDF: ${t}${n ? ' — ' + n : ''} — 明宝`,
      body: (t, n) => `${n ? n + ' 様の' : ''}${t}の PDF を添付しました。`,
      foot: '完全版はいつでもアカウントからご覧いただけます:',
    },
    reminder: {
      subject: '未使用のクレジットがあります — 明宝',
      lead: '明宝より、しばらくご来訪がないのでご連絡しました。',
      body: (b) => `アカウントに <b>${b} クレジット</b> が残っています。運勢は日々移ろいます。最新の命盤と運勢をご覧ください。`,
      voucher: (p, d) => `おかえりなさいの特典: 次回のご購入が <b>${p}%オフ</b>（有効期間 <b>${d}日間</b>）。すでにアカウントに入っており、お支払い時に自動で適用されます。コードの入力は不要です。`,
      cta: '今すぐ見る →',
    },
    abandoned: {
      subject: (t) => `「${t}」が途中です — 明宝`,
      subjectGeneric: '鑑定結果が途中です — 明宝',
      lead: (t) => `<b>${t}</b>をご覧になりましたが、ロック解除が完了していません。`,
      leadGeneric: '鑑定結果をご覧になりましたが、ロック解除が完了していません。',
      body: '結果はそのまま残っています。お戻りいただき、全文をお読みください。',
      voucher: (p, h) => `今後 <b>${h}時間</b> 以内に完了すると、さらに <b>${p}%オフ</b>。すでにアカウントに入っており、お支払い時に自動で適用されます。コードの入力は不要です。`,
      cta: '続きへ戻る →',
    },
    crossSell: {
      subject: (l) => `おすすめ: ${l} — 明宝`,
      lead: 'あなたへのおすすめ',
      cta: (l) => `${l}を見る →`,
      pairs: {
        'luan-giai>bat-tu': { label: '八字（四柱推命）', reason: '紫微斗数の命盤をご覧になりました。八字は干支の四柱から運命を読む別の視点で、命盤を補ってくれます。' },
        'bat-tu>luan-giai': { label: '紫微斗数の鑑定', reason: '八字をご覧になりました。紫微斗数の鑑定では、十二宮と年ごとの運勢を詳しく読み解けます。' },
        'bat-trach>chon-ngay': { label: '吉日選び', reason: 'あなたに合う家の方位をご覧になりました。吉日選びで、着工や入居に良い日も選べます。' },
        'chan-dung-tien-kiep>duyen-no-tien-kiep': { label: '前世の縁', reason: '前世の肖像をご覧になりました。前世の縁では、前の人生とつながる縁をさらに読み解きます。' },
        'day-con>huong-nghiep-tre': { label: 'お子さまの進路', reason: '命盤に合った子育てをご覧になりました。お子さまの進路では、将来に向いた職業の方向性もご提案します。' },
      },
    },
    footer: {
      why: 'このメールは、tuviminhbao.com でアカウントを登録された方にお送りしています。',
      unsub: 'このメールの配信を停止する',
    },
  },

  ko: {
    invoice: {
      subject: (c) => `영수증: ${c} 크레딧 충전 완료 — 명보`,
      title: '크레딧 충전 영수증',
      orderId: '주문 번호',
      pkg: '상품',
      credits: '충전 크레딧',
      creditsValue: (n) => `${n} 크레딧`,
      amount: '결제 금액',
      gateway: '결제 수단',
      gateways: { paypal: 'PayPal', bank: '계좌 이체', momo: 'MoMo' },
      balance: '현재 잔액',
      note: '이 메일은 자동 발송되며 회신하실 필요가 없습니다. 도움이 필요하시면 다음 페이지로 문의해 주세요:',
    },
    pdf: {
      toolLabel: { laso: '명반 풀이', 'chu-trinh-cuoc-doi': '인생의 흐름' },
      subject: (t, n) => `PDF: ${t}${n ? ' — ' + n : ''} — 명보`,
      body: (t, n) => `${n ? n + '님의 ' : ''}${t} PDF를 첨부했습니다.`,
      foot: '전체 내용은 언제든 계정에서 다시 보실 수 있습니다:',
    },
    reminder: {
      subject: '사용하지 않은 크레딧이 남아 있어요 — 명보',
      lead: '명보입니다. 한동안 방문하지 않으셔서 안부를 전합니다.',
      body: (b) => `계정에 아직 <b>${b} 크레딧</b>이 남아 있습니다. 운세는 날마다 달라집니다. 최신 명반과 운세를 확인해 보세요.`,
      voucher: (p, d) => `다시 찾아주신 분께 드리는 선물: 다음 구매 <b>${p}% 할인</b>(유효 기간 <b>${d}일</b>). 이미 계정에 들어 있으며 결제 시 자동 적용됩니다. 코드를 입력하실 필요가 없습니다.`,
      cta: '지금 보기 →',
    },
    abandoned: {
      subject: (t) => `"${t}" 열람이 끝나지 않았어요 — 명보`,
      subjectGeneric: '풀이 열람이 끝나지 않았어요 — 명보',
      lead: (t) => `<b>${t}</b>을(를) 보셨지만 잠금 해제를 마치지 않으셨습니다.`,
      leadGeneric: '결과를 보셨지만 잠금 해제를 마치지 않으셨습니다.',
      body: '결과는 그대로 기다리고 있습니다. 돌아오셔서 전체 풀이를 읽어 보세요.',
      voucher: (p, h) => `앞으로 <b>${h}시간</b> 안에 마치시면 <b>${p}% 추가 할인</b>을 받으실 수 있습니다. 이미 계정에 들어 있으며 결제 시 자동 적용됩니다. 코드를 입력하실 필요가 없습니다.`,
      cta: '돌아가기 →',
    },
    crossSell: {
      subject: (l) => `추천: ${l} — 명보`,
      lead: '회원님을 위한 추천',
      cta: (l) => `${l} 보기 →`,
      pairs: {
        'luan-giai>bat-tu': { label: '사주팔자', reason: '자미두수 명반을 보셨습니다. 사주팔자는 천간과 지지의 네 기둥으로 운명을 읽는 또 다른 관점으로, 방금 본 명반을 보완해 줍니다.' },
        'bat-tu>luan-giai': { label: '자미두수 풀이', reason: '사주팔자를 보셨습니다. 자미두수 풀이는 12궁과 해마다의 운세를 자세히 보여 드립니다.' },
        'bat-trach>chon-ngay': { label: '길일 택일', reason: '나에게 맞는 집의 방향을 보셨습니다. 길일 택일로 공사 시작이나 입주에 좋은 날도 고르실 수 있습니다.' },
        'chan-dung-tien-kiep>duyen-no-tien-kiep': { label: '전생의 인연', reason: '전생의 초상을 보셨습니다. 전생의 인연에서는 이전 생과 이어진 인연을 더 깊이 살펴봅니다.' },
        'day-con>huong-nghiep-tre': { label: '자녀 진로', reason: '명반에 맞는 자녀 교육법을 보셨습니다. 자녀 진로에서는 나중에 어울릴 직업 방향도 제안해 드립니다.' },
      },
    },
    footer: {
      why: '이 메일은 tuviminhbao.com에 계정을 등록하셔서 보내드렸습니다.',
      unsub: '이 메일 수신 거부',
    },
  },

  'zh-tw': {
    invoice: {
      subject: (c) => `收據：已儲值 ${c} 點數 — 明寶`,
      title: '點數儲值收據',
      orderId: '訂單編號',
      pkg: '方案',
      credits: '儲值點數',
      creditsValue: (n) => `${n} 點`,
      amount: '付款金額',
      gateway: '付款方式',
      gateways: { paypal: 'PayPal', bank: '銀行轉帳', momo: 'MoMo' },
      balance: '目前餘額',
      note: '這是系統自動寄出的收據，無需回覆。如需協助，請透過以下頁面聯絡我們：',
    },
    pdf: {
      toolLabel: { laso: '命盤解讀', 'chu-trinh-cuoc-doi': '人生歷程' },
      subject: (t, n) => `PDF：${t}${n ? ' — ' + n : ''} — 明寶`,
      body: (t, n) => `${n ? n + ' 的' : ''}${t} PDF 已附在這封信中。`,
      foot: '完整內容隨時可在您的帳號中重新查看：',
    },
    reminder: {
      subject: '您還有未使用的點數 — 明寶',
      lead: '明寶想您了，好一陣子沒有回來看看。',
      body: (b) => `您的帳號裡還有 <b>${b} 點</b>尚未使用。運勢每天都不同，歡迎回來查看最新的命盤與流年運勢。`,
      voucher: (p, d) => `歡迎回來的小禮：下次購買再享 <b>${p}% 折扣</b>，<b>${d} 天</b>內有效。已放在您的帳號中，結帳時自動套用，無須輸入代碼。`,
      cta: '立即查看 →',
    },
    abandoned: {
      subject: (t) => `「${t}」還沒看完 — 明寶`,
      subjectGeneric: '有一份解讀還沒看完 — 明寶',
      lead: (t) => `您查看了<b>${t}</b>，但尚未完成解鎖。`,
      leadGeneric: '您查看了一份結果，但尚未完成解鎖。',
      body: '結果仍在等您，回來完成後即可閱讀完整解讀。',
      voucher: (p, h) => `在接下來 <b>${h} 小時</b>內完成，可再享 <b>${p}% 折扣</b>。已放在您的帳號中，結帳時自動套用，無須輸入代碼。`,
      cta: '回去完成 →',
    },
    crossSell: {
      subject: (l) => `為您推薦：${l} — 明寶`,
      lead: '專為您準備的推薦',
      cta: (l) => `查看${l} →`,
      pairs: {
        'luan-giai>bat-tu': { label: '八字（四柱）', reason: '您已查看紫微斗數命盤。八字從天干地支四柱切入看命，是補充命盤的另一個角度。' },
        'bat-tu>luan-giai': { label: '紫微斗數解讀', reason: '您已查看八字。紫微斗數解讀能詳細呈現十二宮與逐年運勢。' },
        'bat-trach>chon-ngay': { label: '擇吉日', reason: '您已查看適合自己的住宅方位。擇吉日可進一步挑選動土、入宅的好日子。' },
        'chan-dung-tien-kiep>duyen-no-tien-kiep': { label: '前世緣分', reason: '您已查看前世畫像。前世緣分進一步解讀與前世相連的緣分。' },
        'day-con>huong-nghiep-tre': { label: '孩子的職涯方向', reason: '您已查看依命盤教養孩子的方式。孩子的職涯方向也會為日後適合的行業提供建議。' },
      },
    },
    footer: {
      why: '您收到這封信，是因為您在 tuviminhbao.com 註冊了帳號。',
      unsub: '取消訂閱這類郵件',
    },
  },

  'zh-cn': {
    invoice: {
      subject: (c) => `收据：已储值 ${c} 点数 — 明宝`,
      title: '点数储值收据',
      orderId: '订单编号',
      pkg: '方案',
      credits: '储值点数',
      creditsValue: (n) => `${n} 点`,
      amount: '付款金额',
      gateway: '付款方式',
      gateways: { paypal: 'PayPal', bank: '银行转帐', momo: 'MoMo' },
      balance: '目前余额',
      note: '这是系统自动寄出的收据，无需回复。如需协助，请透过以下页面联系我们：',
    },
    pdf: {
      toolLabel: { laso: '命盘解读', 'chu-trinh-cuoc-doi': '人生历程' },
      subject: (t, n) => `PDF：${t}${n ? ' — ' + n : ''} — 明宝`,
      body: (t, n) => `${n ? n + ' 的' : ''}${t} PDF 已附在这封信中。`,
      foot: '完整内容随时可在您的帐号中重新查看：',
    },
    reminder: {
      subject: '您还有未使用的点数 — 明宝',
      lead: '明宝想您了，好一阵子没有回来看看。',
      body: (b) => `您的帐号里还有 <b>${b} 点</b>尚未使用。运势每天都不同，欢迎回来查看最新的命盘与流年运势。`,
      voucher: (p, d) => `欢迎回来的小礼：下次购买再享 <b>${p}% 折扣</b>，<b>${d} 天</b>内有效。已放在您的帐号中，结帐时自动套用，无须输入代码。`,
      cta: '立即查看 →',
    },
    abandoned: {
      subject: (t) => `「${t}」还没看完 — 明宝`,
      subjectGeneric: '有一份解读还没看完 — 明宝',
      lead: (t) => `您查看了<b>${t}</b>，但尚未完成解锁。`,
      leadGeneric: '您查看了一份结果，但尚未完成解锁。',
      body: '结果仍在等您，回来完成后即可阅读完整解读。',
      voucher: (p, h) => `在接下来 <b>${h} 小时</b>内完成，可再享 <b>${p}% 折扣</b>。已放在您的帐号中，结帐时自动套用，无须输入代码。`,
      cta: '回去完成 →',
    },
    crossSell: {
      subject: (l) => `为您推荐：${l} — 明宝`,
      lead: '专为您准备的推荐',
      cta: (l) => `查看${l} →`,
      pairs: {
        'luan-giai>bat-tu': { label: '八字（四柱）', reason: '您已查看紫微斗数命盘。八字从天干地支四柱切入看命，是补充命盘的另一个角度。' },
        'bat-tu>luan-giai': { label: '紫微斗数解读', reason: '您已查看八字。紫微斗数解读能详细呈现十二宫与逐年运势。' },
        'bat-trach>chon-ngay': { label: '择吉日', reason: '您已查看适合自己的住宅方位。择吉日可进一步挑选动土、入宅的好日子。' },
        'chan-dung-tien-kiep>duyen-no-tien-kiep': { label: '前世缘分', reason: '您已查看前世画像。前世缘分进一步解读与前世相连的缘分。' },
        'day-con>huong-nghiep-tre': { label: '孩子的职涯方向', reason: '您已查看依命盘教养孩子的方式。孩子的职涯方向也会为日后适合的行业提供建议。' },
      },
    },
    footer: {
      why: '您收到这封信，是因为您在 tuviminhbao.com 注册了帐号。',
      unsub: '取消订阅这类邮件',
    },
  },
};

/** Cho bộ dò (`check:emaili18n`) — đừng dùng ở code gửi thật. */
export const EMAIL_STRINGS_FOR_CHECK = S;

// ── Dựng email ──────────────────────────────────────────────
const BTN =
  'display:inline-block;background:#061A2E;color:#C9A84C;padding:12px 28px;border-radius:4px;text-decoration:none;font-size:13px;letter-spacing:1px';
const p1 = (t: string) => `<p style="font-size:15px;color:#061A2E">${t}</p>`;
const p2 = (t: string, extra = '') => `<p style="font-size:14px;color:#333${extra}">${t}</p>`;
const btn = (href: string, label: string) => `<p style="margin-top:20px"><a href="${href}" style="${BTN}">${esc(label)}</a></p>`;

export interface Rendered { subject: string; html: string }

export interface InvoiceData {
  orderId: string;
  provider: 'paypal' | 'bank' | 'momo';
  credits: number;
  /** USD thật đã thu (PayPal). Thiếu ⇒ hiện VNĐ (rail ngân hàng/MoMo cũ). */
  amountUsd?: number;
  amountVnd: number;
  /** Tên gói tiếng Việt — chỉ hiện ở bản `vi` (tên gói chưa dịch). */
  label: string;
  balance: number;
}

export function renderInvoice(locale: Locale, d: InvoiceData): Rendered {
  const t = S[locale].invoice;
  const money = d.amountUsd != null ? fmtUsd(locale, d.amountUsd) : fmtVnd(d.amountVnd);
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#888">${esc(k)}</td><td style="padding:6px 0;text-align:right">${esc(v)}</td></tr>`;
  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 0;font-family:Georgia,'Times New Roman',serif">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:6px;overflow:hidden">
<tr><td style="background:#061A2E;padding:28px 32px;text-align:center">
<img src="https://tuviminhbao.com/seal.webp" width="40" height="40" alt="" style="display:block;margin:0 auto 8px">
<span style="color:#C9A84C;font-size:18px;letter-spacing:1px">${esc(BRAND[locale])}</span>
</td></tr>
<tr><td style="padding:32px">
<h1 style="font-size:18px;color:#061A2E;margin:0 0 4px">${esc(t.title)}</h1>
<p style="font-size:13px;color:#888;margin:0 0 24px">${esc(fmtDate(locale))}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333">
${row(t.orderId, d.orderId)}
${locale === 'vi' ? row(t.pkg, d.label) : ''}
${row(t.credits, t.creditsValue(d.credits))}
${row(t.amount, money)}
${row(t.gateway, t.gateways[d.provider])}
<tr><td colspan="2" style="border-top:1px solid #e5e5e5;padding-top:10px;margin-top:6px"></td></tr>
<tr><td style="padding:6px 0;font-weight:bold;color:#061A2E">${esc(t.balance)}</td><td style="padding:6px 0;text-align:right;font-weight:bold;color:#C0392B">${esc(t.creditsValue(d.balance))}</td></tr>
</table>
<p style="font-size:12px;color:#999;margin-top:28px">${esc(t.note)} <a href="${siteUrl(locale, '')}" style="color:#1455A4">tuviminhbao.com</a>.</p>
</td></tr>
</table>
</td></tr>
</table>`;
  return { subject: t.subject(d.credits), html };
}

const PDF_EXTRA: Record<Locale, { resendBody: (tool: string, nameHtml: string) => string; viewOnline: string; viewOnlineNote: string }> = {
  vi: { resendBody: (t, n) => `Gửi lại bạn bản PDF ${t.toLowerCase()}${n ? ' của ' + n : ''} — đính kèm trong email này.`, viewOnline: 'Xem báo cáo trực tuyến →', viewOnlineNote: '(không cần đăng nhập, mở trên bất kỳ thiết bị nào)' },
  en: { resendBody: (t, n) => `Here is your ${t} PDF${n ? ' for ' + n : ''} again, attached to this email.`, viewOnline: 'View the report online →', viewOnlineNote: '(no sign-in needed, opens on any device)' },
  ja: { resendBody: (t, n) => `${n ? n + ' 様の' : ''}${t}の PDF を再送します。このメールに添付しています。`, viewOnline: 'レポートをオンラインで見る →', viewOnlineNote: '（ログイン不要、どの端末でも開けます）' },
  ko: { resendBody: (t, n) => `${n ? n + '님의 ' : ''}${t} PDF를 다시 보내 드립니다. 이 메일에 첨부되어 있습니다.`, viewOnline: '온라인으로 리포트 보기 →', viewOnlineNote: '(로그인 불필요, 어떤 기기에서나 열립니다)' },
  'zh-tw': { resendBody: (t, n) => `重新寄送${n ? ' ' + n + ' 的' : ''}${t} PDF，已附在這封信中。`, viewOnline: '線上查看報告 →', viewOnlineNote: '（無須登入，任何裝置皆可開啟）' },
  'zh-cn': { resendBody: (t, n) => `重新寄送${n ? ' ' + n + ' 的' : ''}${t} PDF，已附在这封信中。`, viewOnline: '在线查看报告 →', viewOnlineNote: '（无须登录，任何设备皆可打开）' },
};

export function renderPdfMail(
  locale: Locale,
  toolId: 'laso' | 'chu-trinh-cuoc-doi',
  hoTen: string,
  opts: { resend?: boolean; viewUrl?: string } = {},
): Rendered {
  const t = S[locale].pdf;
  const x = PDF_EXTRA[locale];
  const tool = t.toolLabel[toolId];
  const nameHtml = hoTen ? `<b>${esc(hoTen)}</b>` : '';
  const viewOnline = opts.viewUrl
    ? `<p><a href="${opts.viewUrl}">${esc(x.viewOnline)}</a> ${esc(x.viewOnlineNote)}</p>\n`
    : '';
  return {
    subject: t.subject(tool, hoTen),
    html: `<p>${(opts.resend ? x.resendBody : t.body)(esc(tool), nameHtml)}</p>
${viewOnline}<p style="font-size:12px;color:#888">${esc(t.foot)} <a href="${siteUrl(locale)}">tuviminhbao.com/app</a>.</p>`,
  };
}

export function renderReminder(locale: Locale, balance: number, voucher: { percent: number; days: number } | null): Rendered {
  const t = S[locale].reminder;
  return {
    subject: t.subject,
    html: `${p1(esc(t.lead))}
${p2(t.body(balance))}
${voucher ? p2(t.voucher(voucher.percent, voucher.days), ';margin-top:14px') : ''}
${btn(siteUrl(locale), t.cta)}`,
  };
}

export function renderAbandoned(
  locale: Locale,
  toolLabel: string,
  voucher: { percent: number; hours: number } | null,
): Rendered {
  const t = S[locale].abandoned;
  // Tên công cụ lấy từ DB bằng tiếng Việt: chỉ chèn vào thư tiếng Việt, ngôn ngữ khác nói chung chung
  // thay vì chen một cụm tiếng Việt giữa câu Nhật/Hàn/Trung.
  const named = locale === 'vi' && !!toolLabel;
  return {
    subject: named ? t.subject(toolLabel) : t.subjectGeneric,
    html: `${p1(named ? t.lead(`${esc(toolLabel)}`) : t.leadGeneric)}
${p2(esc(t.body))}
${voucher ? p2(t.voucher(voucher.percent, voucher.hours), ';margin-top:14px') : ''}
${btn(siteUrl(locale), t.cta)}`,
  };
}

export function renderCrossSell(locale: Locale, from: string, to: string, toPath: string): Rendered {
  const t = S[locale].crossSell;
  const pair = t.pairs[`${from}>${to}`];
  return {
    subject: t.subject(pair.label),
    html: `${p1(esc(t.lead))}
${p2(esc(pair.reason))}
${btn(siteUrl(locale, toPath), t.cta(pair.label))}`,
  };
}

/** Footer thư quảng bá (gắn bởi sendMarketingEmail). */
export function renderMarketingFooter(locale: Locale | undefined, unsubLink: string): string {
  const l = locale ?? DEFAULT_LOCALE;
  const t = S[l].footer;
  return `<hr style="margin-top:32px;border:none;border-top:1px solid #e5e5e5">
<p style="font-size:12px;color:#888">
  ${esc(BRAND[l])} — tuviminhbao.com<br>
  ${esc(t.why)}
  <a href="${unsubLink}">${esc(t.unsub)}</a>.
</p>`;
}

/** Tên hiển thị người gửi. Env `EMAIL_FROM_*` đặt tay thì giữ nguyên (Henry quyết). */
export function brandName(locale: Locale | undefined): string {
  return BRAND[locale ?? DEFAULT_LOCALE];
}

/** Trang xác nhận huỷ nhận email (app/api/email/unsubscribe) — công khai, ngôn ngữ theo `?lang=`. */
const UNSUB: Record<Locale, { badTitle: string; badBody: string; errTitle: string; errBody: string; okTitle: string; ok: (emailHtml: string) => string }> = {
  vi: {
    badTitle: 'Liên kết không hợp lệ', badBody: 'Liên kết huỷ nhận email này đã hỏng hoặc hết hạn.',
    errTitle: 'Có lỗi xảy ra', errBody: 'Không huỷ được lúc này, thử lại sau ít phút.',
    okTitle: 'Đã huỷ nhận email', ok: (e) => `Địa chỉ <b>${e}</b> sẽ không nhận thêm email quảng bá từ Tử Vi Minh Bảo.`,
  },
  en: {
    badTitle: 'Invalid link', badBody: 'This unsubscribe link is broken or has expired.',
    errTitle: 'Something went wrong', errBody: 'We could not unsubscribe you right now. Please try again in a few minutes.',
    okTitle: 'You have been unsubscribed', ok: (e) => `<b>${e}</b> will no longer receive promotional emails from Minh Bao.`,
  },
  ja: {
    badTitle: 'リンクが無効です', badBody: 'この配信停止リンクは壊れているか、有効期限が切れています。',
    errTitle: 'エラーが発生しました', errBody: 'ただいま配信停止ができませんでした。数分後にもう一度お試しください。',
    okTitle: '配信を停止しました', ok: (e) => `<b>${e}</b> 宛てには、今後 明宝 からの販促メールをお送りしません。`,
  },
  ko: {
    badTitle: '유효하지 않은 링크입니다', badBody: '이 수신 거부 링크가 손상되었거나 만료되었습니다.',
    errTitle: '오류가 발생했습니다', errBody: '지금은 수신 거부를 처리할 수 없습니다. 몇 분 뒤에 다시 시도해 주세요.',
    okTitle: '수신 거부가 완료되었습니다', ok: (e) => `<b>${e}</b> 주소로는 더 이상 명보의 홍보 메일을 보내지 않습니다.`,
  },
  'zh-tw': {
    badTitle: '連結無效', badBody: '這個取消訂閱的連結已損壞或已過期。',
    errTitle: '發生錯誤', errBody: '目前無法取消訂閱，請幾分鐘後再試。',
    okTitle: '已取消訂閱', ok: (e) => `<b>${e}</b> 日後將不再收到明寶的推廣郵件。`,
  },
  'zh-cn': {
    badTitle: '链接无效', badBody: '这个取消订阅的链接已损坏或已过期。',
    errTitle: '发生错误', errBody: '目前无法取消订阅，请几分钟后再试。',
    okTitle: '已取消订阅', ok: (e) => `<b>${e}</b> 日后将不再收到明宝的推广邮件。`,
  },
};

export function unsubStrings(locale: Locale) {
  return UNSUB[locale];
}
