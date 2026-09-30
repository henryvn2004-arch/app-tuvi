// Từng công cụ chạy trong app: form → module dùng chung của web tính → hiện
// HTML kết quả (do chính module dựng) trong khung `.tvw-<id>` mang CSS của trang
// web. Bố cục khối kết quả mô phỏng `#resPanel` của trang web tương ứng
// (public/app-<trang>.html) — chỉ khung, mọi số liệu/chữ đều từ module.
import { useState, type ReactNode } from 'react';
import { Button, Input, Select } from 'zmp-ui';
import type { ChartBirth } from '../../lib/birth';
import { gieoHao, noLinks, vnYear, web, type HaoLine, type Scenario } from '../../lib/web-tools';

export interface ToolProps {
  mine: ChartBirth | null;
  onAsk: (s: Scenario) => void;
}

export interface NativeTool {
  id: string;
  label: string;
  desc: string;
  View: (p: ToolProps) => ReactNode;
}

const Html = ({ html, className }: { html: string; className?: string }) => (
  <div className={className} dangerouslySetInnerHTML={{ __html: noLinks(html) }} />
);

const Block = ({ title, children }: { title?: string; children: ReactNode }) => (
  <div className="res-block">
    {title && (
      <div className="res-block-header">
        <span className="res-block-title">{title}</span>
      </div>
    )}
    {children}
  </div>
);

function Result({
  id,
  scenario,
  ask,
  onAsk,
  onReset,
  children,
}: {
  id: string;
  scenario: Scenario;
  ask: string;
  onAsk: (s: Scenario) => void;
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className={`tvw tvw-${id}`}>{children}</div>
      <Button fullWidth onClick={() => onAsk(scenario)}>
        {ask}
      </Button>
      <Button fullWidth variant="tertiary" onClick={onReset}>
        Xem lại với thông tin khác
      </Button>
    </>
  );
}

const num = (v: unknown): string => (v == null || v === '' ? '' : String(v));

function YearInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      label={label}
      placeholder="VD: 1990"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function GenderSelect({ value, onChange }: { value: 'nam' | 'nu'; onChange: (v: 'nam' | 'nu') => void }) {
  return (
    <Select label="Giới tính" value={value} onChange={(v) => onChange(v === 'nu' ? 'nu' : 'nam')} closeOnSelect>
      <Select.Option value="nam" title="Nam" />
      <Select.Option value="nu" title="Nữ" />
    </Select>
  );
}

function Form({ error, onGo, children }: { error: string; onGo: () => void; children: ReactNode }) {
  return (
    <section className="tv-card tv-form">
      {children}
      {error && <p className="tv-warn">{error}</p>}
      <Button fullWidth onClick={onGo}>
        Xem kết quả
      </Button>
    </section>
  );
}

// ── Kim Lâu · Tam Tai · Hoang Ốc ────────────────────────────────────────────
function KimLau({ mine, onAsk }: ToolProps) {
  const [year, setYear] = useState(num(mine?.nam));
  const [error, setError] = useState('');
  const [r, setR] = useState<Extract<ReturnType<typeof web.KimLauTool.compute>, { ok: true }> | null>(null);
  if (!r)
    return (
      <Form
        error={error}
        onGo={() => {
          const x = web.KimLauTool.compute(parseInt(year), vnYear());
          if (x.ok) setR(x);
          else setError(x.error);
        }}
      >
        <YearInput label="Năm sinh (dương lịch)" value={year} onChange={setYear} />
      </Form>
    );
  const d = r.data as { canChi: string };
  return (
    <Result
      id="kim-lau"
      ask="Hỏi Thầy năm đẹp & cách hóa giải"
      onAsk={onAsk}
      onReset={() => setR(null)}
      scenario={{
        type: 'kim-lau',
        data: r.data,
        label: `Kim Lâu · tuổi ${d.canChi}`,
        chips: ['Năm nào đẹp nhất để làm nhà?', 'Năm nào cưới hỏi được?', 'Phạm Kim Lâu thì hóa giải sao?', 'Tam Tai kiêng những gì?'],
      }}
    >
      <Block title={r.resTitleText}>
        <Html className="res-block-body" html={r.currentBoxHTML} />
      </Block>
      <Block title="Bảng Tra 20 Năm Tới">
        <div className="kl-scroll">
          <table className="kl-table">
            <thead>
              <tr>
                <th>Năm DL</th>
                <th>Tuổi Ta</th>
                <th>Can Chi</th>
                <th>Tình Trạng</th>
              </tr>
            </thead>
            <tbody dangerouslySetInnerHTML={{ __html: noLinks(r.rowsHTML) }} />
          </table>
        </div>
      </Block>
    </Result>
  );
}

