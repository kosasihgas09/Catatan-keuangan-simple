
const STORAGE_KEY = "catatanKeuanganSimple_v1";

const $ = (id) => document.getElementById(id);

const rupiah = (nilai) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(nilai);

function tanggalHariIni() {
  const sekarang = new Date();
  const offset = sekarang.getTimezoneOffset() * 60000;
  return new Date(sekarang.getTime() - offset)
    .toISOString().slice(0, 10);
}

function dataAwal() {
  return {
    openingBalance: 0,
    transactions: []
  };
}

function bacaData() {
  try {
    const isi = localStorage.getItem(STORAGE_KEY);

    if (!isi) return dataAwal();

    const data = JSON.parse(isi);

    if (
      !data ||
      !Number.isSafeInteger(data.openingBalance) ||
      data.openingBalance < 0 ||
      !Array.isArray(data.transactions)
    ) {
      throw new Error("Format data tidak sesuai.");
    }

    const valid = data.transactions.every((t) =>
      t &&
      typeof t.id === "string" &&
      (t.type === "income" || t.type === "expense") &&
      Number.isSafeInteger(t.amount) &&
      t.amount > 0 &&
      typeof t.note === "string" &&
      typeof t.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(t.date)
    );

    if (!valid) throw new Error("Transaksi tidak valid.");

    return data;
  } catch (error) {
    alert(
      "Data keuangan tidak bisa dibaca. " +
      "Data lama tidak dihapus. Periksa penyimpanan browser."
    );
    throw error;
  }
}

let data = bacaData();

function simpanData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    alert(
      "Data gagal disimpan. Penyimpanan browser mungkin penuh. " +
      "Jangan tutup halaman sebelum masalah diperiksa."
    );
    return false;
  }
}

function hitungSaldo() {
  return data.transactions.reduce((saldo, t) => {
    return saldo + (
      t.type === "income" ? t.amount : -t.amount
    );
  }, data.openingBalance);
}

function totalJenis(jenis) {
  return data.transactions
    .filter((t) => t.type === jenis)
    .reduce((total, t) => total + t.amount, 0);
}

