export const metadata = {
  title: "Умови використання — Розіграш Instagram",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed">
      <h1 className="mb-6 text-2xl font-semibold">Умови використання</h1>

      <p className="mb-4 text-muted-foreground">Востаннє оновлено: 2026</p>

      <p className="mb-4">
        «Розіграш Instagram» — простий інструмент для проведення чесних
        розіграшів серед коментарів власних публікацій в Instagram, з
        випадковим вибором переможців.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold">Використання застосунку</h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>Застосунок надається «як є», без жодних гарантій.</li>
        <li>Ви входите лише під власним акаунтом Instagram і працюєте лише зі своїми публікаціями.</li>
        <li>
          Проводячи розіграш, ви самостійно відповідаєте за дотримання
          правил Instagram щодо розіграшів (Instagram Promotion Guidelines)
          та застосовного законодавства.
        </li>
        <li>Застосунок не гарантує безперервної роботи Instagram API третьої сторони (Meta).</li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-semibold">Дані</h2>
      <p className="mb-4">
        Опис того, які дані використовує застосунок і як, наведено в{" "}
        <a className="underline" href="/privacy">Політиці конфіденційності</a>.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold">Контакти</h2>
      <p className="mb-4">
        Питання щодо цих умов: <a className="underline" href="mailto:pavelokhmak@gmail.com">pavelokhmak@gmail.com</a>.
      </p>
    </main>
  );
}
