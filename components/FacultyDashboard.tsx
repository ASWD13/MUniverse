"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import MainLayout from "./MainLayout";
import { DashboardCard, FormInput, PrimaryButton } from "./UIElements";

type NoticeFormState = {
  noticeTitle: string;
  selectedClass: string;
  noticeContent: string;
  scheduledDate: string;
  attachment: File | null;
};

type Notice = {
  id: number;
  title: string;
  course: string;
  content: string;
  postedDate: string;
  acknowledgments: number;
  totalStudents: number;
};

const initialFormState: NoticeFormState = {
  noticeTitle: "",
  selectedClass: "",
  noticeContent: "",
  scheduledDate: "",
  attachment: null,
};

const initialNotices: Notice[] = [
  {
    id: 3,
    title: "Database Project Deadline Extended",
    course: "DBMS-301",
    content:
      "The database project deadline has been extended to April 10th. Ensure your schemas are normalized to 3NF.",
    postedDate: "2026-03-28",
    acknowledgments: 35,
    totalStudents: 45,
  },
  {
    id: 2,
    title: "Networking Lab Session Rescheduled",
    course: "Computer Networks-202",
    content:
      "This week's networking lab has moved to Thursday at 2:00 PM. Please bring your lab notebooks.",
    postedDate: "2026-03-27",
    acknowledgments: 28,
    totalStudents: 38,
  },
  {
    id: 1,
    title: "OS Assignment 2 Released",
    course: "Operating Systems-101",
    content:
      "Assignment 2 is now available on the portal. Due date is April 3rd.",
    postedDate: "2026-03-26",
    acknowledgments: 42,
    totalStudents: 52,
  },
];

function toDatePart(value: string) {
  return value.split("T")[0] ?? value;
}

export default function FacultyDashboard() {
  const [formData, setFormData] = useState<NoticeFormState>(initialFormState);
  const [notices, setNotices] = useState<Notice[]>(initialNotices);
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setFormData((current) => ({ ...current, attachment: file }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingNoticeId(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingNoticeId) {
      setNotices((current) =>
        current.map((notice) =>
          notice.id === editingNoticeId
            ? {
                ...notice,
                title: formData.noticeTitle,
                course: formData.selectedClass,
                content: formData.noticeContent,
                postedDate: toDatePart(formData.scheduledDate),
              }
            : notice,
        ),
      );
      resetForm();
      return;
    }

    const nextId = notices.reduce((max, notice) => Math.max(max, notice.id), 0) + 1;

    const newNotice: Notice = {
      id: nextId,
      title: formData.noticeTitle,
      course: formData.selectedClass,
      content: formData.noticeContent,
      postedDate: toDatePart(formData.scheduledDate),
      acknowledgments: 0,
      totalStudents: Math.floor(Math.random() * 30) + 30,
    };

    setNotices((current) => [newNotice, ...current]);
    resetForm();
  };

  const handleDeleteNotice = (id: number) => {
    if (!globalThis.confirm("Are you sure you want to delete this notice?")) {
      return;
    }

    setNotices((current) => current.filter((notice) => notice.id !== id));
  };

  const handleEditNotice = (notice: Notice) => {
    setFormData({
      noticeTitle: notice.title,
      selectedClass: notice.course,
      noticeContent: notice.content,
      scheduledDate: `${notice.postedDate}T10:00`,
      attachment: null,
    });

    setEditingNoticeId(notice.id);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <MainLayout roleLabel="Faculty">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Welcome back, Faculty!</h1>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-rose-600">My Classes</h2>
            <ul className="space-y-3">
              <li className="rounded border-l-4 border-blue-500 bg-slate-50 p-3 text-sm">
                DBMS-301 - 45 Students
              </li>
              <li className="rounded border-l-4 border-blue-500 bg-slate-50 p-3 text-sm">
                Computer Networks-202 - 38 Students
              </li>
              <li className="rounded border-l-4 border-blue-500 bg-slate-50 p-3 text-sm">
                Operating Systems-101 - 52 Students
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-rose-600">Pending Drafts</h2>
            <div className="space-y-2">
              <button className="w-full rounded border p-2 text-left text-sm hover:bg-slate-50">
                Lab Session Rescheduled - Draft
              </button>
              <button className="w-full rounded border p-2 text-left text-sm hover:bg-slate-50">
                Assignment 3 Due Date Extension - Draft
              </button>
            </div>
          </section>
        </div>

        <DashboardCard title="Create Classroom Notice" tone="rose">
          <p className="mb-6 text-sm text-slate-600">Post updates to your students</p>

          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <FormInput
              label="Notice Title"
              type="text"
              name="noticeTitle"
              placeholder="e.g., Lab Rescheduled"
              value={formData.noticeTitle}
              onChange={handleInputChange}
              required
            />

            <div className="flex w-full flex-col space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Select Class</label>
              <select
                name="selectedClass"
                value={formData.selectedClass}
                onChange={handleInputChange}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:ring-2 focus:ring-rose-500"
                required
              >
                <option value="">-- Choose a Class --</option>
                <option value="DBMS-301">DBMS-301</option>
                <option value="Computer Networks-202">Computer Networks-202</option>
                <option value="Operating Systems-101">Operating Systems-101</option>
              </select>
            </div>

            <div className="flex w-full flex-col space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Notice Content</label>
              <textarea
                name="noticeContent"
                placeholder="Write your notice here..."
                value={formData.noticeContent}
                onChange={handleInputChange}
                rows={5}
                className="resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            <FormInput
              label="Scheduled Date & Time"
              type="datetime-local"
              name="scheduledDate"
              value={formData.scheduledDate}
              onChange={handleInputChange}
              required
            />

            <div className="flex w-full flex-col space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">
                Add Attachment (Optional)
              </label>
              <input
                type="file"
                name="attachment"
                onChange={handleFileChange}
                className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none transition-all focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-4">
              <PrimaryButton type="submit">
                {editingNoticeId ? "Update Notice" : "Post Notice to Class"}
              </PrimaryButton>
            </div>
          </form>
        </DashboardCard>

        <section className="mt-8">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">Posted Notices</h2>

          {notices.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="font-semibold text-slate-500">No notices posted yet</p>
              <p className="mt-2 text-sm text-slate-400">
                Create and post your first notice above.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {notices.map((notice) => (
                <DashboardCard key={notice.id} title={notice.title} tone="rose">
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-slate-700">{notice.content}</p>

                    <div className="flex flex-wrap gap-6 border-y border-slate-200 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-slate-500">Class:</span>
                        <span className="text-sm font-semibold text-rose-600">{notice.course}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">{notice.postedDate}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">
                            {notice.acknowledgments}
                          </span>
                          /{notice.totalStudents} acknowledged
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleEditNotice(notice)}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </DashboardCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