// ── Hướng Bát Trạch ────────────────────────────────────────────────────────
function BatTrach({ mine, onAsk }: ToolProps) {
  const [year, setYear] = useState(num(mine?.nam));
  const [gender, setGender] = useState<'nam' | 'nu'>(mine?.gioitinh === 'nu' ? 'nu' : 'nam');
  const [error, setError] = useState('');
  const [r, setR] = useState<Extract<ReturnType<typeof web.BatTrachTool.compute>, { ok: true }> | null>(null);
  if (!r)
    return (
      <Form
        error={error}
        onGo={() => {
          const x = web.BatTrachTool.compute(parseInt(year), gender);
          if (x.ok) setR(x);
          else setError(x.error);
        }}
      >
        <YearInput label="Năm sinh (dương lịch)" value={year} onChange={setYear} />
        <GenderSelect value={gender} onChange={setGender} />
      </Form>
    );
  const d = r.data as { menhQuai: string; nhom: string };
  return (
    <Result
      id="bat-trach"
      ask="Hỏi Thầy hướng hợp & cách hóa giải"
      onAsk={onAsk}
      onReset={() => setR(null)}
      scenario={{
        type: 'bat-trach',
        data: r.data,
        label: `Bát Trạch · ${d.menhQuai} · ${d.nhom}`,
        chips: ['Hướng nhà nào hợp nhất?', 'Bếp nên đặt hướng nào?', 'Giường ngủ quay hướng nào?', 'Buộc ở hướng xấu thì hóa giải sao?'],
      }}
    >
      <Block title={r.resTitleText}>
        <Html className="res-block-body" html={r.resInfoHTML} />
      </Block>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <Html className="compass-wrap" html={r.compassHTML} />
      </div>
      <Block title="Bảng 8 Hướng Chi Tiết">
        <div style={{ overflowX: 'auto' }}>
          <table className="huong-table">
            <thead>
              <tr>
                <th>Hướng</th>
                <th>Tên Hướng</th>
                <th>Ý Nghĩa</th>
                <th>Gợi Ý Dùng</th>
              </tr>
            </thead>
            <tbody dangerouslySetInnerHTML={{ __html: noLinks(r.huongRowsHTML) }} />
          </table>
        </div>
      </Block>
    </Result>
  );
}

// ── Nạp Âm Ngũ Hành ────────────────────────────────────────────────────────
function NapAm({ mine, onAsk }: ToolProps) {
  const [year, setYear] = useState(num(mine?.nam));
  const [error, setError] = useState('');
  const [r, setR] = useState<Extract<ReturnType<typeof web.NapAmTool.compute>, { ok: true }> | null>(null);
  if (!r)
    return (
      <Form
        error={error}
        onGo={() => {
          const x = web.NapAmTool.compute(parseInt(year));
          if (x.ok) setR(x);
          else setError(x.error);
        }}
      >
        <YearInput label="Năm sinh" value={year} onChange={setYear} />
      </Form>
    );
  // Rail nhận CẢ tầng ứng dụng, trải PHẲNG — y như trang web (public/app-nap-am.html).
  const u = web.NapAmTool.ungDung(r.data.hanh) || {};
  const d = r.data;
  return (
    <Result
      id="nap-am"
      ask="Hỏi Thầy luận sâu nạp âm"
      onAsk={onAsk}
      onReset={() => setR(null)}
      scenario={{
        type: 'nap-am',
        data: {
          ...r.data,
          mauHop: u.mauHop,
          mauKy: u.mauKy,
          phuongVi: u.phuongVi,
          tuoiHop: u.hanhHop,
          tuoiKy: u.hanhKy,
          soHop: u.so,
          chatLieu: u.chatLieu,
        },
        label: `Nạp âm ${d.canChi} · ${d.napAm}`,
        chips: ['Hợp màu gì, kỵ màu gì?', 'Hướng nhà/bàn làm việc nào hợp?', 'Tuổi nào hợp, tuổi nào khắc?', 'Vật phẩm phong thủy nào nên đeo?'],
      }}
    >
      <div className="result-eyebrow">{r.eyebrowText}</div>
      <Html className="nap-am-result" html={r.resultHTML} />
      <Html html={web.NapAmTool.ungDungHTML(r.data, { shell: true })} />
    </Result>
  );
}

