Add-Type -Path "C:\Codigos\RRImportaciones\backend\RR.Api\bin\Debug\net10.0\Npgsql.dll"

$connStr = "Host=ep-dark-lake-aqbqmjno-pooler.c-8.us-east-1.aws.neon.tech;Port=5432;Database=RRImportaciones;Username=neondb_owner;Password=npg_srZGOUW2wV1v;sslmode=require;Trust Server Certificate=true"
$conn = New-Object Npgsql.NpgsqlConnection($connStr)
$conn.Open()

$sql = @"
SELECT f."Fraccion", f."Descripcion", COUNT(p."Id") as CantidadPrecios
FROM "FraccionesArancelarias" f
LEFT JOIN "PreciosEstimados" p ON f."Id" = p."FraccionId"
GROUP BY f."Fraccion", f."Descripcion"
ORDER BY f."Fraccion"
"@

$cmd = New-Object Npgsql.NpgsqlCommand($sql, $conn)
$reader = $cmd.ExecuteReader()

Write-Host "Fractions and Prices count in DB:"
while ($reader.Read()) {
    $fraccion = $reader["Fraccion"]
    $desc = $reader["Descripcion"]
    $count = $reader["CantidadPrecios"]
    Write-Host "- $fraccion : $desc ($count prices)"
}

$reader.Close()
$conn.Close()
