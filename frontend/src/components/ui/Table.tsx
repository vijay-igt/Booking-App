import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ children, className = '', ...rest }) => {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] ${className}`.trim()}
      {...rest}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-[var(--text-secondary)]">
          {children}
        </table>
      </div>
    </div>
  );
};

interface TableSectionProps {
  children: React.ReactNode;
}

export const THead: React.FC<TableSectionProps> = ({ children }) => (
  <thead className="bg-neutral-900 text-[var(--text-primary)] text-xs uppercase tracking-wide">
    {children}
  </thead>
);

export const TBody: React.FC<TableSectionProps> = ({ children }) => (
  <tbody className="divide-y divide-[var(--border)]">{children}</tbody>
);

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export const TR: React.FC<RowProps> = ({ children, className = '', ...rest }) => (
  <tr className={`hover:bg-neutral-900/70 transition-colors ${className}`.trim()} {...rest}>
    {children}
  </tr>
);

type THProps = React.ThHTMLAttributes<HTMLTableHeaderCellElement>;
type TDProps = React.TdHTMLAttributes<HTMLTableCellElement>;

export const TH: React.FC<THProps> = ({ children, className = '', ...rest }) => (
  <th className={`px-5 py-3 font-semibold ${className}`.trim()} scope="col" {...rest}>
    {children}
  </th>
);

export const TD: React.FC<TDProps> = ({ children, className = '', ...rest }) => (
  <td className={`px-5 py-3 align-middle ${className}`.trim()} {...rest}>
    {children}
  </td>
);
