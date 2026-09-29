import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Checkbox, DatePicker, Input, Select, Spinner, useSnackbar } from 'zmp-ui';
import { describeBirth, GIO, type Chart } from '../lib/birth';
import { deleteChart, listCharts, myChartId, saveChart, setMyChartId } from '../lib/charts';

export default function ChartsPage({ onAsk }: { onAsk: (c: Chart) => void }) {
  const { openSnackbar } = useSnackbar();
  const [items, setItems] = useState<Chart[] | null>(null);
  const [mine, setMine] = useState(myChartId);
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);

  // `openSnackbar` đổi identity mỗi lần render — để nó trong deps của `reload`
  // là effect bên dưới chạy lại vô hạn (gọi /api/charts liên tục). Giữ qua ref.
  const snack = useRef(openSnackbar);
  snack.current = openSnackbar;
  const fail = useCallback(
    (e: unknown) => snack.current({ text: (e as Error).message, type: 'error' }),
    []
  );

  const reload = useCallback(() => {
    listCharts()
      .then(setItems)
      .catch((e) => {
        setItems([]);
        fail(e);
      });
  }, [fail]);

  useEffect(reload, [reload]);

  const markMine = (id: number | null) => {
    setMyChartId(id);
    setMine(id);
  };

  async function remove(c: Chart) {
    if (confirmDel !== c.id) return setConfirmDel(c.id);
    setConfirmDel(null);
    try {
      await deleteChart(c.id);
      if (mine === c.id) markMine(null);
      reload();
    } catch (e) {
      fail(e);
    }
  }

  if (!items)
    return (
      <div className="tv-center">
        <Spinner />
      </div>
    );

  return (
    <div className="tv-page">
      {adding ? (
        <ChartForm
          onCancel={() => setAdding(false)}
          onSaved={(c, isMine) => {
            if (isMine) markMine(c.id);
            setAdding(false);
            reload();
          }}
          onError={fail}
        />
      ) : (
        <Button fullWidth onClick={() => setAdding(true)}>
          Thêm lá số
        </Button>
      )}

      {items.length === 0 && !adding && (
        <p className="tv-empty">Sổ còn trống. Lá số lưu ở tuviminhbao.com cũng hiện ở đây.</p>
      )}

      {items.map((c) => (
        <section key={c.id} className="tv-card tv-chart">
          <div>
            <strong>{c.label || c.birth.hoten || 'Không tên'}</strong>
            {mine === c.id && <span className="tv-badge tv-good">Của tôi</span>}
          </div>
          <div className="tv-muted">{describeBirth(c.birth)}</div>
          <div className="tv-actions">
            <Button size="small" onClick={() => onAsk(c)}>
              Hỏi Thầy
            </Button>
            {mine !== c.id && (
              <Button size="small" variant="secondary" onClick={() => markMine(c.id)}>
                Đây là tôi
              </Button>
            )}
            <Button size="small" variant="tertiary" type="danger" onClick={() => remove(c)}>
              {confirmDel === c.id ? 'Bấm lần nữa để xoá' : 'Xoá'}
            </Button>
          </div>
        </section>
      ))}
    </div>
  );
}

function ChartForm({
  onSaved,
  onCancel,
  onError,
}: {
  onSaved: (c: Chart, isMine: boolean) => void;
  onCancel: () => void;
  onError: (e: unknown) => void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [gio, setGio] = useState(-1);
  const [gender, setGender] = useState<'nam' | 'nu'>('nam');
  const [isMine, setIsMine] = useState(myChartId() == null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!date) return onError(new Error('Chọn ngày sinh (dương lịch).'));
    setSaving(true);
    try {
      const birth = {
        hoten: name.trim() || undefined,
        ngay: date.getDate(),
        thang: date.getMonth() + 1,
        nam: date.getFullYear(),
        ...(gio >= 0 ? { gioIdx: gio } : {}),
        gioitinh: gender,
      };
      onSaved(await saveChart(name.trim() || (isMine ? 'Tôi' : ''), birth), isMine);
    } catch (e) {
      onError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="tv-card tv-form">
      <h2>Thêm lá số</h2>
      <Input
        label="Tên"
        placeholder="Vd: Mẹ, anh Minh…"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <DatePicker
        label="Ngày sinh (dương lịch)"
        placeholder="Chọn ngày sinh"
        title="Ngày sinh"
        columnsFormat="DD-MM-YYYY"
        startYear={1920}
        endYear={new Date().getFullYear()}
        value={date}
        onChange={setDate}
      />
      <Select label="Giờ sinh" value={gio} onChange={(v) => setGio(Number(v))} closeOnSelect>
        <Select.Option value={-1} title="Không rõ giờ" />
        {GIO.map((g) => (
          <Select.Option key={g.idx} value={g.idx} title={g.label} />
        ))}
      </Select>
      <Select
        label="Giới tính"
        value={gender}
        onChange={(v) => setGender(v === 'nu' ? 'nu' : 'nam')}
        closeOnSelect
      >
        <Select.Option value="nam" title="Nam" />
        <Select.Option value="nu" title="Nữ" />
      </Select>
      <Checkbox
        value="mine"
        label="Đây là lá số của tôi"
        checked={isMine}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsMine(e.target.checked)}
      />
      <div className="tv-actions">
        <Button onClick={submit} loading={saving}>
          Lưu
        </Button>
        <Button variant="tertiary" onClick={onCancel}>
          Huỷ
        </Button>
      </div>
    </section>
  );
}
