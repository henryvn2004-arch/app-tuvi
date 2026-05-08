"""
Tử Vi RAG — Embed + Insert vào Supabase
Chạy trong Codespace: python3 run_embed.py
Cần: OPENAI_API_KEY trong env (đã có sẵn trong Vercel env)
"""
import json, time, urllib.request, urllib.error, os, sys

OPENAI_KEY = os.environ.get("OPENAI_API_KEY") or input("OpenAI API Key: ").strip()
SB_URL = "https://dciwkfdqhhddeymlisey.supabase.co"
SB_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjaXdrZmRxaGhkZGV5bWxpc2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzQ2MzksImV4cCI6MjA4ODgxMDYzOX0._3aXoe0hO-46J1gASUiNv__tWjSzLZFTL0M3-47L26I")

def post_json(url, data, headers):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')

# Load chunks (đặt file chunks_all.json cùng thư mục)
script_dir = os.path.dirname(os.path.abspath(__file__))
chunks_file = os.path.join(script_dir, 'chunks_all.json')
with open(chunks_file, encoding='utf-8') as f:
    chunks = json.load(f)

print(f"Loaded {len(chunks)} chunks")
print(f"  Tân Biên: {sum(1 for c in chunks if 'tan-bien' in c['source'])}")
print(f"  Lục Thập Tinh Hệ: {sum(1 for c in chunks if 'luc-thap' in c['source'])}")

# Resume support: track inserted
done_file = os.path.join(script_dir, '.embed_progress')
done_sources = set()
if os.path.exists(done_file):
    with open(done_file) as f:
        done_sources = set(f.read().splitlines())
    print(f"Resume: {len(done_sources)} chunks đã insert trước đó")

pending = [c for c in chunks if c.get('source','') not in done_sources]
print(f"Cần embed: {len(pending)} chunks\n")

BATCH = 10
ok = 0
err = 0
start = time.time()

for i in range(0, len(pending), BATCH):
    batch = pending[i:i+BATCH]
    texts = [c['content'][:3000] for c in batch]

    # 1. Embed
    status, resp = post_json(
        "https://api.openai.com/v1/embeddings",
        {"input": texts, "model": "text-embedding-3-small", "dimensions": 1024},
        {"Content-Type": "application/json", "Authorization": f"Bearer {OPENAI_KEY}"}
    )
    if status != 200:
        print(f"❌ Embed error: {resp[:120]}")
        err += len(batch)
        time.sleep(2)
        continue

    embeddings = [e['embedding'] for e in json.loads(resp)['data']]

    # 2. Insert to Supabase
    rows = [{"content": c['content'], "source": c['source'], "embedding": emb}
            for c, emb in zip(batch, embeddings)]

    sb_status, sb_resp = post_json(
        f"{SB_URL}/rest/v1/tuvi_docs",
        rows,
        {"Content-Type": "application/json", "apikey": SB_KEY,
         "Authorization": f"Bearer {SB_KEY}", "Prefer": "return=minimal"}
    )

    if sb_status in (200, 201, 204):
        ok += len(batch)
        # Save progress
        with open(done_file, 'a') as f:
            for c in batch:
                f.write(c.get('source','') + '\n')
        elapsed = time.time() - start
        eta = elapsed / ok * (len(pending) - ok) if ok else 0
        pct = (i + len(batch)) / len(pending) * 100
        print(f"✓ {ok}/{len(pending)} ({pct:.0f}%) | ETA: {eta:.0f}s", end='\r')
    else:
        print(f"\n❌ Insert error: {sb_resp[:150]}")
        err += len(batch)

    time.sleep(0.2)

print(f"\n\n{'='*50}")
print(f"✅ Done: {ok} OK | {err} errors")
print(f"Thời gian: {time.time()-start:.0f}s")
if os.path.exists(done_file) and ok == len(pending):
    os.remove(done_file)
    print("Progress file cleaned up")
