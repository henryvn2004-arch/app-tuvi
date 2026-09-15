#!/usr/bin/env node
/**
 * scripts/check-payos-signature.mjs — canh ĐÚNG lớp lỗi vừa cắn thật (PR #882):
 * `lib/billing/payos.ts` phải build chuỗi ký giống HỆT payOS build (SDK Node
 * chính thức payOSHQ/payos-lib-node — deep-sort key TRƯỚC, `null`/`undefined`
 * → CHUỖI RỖNG chứ không phải chuỗi "null"/"undefined").
 *
 * Bản cũ tự viết `${k}=${data[k]}` — qua trót lọt với MỌI payload không có
 * field null (mọi lần test tay bằng chuyển khoản ngân hàng thường), chỉ vỡ
 * với field null (ví điện tử như Viettel Money không luôn điền
 * counterAccountBankName/số TK). Bài kiểm cũ tưởng "đã vá checksum key" vì
 * test luôn rơi vào nhánh không-null — nên bộ dò này cố tình test CẢ HAI
 * nhánh, không chỉ nhánh hay gặp.
 *
 * Biên dịch `lib/billing/payos.ts` bằng `tsc` một file (không cần bundler) rồi
 * import thẳng module ĐÃ SHIP — không viết lại thuật toán ở đây để so sánh,
 * tránh vừa test vừa tự sai giống nhau.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const tmp = mkdtempSync(join(tmpdir(), 'check-payos-'));

let failed = false;
function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    failed = true;
    console.error(`✗ ${label}\n  expected: ${expected}\n  actual:   ${actual}`);
  } else {
    console.log(`✓ ${label}`);
  }
}

try {
  // Tsconfig RIÊNG dùng `include`, không nêu file trên dòng lệnh — nêu file
  // trực tiếp làm tsc bỏ qua tsconfig.json gốc của repo và ném TS5112.
  const tsconfigPath = join(tmp, 'tsconfig.json');
  writeFileSync(
    tsconfigPath,
    JSON.stringify({
      compilerOptions: {
        module: 'esnext',
        target: 'es2022',
        moduleResolution: 'bundler',
        outDir: tmp,
        rootDir: join(ROOT, 'lib/billing'),
        types: ['node'],
        typeRoots: [join(ROOT, 'node_modules/@types')],
      },
      include: [join(ROOT, 'lib/billing/payos.ts')],
    })
  );
  execFileSync(
    process.execPath,
    [join(ROOT, 'node_modules/typescript/bin/tsc'), '--project', tsconfigPath],
    { stdio: 'inherit' }
  );

  const mod = await import(join(tmp, 'payos.js'));
  const { signPayOSData, verifyPayOSSignature } = mod;
  const KEY = 'test-checksum-key-khong-phai-that';
  const hmac = (str) => crypto.createHmac('sha256', KEY).update(str).digest('hex');

  // 1) Field null → CHUỖI RỖNG (`b=`), KHÔNG phải "b=null" — chính lỗi đã cắn.
  assertEqual(
    'null → chuỗi rỗng, không phải "null"',
    signPayOSData({ a: 1, b: null }, KEY),
    hmac('a=1&b=')
  );

  // 2) Field undefined → BỎ HẲN key (khác null: null giữ key, undefined bỏ key).
  assertEqual(
    'undefined → bỏ hẳn key khỏi chuỗi',
    signPayOSData({ a: 1, b: undefined }, KEY),
    hmac('a=1')
  );

  // 3) Deep-sort key TRƯỚC khi build chuỗi — thứ tự truyền vào object không ảnh hưởng.
  assertEqual(
    'sort key bất kể thứ tự truyền vào',
    signPayOSData({ b: 2, a: 1 }, KEY),
    signPayOSData({ a: 1, b: 2 }, KEY)
  );

  // 4) Nested object cũng deep-sort key con.
  assertEqual(
    'deep-sort key trong object lồng nhau',
    signPayOSData({ a: { y: 2, x: 1 } }, KEY),
    hmac(`a=${JSON.stringify({ x: 1, y: 2 })}`)
  );

  // 5) Payload ĐẦY ĐỦ field như webhook thật (không null) — mô phỏng lượt test
  //    tay bằng chuyển khoản ngân hàng thường, PHẢI khớp cách build cũ (không
  //    hồi quy hành vi ở nhánh vốn đã chạy đúng).
  const fullPayload = {
    orderCode: 378173725,
    amount: 50000,
    desc: 'thanh toan don hang',
    code: '00',
    counterAccountBankName: 'MB Bank',
    counterAccountNumber: '123456',
  };
  const oldStyleStr = Object.keys(fullPayload)
    .sort()
    .map((k) => `${k}=${fullPayload[k]}`)
    .join('&');
  assertEqual(
    'payload đủ field (không null) khớp cách build cũ — không hồi quy',
    signPayOSData(fullPayload, KEY),
    hmac(oldStyleStr)
  );

  // 6) Payload ví điện tử — CÓ field null (đúng ca thật đã cắn với Viettel Money).
  const eWalletPayload = {
    ...fullPayload,
    counterAccountBankName: null,
    counterAccountNumber: null,
  };
  const wrongOldSig = hmac(
    Object.keys(eWalletPayload)
      .sort()
      .map((k) => `${k}=${eWalletPayload[k]}`)
      .join('&')
  ); // "counterAccountBankName=null" — chữ ký SAI mà bản cũ từng gửi
  const correctSig = signPayOSData(eWalletPayload, KEY);
  if (correctSig === wrongOldSig) {
    failed = true;
    console.error(
      '✗ payload ví điện tử (có null) PHẢI ký khác bản cũ sai — nếu giống nghĩa là bug đã quay lại'
    );
  } else {
    console.log('✓ payload ví điện tử (có null) ký KHÁC bản cũ sai (đúng — bug đã vá)');
  }

  // 7) verifyPayOSSignature: đúng chữ ký → true, sai một ký tự → false.
  assertEqual(
    'verifyPayOSSignature nhận đúng chữ ký thật',
    verifyPayOSSignature({ data: eWalletPayload, signature: correctSig }, KEY),
    true
  );
  assertEqual(
    'verifyPayOSSignature từ chối chữ ký giả/tampered',
    verifyPayOSSignature(
      {
        data: eWalletPayload,
        signature: correctSig.slice(0, -1) + (correctSig.at(-1) === '0' ? '1' : '0'),
      },
      KEY
    ),
    false
  );
  assertEqual(
    'verifyPayOSSignature từ chối khi thiếu data/signature',
    verifyPayOSSignature({}, KEY),
    false
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed) {
  console.error('\ncheck:payossig ĐỎ — xem chi tiết ở trên.');
  process.exit(1);
}
console.log(
  '\ncheck:payossig xanh — chữ ký payOS khớp thuật toán chính thức (deep-sort + null→rỗng).'
);
