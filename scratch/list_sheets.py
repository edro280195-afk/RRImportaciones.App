import openpyxl

wb = openpyxl.load_workbook("TABULADOR 2026.xlsx", read_only=True)
print("Worksheet names:")
for name in wb.sheetnames:
    print(f"- {name}")
