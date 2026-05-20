# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY ["RR.Api/RR.Api.csproj", "RR.Api/"]
COPY ["RR.Application/RR.Application.csproj", "RR.Application/"]
COPY ["RR.Domain/RR.Domain.csproj", "RR.Domain/"]
COPY ["RR.Infrastructure/RR.Infrastructure.csproj", "RR.Infrastructure/"]
COPY ["RR.Migrations/RR.Migrations.csproj", "RR.Migrations/"]

RUN dotnet restore RR.Api/RR.Api.csproj

COPY . .

WORKDIR /src/RR.Api
RUN dotnet publish -c Release -o /app/publish --no-restore

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends tzdata \
    && ln -sf /usr/share/zoneinfo/America/Matamoros /etc/localtime \
    && echo "America/Matamoros" > /etc/timezone \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /app/logs

COPY --from=build /app/publish .

EXPOSE 8080

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "RR.Api.dll"]