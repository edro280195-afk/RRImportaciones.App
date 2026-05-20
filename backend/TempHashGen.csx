using BCrypt.Net;
using System;

var password = "RR2026!";
var hash = BCrypt.Net.BCrypt.HashPassword(password);
Console.WriteLine(hash);
