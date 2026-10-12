"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { SERVICE_OPTIONS, enquirySchema, type EnquiryInput } from "@/lib/validation/enquiry";
import { Toaster, toast } from "sonner";
import { submitEnquiry } from "@/app/(site)/contact/actions";
import { publicWhatsapp, waHref } from "@/config/site";

const labelClass = "meta mb-1.5 block text-ink";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="meta mt-1.5 font-normal text-destructive">
      {message}
    </p>
  );
}

export function PickupForm() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { name: "", phone: "", email: "", company: "", message: "", website: "" },
  });

  // Optional prefill from links such as the EPR calculator: /contact?service=…&message=…
  // Read after mount so the contact page stays static. Nothing is submitted automatically.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const service = q.get("service");
    const message = q.get("message");
    if (service && SERVICE_OPTIONS.includes(service)) setValue("service", service);
    if (message) setValue("message", message.slice(0, 1000));
  }, [setValue]);

  const onSubmit = (values: EnquiryInput) =>
    startTransition(async () => {
      setStatus(null);
      const res = await submitEnquiry(values);
      if (res.ok) {
        reset();
        setStatus({ ok: true, message: "Thank you. We have your request and will reply within 24 hours." });
        toast.success("Request received. We will reply within 24 hours.");
        return;
      }
      for (const [field, message] of Object.entries(res.fieldErrors ?? {})) {
        setError(field as keyof EnquiryInput, { message });
      }
      setStatus({ ok: false, message: res.error });
      toast.error(res.error ?? "Something went wrong. Please try again.");
    });

  if (status?.ok) {
    return (
      <div role="status" className="rounded-xl border border-line bg-white p-8">
        <Toaster position="bottom-center" richColors closeButton />
        <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-evergreen-700" />
        <h3 className="mt-3">Request received</h3>
        <p className="mt-2 text-ink/85">{status.message}</p>
        <button type="button" onClick={() => setStatus(null)} className="btn btn-secondary mt-6">
          Send another request
        </button>
      </div>
    );
  }

  const aria = (name: keyof EnquiryInput) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-xl border border-line bg-white p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>
            Your name
          </label>
          <input id="name" autoComplete="name" className="field" {...register("name")} {...aria("name")} />
          <FieldError id="name-error" message={errors.name?.message} />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>
            Phone number
          </label>
          <input id="phone" type="tel" autoComplete="tel" placeholder="+91" className="field" {...register("phone")} {...aria("phone")} />
          <FieldError id="phone-error" message={errors.phone?.message} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email address <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input id="email" type="email" autoComplete="email" className="field" {...register("email")} {...aria("email")} />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>
        <div>
          <label htmlFor="company" className={labelClass}>
            Company or organisation <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input id="company" autoComplete="organization" className="field" {...register("company")} />
        </div>
      </div>

      <div>
        <label htmlFor="service" className={labelClass}>
          Service required
        </label>
        <select id="service" className="field" defaultValue="" {...register("service")} {...aria("service")}>
          <option value="" disabled>
            Select a service
          </option>
          {SERVICE_OPTIONS.map(o => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <FieldError id="service-error" message={errors.service?.message} />
      </div>

      <div>
        <label htmlFor="message" className={labelClass}>
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          placeholder="Type of waste, approximate quantity and pickup location"
          className="field min-h-32 resize-y"
          {...register("message")}
          {...aria("message")}
        />
        <FieldError id="message-error" message={errors.message?.message} />
      </div>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div>
        <label className="flex items-start gap-3 text-ink/85">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-evergreen-700" {...register("consent")} {...aria("consent")} />
          <span>
            You may contact me about this request. See our{" "}
            <Link href="/privacy-policy" className="font-semibold text-evergreen-700 underline underline-offset-4">
              privacy policy
            </Link>
            .
          </span>
        </label>
        <FieldError id="consent-error" message={errors.consent?.message} />
      </div>

      {status && !status.ok && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
          {status.message}
          {publicWhatsapp && (
            <>
              {" "}
              <a href={waHref(publicWhatsapp)} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                Open WhatsApp
              </a>
            </>
          )}
        </p>
      )}

      <Toaster position="bottom-center" richColors closeButton />
      <button type="submit" disabled={pending} className="btn btn-primary w-full sm:w-auto">
        {pending ? "Sending" : "Send request"}
      </button>
    </form>
  );
}