function formatTanggal(tanggal) {
  const bagian = tanggal.split("-").map(Number);
  return new Date(
    bagian[0], bagian[1] - 1, bagian[2]
  ).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function aman(teks) {
  return String(teks).replace(/[&<>"']/g, (karakter) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[karakter]);
}

function render() {
  $("balance").textContent = rupiah(hitungSaldo());
  $("incomeTotal").textContent = rupiah(totalJenis("income"));
  $("expenseTotal").textContent = rupiah(totalJenis("expense"));
  $("openingBalance").value = data.openingBalance;

  const history = $("history");
  history.replaceChildren();

  if (data.transactions.length === 0) {
    const kosong = document.createElement("div");
    kosong.className = "empty";
    kosong.textContent =
      "Belum ada transaksi. Silakan catat pemasukan atau pengeluaran.";
    history.appendChild(kosong);
    return;
  }

  const terbaru = [...data.transactions].sort((a, b) =>
    b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
  );

  terbaru.forEach((t) => {
    const item = document.createElement("div");
    item.className = "transaction";

    const tanda = t.type === "income" ? "+" : "−";
    const kelas = t.type === "income" ? "amount-in" : "amount-out";
    const jenis = t.type === "income" ? "Pemasukan" : "Pengeluaran";

    item.innerHTML = `
      <div class="transaction-info">
        <strong>${aman(t.note)}</strong>
        <small>${jenis} • ${formatTanggal(t.date)}</small>
      </div>
      <div class="transaction-right">
        <span class="transaction-amount ${kelas}">
          ${tanda} ${rupiah(t.amount)}
        </span>
        <button class="delete-one" type="button"
          data-delete="${aman(t.id)}">Hapus</button>
      </div>
    `;

    history.appendChild(item);
  });
}

$("date").value = tanggalHariIni();

$("saveOpening").addEventListener("click", () => {
  const nilai = $("openingBalance").value.trim();

  if (nilai === "" || !/^\d+$/.test(nilai)) {
    alert("Masukkan saldo awal berupa angka bulat tanpa tanda titik atau koma.");
    return;
  }

  const saldoAwal = Number(nilai);

  if (!Number.isSafeInteger(saldoAwal) || saldoAwal < 0) {
    alert("Saldo awal tidak valid.");
    return;
  }

  const sebelumnya = data.openingBalance;
  data.openingBalance = saldoAwal;

  if (!simpanData()) {
    data.openingBalance = sebelumnya;
    render();
    return;
  }

  render();
  alert("Saldo awal berhasil disimpan.");
});

$("transactionForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const type = $("type").value;
  const nilai = $("amount").value.trim();
  const note = $("note").value.trim();
  const date = $("date").value;

  if (type !== "income" && type !== "expense") {
    alert("Pilih jenis transaksi yang benar.");
    return;
  }

  if (nilai === "" || !/^\d+$/.test(nilai)) {
    alert("Masukkan jumlah uang berupa angka bulat tanpa titik atau koma.");
    return;
  }

  const amount = Number(nilai);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    alert("Jumlah uang harus lebih besar dari nol.");
    return;
  }

  if (!note) {
    alert("Keterangan transaksi wajib diisi.");
    return;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date + "T00:00:00"))
  ) {
    alert("Pilih tanggal yang valid.");
    return;
  }

  const transaksi = {
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    type,
    amount,
    note,
    date
  };

  data.transactions.push(transaksi);

  if (!simpanData()) {
    data.transactions.pop();
    return;
  }

  event.target.reset();
  $("date").value = tanggalHariIni();
  $("type").value = "income";

  render();
  alert(
    type === "income"
      ? "Pemasukan berhasil ditambahkan. Saldo bertambah."
      : "Pengeluaran berhasil dicatat. Saldo berkurang."
  );
});

$("history").addEventListener("click", (event) => {
  const tombol = event.target.closest("[data-delete]");
  if (!tombol) return;

  const id = tombol.dataset.delete;
  const indeks = data.transactions.findIndex((t) => t.id === id);

  if (indeks === -1) return;

  if (!confirm("Hapus transaksi ini? Saldo akan dihitung ulang.")) {
    return;
  }

  const [transaksi] = data.transactions.splice(indeks, 1);

  if (!simpanData()) {
    data.transactions.splice(indeks, 0, transaksi);
    return;
  }

  render();
});

$("clearHistory").addEventListener("click", () => {
  if (data.transactions.length === 0) {
    alert("Belum ada transaksi untuk dihapus.");
    return;
  }

  if (!confirm(
    "Yakin menghapus SEMUA riwayat transaksi? " +
    "Saldo awal tetap tersimpan. Tindakan ini tidak bisa dibatalkan."
  )) {
    return;
  }

  const sebelumnya = data.transactions;
  data.transactions = [];

  if (!simpanData()) {
    data.transactions = sebelumnya;
    return;
  }

  render();
  alert("Riwayat transaksi sudah dihapus.");
});

  
function validasiCadangan(cadangan) {
  if (
    !cadangan ||
    cadangan.format !== "catatan-keuangan-simple" ||
    cadangan.version !== 1 ||
    !cadangan.data ||
    !Number.isSafeInteger(cadangan.data.openingBalance) ||
    cadangan.data.openingBalance < 0 ||
    !Array.isArray(cadangan.data.transactions)
  ) {
    throw new Error("Format file cadangan tidak valid.");
  }

  if (cadangan.data.transactions.length > 100000) {
    throw new Error("Jumlah transaksi terlalu banyak.");
  }

  const ids = new Set();

  for (const t of cadangan.data.transactions) {
    if (
      !t ||
      typeof t.id !== "string" ||
      !t.id ||
      ids.has(t.id) ||
      (t.type !== "income" && t.type !== "expense") ||
      !Number.isSafeInteger(t.amount) ||
      t.amount <= 0 ||
      typeof t.note !== "string" ||
      t.note.length > 100 ||
      typeof t.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(t.date)
    ) {
      throw new Error("Ada data transaksi yang tidak valid.");
    }

    const [tahun, bulan, hari] = t.date.split("-").map(Number);
    const tanggal = new Date(tahun, bulan - 1, hari);

    if (
      tanggal.getFullYear() !== tahun ||
      tanggal.getMonth() !== bulan - 1 ||
      tanggal.getDate() !== hari
    ) {
      throw new Error("Ada tanggal transaksi yang tidak valid.");
    }

    ids.add(t.id);
  }

  return {
    openingBalance: cadangan.data.openingBalance,
    transactions: cadangan.data.transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      note: t.note,
      date: t.date
    }))
  };
}

