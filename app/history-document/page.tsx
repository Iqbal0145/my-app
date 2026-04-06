"use client";

import { useRef, useState } from "react";

/* =========================
   TYPE DEFINITIONS
========================= */
type DocumentItem = {
  id: number;
  name: string;
  image: string;
};

type Person = {
  name: string;
  title: string;
  email: string;
};

/* =========================
   DUMMY DATA
========================= */
const people: Person[] = [
  { name: "Iqbal", title: "Frontend Dev", email: "iqbal@mail.com" },
  { name: "Aldi", title: "Backend Dev", email: "aldi@mail.com" },
  { name: "Rina", title: "UI Designer", email: "rina@mail.com" },
];

/* =========================
   MAIN COMPONENT
========================= */
export default function HistoryDocument() {

  /* ===== STATE ===== */
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<DocumentItem[]>([]);

  /* ===== REFS ===== */
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ===== SEARCH FUNCTION ===== */
  const handleSearch = async () => {
    try {
      const res = await fetch(`/api/search?q=${keyword}`);
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  /* ===== RENDER ===== */
  return (
    <>
      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-row gap-6 px-4 py-6 mt-6">
        <div className="w-full text-center bg-white rounded-xl shadow px-4 py-6">

          {/* Title */}
          <h1 className="text-2xl font-bold mt-2">Daftar Dokumen</h1>

          {/* Search */}
          <div className="text-right mt-6">
            <input
              className="border p-2 rounded-xl mr-2"
              type="text"
              placeholder="Search Dokumen..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />

            <button
              onClick={handleSearch}
              className="bg-blue-500 text-white p-2 rounded-xl"
            >
              Search
            </button>
          </div>

          {/* Search Result */}
          <div className="mt-6">
            {results.map((item) => (
              <div key={item.id}>{item.name}</div>
            ))}
          </div>

          {/* Table */}
          <table className="mt-10 w-full border">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Document</th>
                <th className="border p-2">Info</th>
              </tr>
            </thead>

            <tbody>
              {people.map((person) => (
                <tr key={person.email} className="odd:bg-white even:bg-gray-50">
                  <td className="border p-2">{person.name}</td>
                  <td className="border p-2">{person.title}</td>
                  <td className="border p-2">{person.email}</td>
                  <td className="border p-2">Detail</td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>
      </div>
    </>
  );
}
