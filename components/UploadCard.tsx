"use client";

import { useState } from "react";
import PdfUploadForm from "./PdfUploadForm";
import PasteTextForm from "./PasteTextForm";

type Tab = "pdf" | "text";

export default function UploadCard() {
  const [tab, setTab] = useState<Tab>("pdf");

  return (
    <div className="rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-6 pt-5">
        <h2 className="text-lg font-semibold">Add a recipe</h2>
        <p className="mt-1 text-sm text-stone-500">
          Upload a PDF, or paste the text and attach photos.
        </p>
        <nav className="-mb-px mt-4 flex gap-6 text-sm">
          <TabButton active={tab === "pdf"} onClick={() => setTab("pdf")}>
            Upload PDF
          </TabButton>
          <TabButton active={tab === "text"} onClick={() => setTab("text")}>
            Paste text
          </TabButton>
        </nav>
      </div>
      <div className="p-6">
        {tab === "pdf" ? <PdfUploadForm /> : <PasteTextForm />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 pb-3 font-medium ${
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-stone-500 hover:text-stone-700"
      }`}
    >
      {children}
    </button>
  );
}
