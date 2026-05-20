import psycopg2

conn_str = "host=ep-dark-lake-aqbqmjno-pooler.c-8.us-east-1.aws.neon.tech port=5432 dbname=RRImportaciones user=neondb_owner password=npg_srZGOUW2wV1v sslmode=require"
conn = psycopg2.connect(conn_str)
cur = conn.cursor()

# Query fractions and number of associated prices
cur.execute("""
    SELECT f."Fraccion", f."Descripcion", COUNT(p."Id") as CantidadPrecios
    FROM "FraccionesArancelarias" f
    LEFT JOIN "PreciosEstimados" p ON f."Id" = p."FraccionId"
    GROUP BY f."Fraccion", f."Descripcion"
    ORDER BY f."Fraccion";
""")

print("Fractions and Prices count in DB:")
for row in cur.fetchall():
    print(f"- {row[0]} : {row[1]} ({row[2]} prices)")

cur.close()
conn.close()