$("backupButton").addEventListener("click", () => {
  const cadangan = {
    format: "catatan-keuangan-simple",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: data
  };

  const isi = JSON.stringify(cadangan, null, 2);
  const file = new Blob([isi], {
    type: "application/json"
  });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = "backup-keuangan-" +
    tanggalHariIni() + ".json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("restoreButton").addEventListener("click", async () => {
  const input = $("restoreFile");
  const file = input.files[0];

  if (!file) {
    alert("Pilih file cadangan terlebih dahulu.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("File terlalu besar. Maksimal 10 MB.");
    return;
  }

  let dataBaru;

  try {
    const isi = await file.text();
    const cadangan = JSON.parse(isi);
    dataBaru = validasiCadangan(cadangan);
  } catch (error) {
    alert("Cadangan gagal dibaca: " + error.message);
    return;
  }

  const setuju = confirm(
    "PERHATIAN!\n\n" +
    "Saldo awal dan seluruh transaksi saat ini akan diganti " +
    "dengan isi file cadangan.\n\n" +
    "Backup data saat ini terlebih dahulu jika masih diperlukan.\n\n" +
    "Lanjutkan pemulihan?"
  );

  if (!setuju) return;

  const dataLama = data;
  data = dataBaru;

  if (!simpanData()) {
    data = dataLama;
    return;
  }

  render();
  input.value = "";

  alert("Data berhasil dipulihkan dari file cadangan.");
});


function eksporCSV() {
  const baris = [
    ["Tanggal", "Jenis", "Keterangan", "Pemasukan (Rp)", "Pengeluaran (Rp)", "Saldo (Rp)"]
  ];

  let saldo = data.openingBalance;

  baris.push([
    "",
    "Saldo awal",
    "Saldo awal",
    "",
    "",
    saldo
  ]);

  const transaksi = [...data.transactions].sort((a, b) =>
    a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  );

  transaksi.forEach((t) => {
    const pemasukan = t.type === "income" ? t.amount : "";
    const pengeluaran = t.type === "expense" ? t.amount : "";

    saldo += t.type === "income" ? t.amount : -t.amount;

    baris.push([
      t.date,
      t.type === "income" ? "Pemasukan" : "Pengeluaran",
      t.note,
      pemasukan,
      pengeluaran,
      saldo
    ]);
  });

  // Lindungi sel teks dari interpretasi formula spreadsheet.
  function escapeCSV(nilai) {
    let teks = String(nilai ?? "");

    if (/^[\s]*[=+\-@]/.test(teks)) {
      teks = "'" + teks;
    }

    return '"' + teks.replace(/"/g, '""') + '"';
  }

   const isi = "\uFEFF" + baris
  .map((kolom) => kolom.map(escapeCSV).join(","))
  .join("\r\n");

  const blob = new Blob([isi], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "laporan-keuangan-" + tanggalHariIni() + ".csv";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("exportCSV").addEventListener("click", eksporCSV);


render();
