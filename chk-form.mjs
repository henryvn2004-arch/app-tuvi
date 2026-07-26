import { chromium } from '@playwright/test';
const br=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await br.newPage({viewport:{width:430,height:900}});
await pg.goto('http://127.0.0.1:8899/app-chan-dung-tien-kiep.html',{waitUntil:'networkidle'});
const r=await pg.evaluate(()=>{
  const fg=document.querySelector('#tuviFormHost .fg');
  const cs=fg?getComputedStyle(fg):null;
  const lb=fg?.querySelector('label'), inp=fg?.querySelector('input,select');
  const lcs=lb?getComputedStyle(lb):null, ics=inp?getComputedStyle(inp):null;
  return {
    fgCount: document.querySelectorAll('#tuviFormHost .fg').length,
    fgDisplay: cs?.display, fgDirection: cs?.flexDirection,
    labelUpper: lcs?.textTransform, labelSize: lcs?.fontSize,
    inputRadius: ics?.borderRadius, inputBorder: ics?.borderTopWidth,
    eraPicker: !!document.getElementById('eraPick'),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
console.log(JSON.stringify(r,null,1));
const ok = r.fgDisplay==='flex' && r.fgDirection==='column' && r.labelUpper==='uppercase'
        && r.inputRadius!=='0px' && !r.eraPicker && !r.overflowX;
console.log(ok ? '\n✅ Form khớp chuẩn shell, không còn nút chọn bối cảnh, không tràn ngang'
               : '\n❌ CHƯA ĐẠT');
await pg.screenshot({path:'/tmp/claude-0/-home-user-app-tuvi/41fb11fd-2086-5da3-a8bd-e6df9929702b/scratchpad/form.png'});
await br.close(); process.exit(ok?0:1);
