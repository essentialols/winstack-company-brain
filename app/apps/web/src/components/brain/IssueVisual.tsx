import type { IssueVisual as IssueVisualData } from '@app-starter/shared';

const Caption = ({ text }: { text?: string }) =>
  text ? (
    <p className="oib-eyebrow" style={{ margin: '0 0 .45rem', fontSize: '.72rem' }}>
      {text}
    </p>
  ) : null;

/** Renders an IssueVisual (table | grid | bars) in the Main.dc.html style. */
export const IssueVisual = ({ visual }: { visual: IssueVisualData }) => {
  if (visual.type === 'table') {
    return (
      <div style={{ overflowX: 'auto', margin: '0 0 1.1rem' }}>
        <table className="oib-table">
          {visual.caption && (
            <caption>
              <span className="oib-eyebrow" style={{ fontSize: '.72rem' }}>
                {visual.caption}
              </span>
            </caption>
          )}
          <thead>
            <tr>
              {visual.columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={cellIndex > 0 ? { fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '.9rem' } : undefined}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (visual.type === 'grid') {
    return (
      <figure style={{ margin: '0 0 1.1rem' }}>
        {visual.caption && (
          <figcaption>
            <Caption text={visual.caption} />
          </figcaption>
        )}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))', gap: '.6rem' }}>
          {visual.cells.map((cell) => (
            <li key={cell.title} style={{ border: '1px solid var(--rule)', borderRadius: 8, padding: '.75rem .9rem' }}>
              <p style={{ margin: '0 0 .2rem', fontFamily: 'var(--f-display)', fontWeight: 700, fontSize: '1rem' }}>{cell.title}</p>
              <p className="oib-eyebrow" style={{ fontSize: '.74rem', letterSpacing: '.06em' }}>
                {cell.sub}
              </p>
            </li>
          ))}
        </ul>
      </figure>
    );
  }

  const max = Math.max(...visual.bars.map((bar) => bar.value), 0) || 1;
  return (
    <figure style={{ margin: '0 0 1.1rem' }}>
      {visual.caption && (
        <figcaption>
          <Caption text={visual.caption} />
        </figcaption>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
        {visual.bars.map((bar) => {
          const valueText = `${bar.value}${visual.unit ? ` ${visual.unit}` : ''}`;
          return (
            <li key={bar.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(6rem, 38%) 1fr', gap: '.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '.95rem', lineHeight: 1.3 }}>{bar.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem', minWidth: 0 }}>
                <span
                  aria-hidden="true"
                  style={{
                    height: 14,
                    width: `${Math.max(2, (bar.value / max) * 100)}%`,
                    maxWidth: 'calc(100% - 4rem)',
                    borderRadius: 3,
                    background: bar.highlight ? 'var(--accent)' : 'var(--box-line)',
                  }}
                />
                <span className="oib-meta" style={{ letterSpacing: '.04em', color: bar.highlight ? 'var(--accent)' : 'var(--muted)' }}>
                  {valueText}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
};
