param(
    [string]$BaseUrl = "http://localhost:5198",
    [string]$Username = "admin",
    [string]$Password = "Stejrskal*4"
)

$ErrorActionPreference = "Stop"

$cases = @(
    @{
        Vin = "5TFNX4CN6DX028866"
        ExpectedFraccion = "8704.31.01"
        ExpectedValorUsd = 5614.00
        ExpectedCatalogoModelo = "TOYOTA TACOMA PICKUP-4CYL."
        ExpectedOrigen = "ANEXO2 PDF p47"
        ExpectedAntiguedad = 10
    },
    @{
        Vin = "1XKYD49X1JJ198000"
        ExpectedFraccion = "8701.21.01"
        ExpectedValorUsd = 91500.00
        ExpectedCatalogoModelo = "T660/680/700/800/2000/W900 BBC ALUM CAB 121`"-139`""
        ExpectedOrigen = "ANEXO2 PDF p2"
        ExpectedAntiguedad = 1
    }
)

function Assert-Equal($Name, $Expected, $Actual) {
    if ($Expected -ne $Actual) {
        throw "$Name esperado [$Expected], recibido [$Actual]"
    }
}

$loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body $loginBody
$headers = @{ Authorization = "Bearer $($login.token)" }

$results = @()
foreach ($case in $cases) {
    $body = @{
        vin = $case.Vin
        tcMargen = 0.30
        tipoTramite = "NORMAL"
    } | ConvertTo-Json

    $result = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/cotizaciones/calcular" -ContentType "application/json" -Headers $headers -Body $body

    Assert-Equal "$($case.Vin) fraccion" $case.ExpectedFraccion $result.fraccion
    Assert-Equal "$($case.Vin) valor aduana USD" ([decimal]$case.ExpectedValorUsd) ([decimal]$result.valorAduanaUsd)
    Assert-Equal "$($case.Vin) modelo catalogo" $case.ExpectedCatalogoModelo $result.precioCatalogoModelo
    Assert-Equal "$($case.Vin) origen catalogo" $case.ExpectedOrigen $result.precioCatalogoOrigen
    Assert-Equal "$($case.Vin) antiguedad" ([int]$case.ExpectedAntiguedad) ([int]$result.precioAntiguedadAnios)

    $results += [pscustomobject]@{
        Vin = $case.Vin
        Vehiculo = "$($result.marca) $($result.modelo) $($result.anno)"
        Fraccion = $result.fraccion
        ValorUsd = $result.valorAduanaUsd
        Catalogo = $result.precioCatalogoModelo
        Origen = $result.precioCatalogoOrigen
        Total = $result.total
    }
}

$results | Format-Table -AutoSize
Write-Host "Validacion de cotizador completada correctamente." -ForegroundColor Green
