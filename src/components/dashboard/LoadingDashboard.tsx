export function LoadingDashboard() {
  return (
    <main className="app-shell" aria-busy="true" aria-label="Cargando pronóstico">
      <div className="skeleton h-[25rem] rounded-[2rem]" />
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton h-72 rounded-[1.5rem]" />
        ))}
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="skeleton h-[31rem] rounded-[1.5rem]" />
        <div className="skeleton h-[31rem] rounded-[1.5rem]" />
      </div>
    </main>
  );
}
