
using System.Net.Http.Headers;
using System.Text.Json;

var token = "9a62dfc965616931c240996de1e75c9b4ebd396be701da64cf6fd03a81a0db0e";
var client = new HttpClient();
client.DefaultRequestHeaders.Add("Bmx-Token", token);

async Task CheckSeries(string seriesId) {
    Console.WriteLine($"Checking series {seriesId}...");
    var url = $"https://www.banxico.org.mx/SieAPIRest/service/v1/series/{seriesId}/datos/oportuno";
    var response = await client.GetAsync(url);
    var content = await response.Content.ReadAsStringAsync();
    Console.WriteLine(content);
    Console.WriteLine();
}

await CheckSeries("SF43718"); // FIX Determination
await CheckSeries("SF60653"); // Liquidación?
await CheckSeries("SF63528"); // Some sources say this is DOF