// ── Xem Tuổi Sinh Con ──────────────────────────────────────────────────────
function SinhCon({ mine, onAsk }: ToolProps) {
  const me = num(mine?.nam);
  const [bo, setBo] = useState(mine?.gioitinh === 'nu' ? '' : me);
  const [meYear, setMeYear] = useState(mine?.gioitinh === 'nu' ? me : '');
  const [error, setError] = useState('');
  const [r, setR] = useState<Extract<ReturnType<typeof web.XemTuoiSinhConTool.compute>, { ok: true }> | null>(
    null
  );
  if (!r)
    return (
      <Form
        error={error}
        onGo={() => {
          const x = web.XemTuoiSinhConTool.compute(parseInt(bo), parseInt(meYear));
          if (x.ok) setR(x);
          else setError(x.error);
        }}
      >
        <YearInput label="Năm sinh của bố" value={bo} onChange={setBo} />
        <YearInput label="Năm sinh của mẹ" value={meYear} onChange={setMeYear} />
      </Form>
    );
  const card = (who: string, i: { canChi: string; napAm: string; hanh: string }) => (
    <div className="cc-card">
      <div className="who">{who}</div>
      <div className="cc">{i.canChi}</div>
      <div className="na">
        {i.napAm} · <b>{i.hanh}</b>
      </div>
    </div>
  );
  return (
    <Result
      id="xem-tuoi-sinh-con"
      ask="Hỏi Thầy năm nào nên sinh con"
      onAsk={onAsk}
      onReset={() => setR(null)}
      scenario={{
        type: 'xem-tuoi-sinh-con',
        data: { namBo: parseInt(bo), namMe: parseInt(meYear) },
        label: `Sinh con · bố ${r.previewBo.canChi} × mẹ ${r.previewMe.canChi}`,
        chips: ['Năm nào tốt nhất để sinh con?', 'Vì sao năm đó hợp cả bố lẫn mẹ?', 'Năm nào nên tránh sinh con?', 'Con tuổi gì hợp với bố mẹ nhất?'],
      }}
    >
      <div className="cc-row">
        {card('Bố', r.previewBo)}
        {card('Mẹ', r.previewMe)}
      </div>
      <Block title={r.resultTitle}>
        <div className="res-block-body" style={{ overflowX: 'auto' }}>
          <Html html={r.topRecommendHTML} />
          <table className="year-table">
            <thead>
              <tr>
                <th>Năm</th>
                <th>Can Chi</th>
                <th>Hành</th>
                <th>Đánh Giá</th>
                <th>Lý Do</th>
              </tr>
            </thead>
            <tbody dangerouslySetInnerHTML={{ __html: noLinks(r.tableRowsHTML) }} />
          </table>
        </div>
      </Block>
    </Result>
  );
}

// ── Thần Số Học ────────────────────────────────────────────────────────────
function ThanSo({ mine, onAsk }: ToolProps) {
  const [ten, setTen] = useState(mine?.hoten || '');
  const [ngay, setNgay] = useState(num(mine?.ngay));
  const [thang, setThang] = useState(num(mine?.thang));
  const [nam, setNam] = useState(num(mine?.nam));
  const [error, setError] = useState('');
  const [r, setR] = useState<Extract<ReturnType<typeof web.ThanSoTool.compute>, { ok: true }> | null>(null);
  if (!r)
    return (
      <Form
        error={error}
        onGo={() => {
          const x = web.ThanSoTool.compute(parseInt(ngay), parseInt(thang), parseInt(nam), ten);
          if (x.ok) setR(x);
          else setError(x.error);
        }}
      >
        <Input label="Họ và tên (theo giấy khai sinh)" value={ten} onChange={(e) => setTen(e.target.value)} />
        <div className="tv-row3">
          <Input type="number" inputMode="numeric" label="Ngày" value={ngay} onChange={(e) => setNgay(e.target.value)} />
          <Input type="number" inputMode="numeric" label="Tháng" value={thang} onChange={(e) => setThang(e.target.value)} />
          <Input type="number" inputMode="numeric" label="Năm" value={nam} onChange={(e) => setNam(e.target.value)} />
        </div>
      </Form>
    );
  const d = r.data as Record<string, string | number>;
  return (
    <Result
      id="than-so-hoc"
      ask="Hỏi Thầy luận sâu thần số"
      onAsk={onAsk}
      onReset={() => setR(null)}
      scenario={{
        type: 'than-so-hoc',
        data: r.data,
        label: `Thần số học · ${d.ten}`,
        chips: [
          'Số Đường Đời nói gì về tôi?',
          `Năm ${d.namXemThanSo} của tôi nên làm gì?`,
          'Tôi đang ở chặng nào, thử thách gì?',
          'Biểu đồ ngày sinh tôi thiếu gì?',
          'Nghề nghiệp nào hợp?',
        ],
      }}
    >
      <Block>
        <Html html={r.resultHTML} />
      </Block>
    </Result>
  );
}

