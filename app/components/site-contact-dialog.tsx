"use client";

import { useState, type FormEvent } from "react";
import { AdminDialog } from "@/app/components/admin-dialog";
import { useFeedbackToast } from "@/app/components/feedback-toast";
import { accountName, type AccountProfile } from "@/app/lib/auth/profile";
import { sendContactMessage } from "@/app/lib/contact/actions";
import { useLanguage } from "@/app/lib/language";

export function SiteContactDialog({ account, onClose }: { account: AccountProfile; onClose: () => void }) {
  const { t } = useLanguage();
  const { showFeedback } = useFeedbackToast();
  const [name, setName] = useState(() => accountName(account));
  const [email, setEmail] = useState(account.email);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    const form = new FormData();
    form.set("name", name);
    form.set("email", email);
    form.set("subject", subject);
    form.set("message", message);
    const result = await sendContactMessage(form);
    setPending(false);
    if (!result.ok) {
      showFeedback({ message: t(result.error), variant: "error" });
      return;
    }
    showFeedback({ message: t("landing.contact.sent"), variant: "success" });
    onClose();
  }

  return (
    <AdminDialog open title={t("landing.contact.title")} lead={t("landing.contact.lead")} onClose={pending ? () => undefined : onClose} closeButton>
      <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <div className="grid grid-cols-2 gap-4">
          <label className="grid gap-1.5 text-sm font-medium">
            {t("landing.contact.name")}
            <input
              required
              name="name"
              maxLength={80}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 w-full rounded-lg bg-paper px-3 text-sm font-normal ring-1 ring-line"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">
            {t("auth.email")}
            <input
              required
              name="email"
              type="email"
              maxLength={200}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 w-full rounded-lg bg-paper px-3 text-sm font-normal ring-1 ring-line"
            />
          </label>
        </div>
        <label className="grid gap-1.5 text-sm font-medium">
          {t("admin.email.subject")}
          <input
            required
            name="subject"
            maxLength={120}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="h-11 w-full rounded-lg bg-paper px-3 text-sm font-normal ring-1 ring-line"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          {t("landing.contact.message")}
          <textarea
            required
            name="message"
            rows={5}
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="rounded-lg bg-paper px-3 py-2 text-sm font-normal ring-1 ring-line"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-line hover:bg-ice disabled:cursor-not-allowed disabled:opacity-60">
            {t("actions.cancel")}
          </button>
          <button type="submit" disabled={pending} className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-60">
            {t("landing.contact.send")}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
