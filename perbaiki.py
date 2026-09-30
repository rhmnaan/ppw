import json, re, shutil

path = r"C:\Users\acer\OneDrive\Documents\DOKUMEN KULIAH\Semester 7\ppw\klasifikasi_skipgram_naive_bayes.ipynb"
shutil.copy(path, path.replace(".ipynb", "_backup.ipynb"))

nb = json.load(open(path, encoding="utf-8"))

for c in nb["cells"][19:]:               # sel ke-20 dst = Halaman 2
    if c["cell_type"] != "markdown":
        continue
    baru = []
    for baris in "".join(c["source"]).split("\n"):
        if baris.strip() == "---":        # buang garis pemisah
            continue
        if re.match(r"^#{1,5} ", baris):  # turunkan level heading
            baris = "#" + baris
        baru.append(baris)
    c["source"] = "\n".join(baru).lstrip("\n").splitlines(keepends=True)

json.dump(nb, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("selesai")