type ModulePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: Array<{
    title: string;
    description: string;
    state: string;
  }>;
};

export function ModulePage({ eyebrow, title, description, items }: ModulePageProps) {
  return (
    <div className="page-wrap">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="subcopy">{description}</p>
        </div>
      </header>

      <section className="module-grid">
        {items.map((item) => (
          <article className="panel module-card" key={item.title}>
            <div>
              <p className="eyebrow">{item.state}</p>
              <h2>{item.title}</h2>
            </div>
            <p>{item.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
