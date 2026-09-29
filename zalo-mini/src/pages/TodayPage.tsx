import { useEffect, useState } from 'react';
import { Button, Spinner } from 'zmp-ui';
import { toBirthParams, type Chart } from '../lib/birth';
import { loadMyChart } from '../lib/charts';
import { fetchVanNgay, type VanNgay } from '../lib/van-ngay';

const TONE: Record<VanNgay['danhGia']['tinhChat'], string> = {
  tốt: 'good',
  xấu: 'bad',
  bình: 'mid',
};

export default function TodayPage({
  onOpenCharts,
  onAsk,
}: {
  onOpenCharts: () => void;
  onAsk: () => void;
}) {
  const [mine, setMine] = useState<Chart | null>(null);
  const [data, setData] = useState<VanNgay | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      // Không đọc được Sổ (chưa đăng nhập được) thì vẫn xem được tầng NGÀY.
      const chart = await loadMyChart().catch(() => null);
      const d = await fetchVanNgay(toBirthParams(chart?.birth));
      if (alive) {
        setMine(chart);
        setData(d);
      }
    })().catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <p className="tv-empty">{error}</p>;
  if (!data)
    return (
      <div className="tv-center">
        <Spinner />
      </div>
    );

  const { ngay, danhGia, caNhan } = data;
  return (
    <div className="tv-page">
      <section className="tv-card tv-hero">
        <div className="tv-muted">
          {ngay.thu}, {ngay.duong} · {ngay.am}
        </div>
        <h1>Ngày {ngay.canChi}</h1>
        <span className={`tv-badge tv-${TONE[danhGia.tinhChat]}`}>Ngày {danhGia.tinhChat}</span>
        <p>{danhGia.nhan}</p>
      </section>

      {caNhan ? (
        <section className="tv-card">
          <h2>Riêng {mine?.label || 'bạn'}</h2>
          <p>
            Nhật hạn vào cung <strong>{caNhan.cungNhatHan}</strong>
            {caNhan.chinhTinh.length > 0 && <> ({caNhan.chinhTinh.join(', ')})</>}
            {caNhan.linhVuc && <> — hôm nay chú ý chuyện {caNhan.linhVuc}.</>}
          </p>
          {caNhan.bixung && <p className="tv-warn">⚠ Ngày xung tuổi bạn — việc lớn nên dời.</p>}
          {caNhan.cachCuc && (
            <p>
              <strong>{caNhan.cachCuc.ten}:</strong> {caNhan.cachCuc.tomTat}
            </p>
          )}
        </section>
      ) : (
        <section className="tv-card tv-cta">
          <p>Lưu lá số của bạn để xem vận riêng mỗi ngày.</p>
          <Button size="small" onClick={onOpenCharts}>
            Lưu lá số
          </Button>
        </section>
      )}

      <section className="tv-card">
        <h2>Nên làm</h2>
        <ul>
          {data.nen.slice(0, 5).map((x) => (
            <li key={x.ten}>{x.ten}</li>
          ))}
        </ul>
        <h2>Nên tránh</h2>
        <ul>
          {data.kieng.slice(0, 5).map((x) => (
            <li key={x.ten}>{x.ten}</li>
          ))}
        </ul>
      </section>

      <section className="tv-card">
        <h2>Giờ tốt</h2>
        <p>{data.gioTot.map((g) => `${g.chi} (${g.range})`).join(' · ')}</p>
        <h2>Sao ngày</h2>
        <p>
          <strong>{data.saoNgay.ten}</strong> — {data.saoNgay.yNghia}
        </p>
        <p className="tv-muted">
          Xung tuổi {data.xung.chi} · Hỷ thần {data.huong.hyThan} · Tài thần {data.huong.taiThan} ·
          Màu hợp {data.mau.list.join(', ')}
        </p>
        {data.ngayKy.length > 0 && <p className="tv-warn">⚠ {data.ngayKy.join(', ')}</p>}
      </section>

      <Button fullWidth onClick={onAsk}>
        Hỏi Thầy về hôm nay
      </Button>
    </div>
  );
}
