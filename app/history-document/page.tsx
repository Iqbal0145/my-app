"use client";

import { useRef, useState, useEffect } from "react";

/* =========================
   TYPE DEFINITIONS
========================= */
type DocumentItem = {
  id: number;
  prodnum: string;
  created_at: string;
};

/* =========================
   MAIN COMPONENT
========================= */
export default function HistoryDocument() {
  /* ===== STATE ===== */
  const [keyword, setKeyword] = useState("");
  const [data, setData] = useState<DocumentItem[]>([]); // data asli
  const [results, setResults] = useState<DocumentItem[]>([]); // data tampil

  /* ===== REFS ===== */
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ===== FETCH DATA ===== */
  const fetchData = async () => {
    try {
      const res = await fetch("http://127.0.0.1:5000/prodnum");

      if (!res.ok) {
        throw new Error("Gagal fetch data");
      }

      const result = await res.json();

      // pastikan array
      setData(result || []);
      setResults(result || []);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  /* ===== LOAD AWAL ===== */
  useEffect(() => {
    fetchData();
  }, []);

  /* ===== SEARCH ===== */
  const handleSearch = () => {
    if (!keyword) {
      setResults(data); // reset
      return;
    }

    const filtered = data.filter((item) =>
      item.prodnum.toLowerCase().includes(keyword.toLowerCase()),
    );

    setResults(filtered);
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
              placeholder="Search Nomor Produksi..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />

            <button
              onClick={handleSearch}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl"
            >
              Search
            </button>
          </div>

          {/* Table */}
          <table className="mt-10 w-full border">
            <thead className="bg-gray-200">
              <tr>
                <th className="border p-2">No</th>
                <th className="border p-2">Nomor Produksi</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Info</th>
              </tr>
            </thead>

            <tbody>
              {results.length > 0 ? (
                results.map((item, index) => (
                  <tr key={item.id} className="odd:bg-white even:bg-gray-50">
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2">{item.prodnum}</td>
                    <td className="border p-2">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="border p-2">
                      <a
                        href={`/history-document/${item.id}`}
                        className="bg-green-500 text-white px-3 py-1 rounded"
                      >
                        Detail
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center p-4">
                    Data tidak ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
