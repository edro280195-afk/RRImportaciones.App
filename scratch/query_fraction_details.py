import psycopg2

conn_str = "host=ep-dark-lake-aqbqmjno-pooler.c-8.us-east-1.aws.neon.tech port=5432 dbname=RRImportaciones user=neondb_owner password=npg_srZGOUW2wV1v sslmode=require"
conn = psycopg2.connect(conn_str)
cur = conn.cursor()

cur.execute("""
    SELECT "Fraccion", "Descripcion", "Igi", "TipoVehiculo", "Activo"
    FROM "FraccionesArancelarias"
    WHERE "Fraccion" IN ('8704.31.01', '8704.31.05');
""")

for row in cur.fetchall():
    print(f"Fraccion: {row[0]}")
    print(f"  Descripcion: {row[1]}")
    print(f"  Igi: {row[2]}")
    print(f"  TipoVehiculo: {row[3]}")
    print(f"  Activo: {row[4]}")
    print("-" * 30)

cur.close()
conn.close()
