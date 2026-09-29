// Câu trả lời của Thầy là markdown nhẹ (đoạn, **đậm**, gạch đầu dòng). Dựng
// thành React node — KHÔNG dùng innerHTML với chữ từ server.
import { Fragment, type ReactNode } from 'react';

function inline(s: string): ReactNode[] {
  return s
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      )
    );
}

export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/^#+\s*/gm, '').split(/\n{2,}/);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split('\n').filter((l) => l.trim());
        if (lines.length && lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{inline(lines.join(' '))}</p>;
      })}
    </>
  );
}
