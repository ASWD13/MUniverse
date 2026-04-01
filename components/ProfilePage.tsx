import MainLayout from "./MainLayout";

export default function ProfilePage() {
  return (
    <MainLayout roleLabel="User">
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center space-x-6 border-b pb-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-3xl font-bold text-blue-600">
            MU
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student</h1>
            <p className="text-slate-500">Student ID: MU2026-001</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Email Address
            </label>
            <p className="rounded border bg-slate-50 p-3 text-slate-700">student@mahindra.edu</p>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Primary Role
            </label>
            <p className="rounded border bg-slate-50 p-3 text-slate-700">Student</p>
          </div>
        </div>

        <button className="mt-8 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700">
          Edit Profile
        </button>
      </div>
    </MainLayout>
  );
}