// ── Kinh Dịch — gieo 6 hào bằng 3 đồng xu ─────────────────────────────────
function KinhDich({ onAsk }: ToolProps) {
  const [cauHoi, setCauHoi] = useState('');
  const [lines, setLines] = useState<HaoLine[]>([]);
  const done = lines.length === 6;

  if (!done)
    return (
      <section className="tv-card tv-form">
        <Input
          label="Câu hỏi (tuỳ chọn)"
          placeholder="VD: Công việc sắp tới của tôi thế nào?"
          maxLength={100}
          value={cauHoi}
          onChange={(e) => setCauHoi(e.target.value)}
        />
        <p className="tv-muted">
          {lines.length === 0
            ? 'Thành tâm nghĩ về việc muốn hỏi, rồi gieo đủ 6 lần — mỗi lần xác định một hào, từ dưới lên.'
            : `Đã gieo ${lines.length}/6 hào`}
        </p>
        <div className="tv-hao">
          {[...lines].reverse().map((l, i) => (
            <div key={lines.length - i} className={l.changing ? 'tv-hao-dong' : ''}>
              <span className="tv-muted">Hào {lines.length - i}</span>
              <span className={l.yang ? 'tv-hao-duong' : 'tv-hao-am'} />
              {l.changing && <span className="tv-muted">động</span>}
            </div>
          ))}
        </div>
        <Button fullWidth onClick={() => setLines((ls) => [...ls, gieoHao()])}>
          {lines.length === 0 ? 'Gieo hào đầu tiên' : `Gieo hào ${lines.length + 1}`}
        </Button>
      </section>
    );

  const r = web.KinhDichTool.resolve(lines);
  return (
    <Result
      id="kinh-dich"
      ask="Hỏi Thầy luận quẻ theo câu hỏi"
      onAsk={onAsk}
      onReset={() => setLines([])}
      scenario={{
        type: 'kinh-dich',
        data: web.KinhDichTool.railData(r, cauHoi.trim(), lines),
        label: `Gieo quẻ · ${r.que.n}${r.cQue ? ` → ${r.cQue.n}` : ''}`,
        chips: ['Luận quẻ này cho câu hỏi của tôi', 'Hào động nói lên điều gì?', 'Quẻ biến cho thấy xu hướng nào?', 'Nên hành động thế nào lúc này?'],
      }}
    >
      {cauHoi.trim() && <div className="cauhoi-disp">“{cauHoi.trim()}”</div>}
      <Html className="que-grid" html={web.KinhDichTool.gridHTML(r)} />
      <Html html={web.KinhDichTool.anhHTML(r, lines)} />
      <Html html={web.KinhDichTool.docHTML(r, lines)} />
    </Result>
  );
}

/** Thứ tự = thứ tự hiện trong tab Công cụ. `id` = tool_id của web. */
export const NATIVE_TOOLS: NativeTool[] = [
  { id: 'kinh-dich', label: 'Kinh Dịch 64 Quẻ', desc: 'Gieo 6 hào bằng đồng xu, tra quẻ chính, quẻ biến và lời quẻ', View: KinhDich },
  { id: 'kim-lau', label: 'Kim Lâu & Tam Tai', desc: 'Năm nào làm nhà, cưới hỏi được — bảng 20 năm tới', View: KimLau },
  { id: 'bat-trach', label: 'Hướng Bát Trạch', desc: 'Cung mệnh, 4 hướng tốt và 4 hướng xấu cho nhà, bếp, giường', View: BatTrach },
  { id: 'nap-am', label: 'Nạp Âm Ngũ Hành', desc: 'Mệnh theo năm sinh, màu hợp, hướng hợp, tuổi hợp', View: NapAm },
  { id: 'xem-tuoi-sinh-con', label: 'Xem Tuổi Sinh Con', desc: 'Năm sinh con hợp tuổi cả bố và mẹ — 15 năm tới', View: SinhCon },
  { id: 'than-so-hoc', label: 'Thần Số Học', desc: 'Số Đường Đời, Định Mệnh, Linh Hồn và biểu đồ ngày sinh', View: ThanSo },
];
