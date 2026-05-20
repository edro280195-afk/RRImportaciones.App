import openpyxl

wb = openpyxl.load_workbook("TABULADOR 2026.xlsx", data_only=False)
sheet = wb["TABULADOR"]

for r in range(1, 30):
    row_str = f"Row {r:02d}: "
    for col_letter in ["C", "D", "E", "F"]:
        cell = sheet[f"{col_letter}{r}"]
        val = cell.value
        if val is not None:
            row_str += f"{col_letter}: {val} | "
    print(row_str)
