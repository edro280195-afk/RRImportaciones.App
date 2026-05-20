import openpyxl

wb_f = openpyxl.load_workbook("TABULADOR 2026.xlsx", data_only=False)
wb_v = openpyxl.load_workbook("TABULADOR 2026.xlsx", data_only=True)

sheet_f = wb_f["TABULADOR"]
sheet_v = wb_v["TABULADOR"]

for r in range(1, 30):
    row_str = f"Row {r:02d}: "
    for col_letter in ["C", "D", "E", "F", "G", "H"]:
        cell_f = sheet_f[f"{col_letter}{r}"]
        cell_v = sheet_v[f"{col_letter}{r}"]
        val_f = cell_f.value
        val_v = cell_v.value
        if val_f is not None or val_v is not None:
            row_str += f"{col_letter}: [{val_f} -> {val_v}] | "
    print(row_str)
