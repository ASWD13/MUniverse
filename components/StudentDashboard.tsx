import MainLayout from "./MainLayout";

export default function StudentDashboard() {
  return (
    <MainLayout roleLabel="Student">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Welcome back, Student!</h1>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-rose-600">Latest Announcements</h2>
            <ul className="space-y-3">
              <li className="rounded border-l-4 border-blue-500 bg-slate-50 p-3 text-sm">
                End semester exam schedule is out.
              </li>
              <li className="rounded border-l-4 border-blue-500 bg-slate-50 p-3 text-sm">
                Holiday declared for the upcoming festival.
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-rose-600">Academic Resources</h2>
            <div className="space-y-2">
              <button className="w-full rounded border p-2 text-left text-sm hover:bg-slate-50">
                Computer Science - Lecture 04.pdf
              </button>
              <button className="w-full rounded border p-2 text-left text-sm hover:bg-slate-50">
                Database Management - Assignment 1.docx
              </button>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
