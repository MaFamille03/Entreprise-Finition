import type { ReactNode } from 'react';

export function Page({ title, description, action, children }: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {description && <div className="muted">{description}</div>}
        </div>
        {action}
      </div>
      {children}
    </>
  );
}
