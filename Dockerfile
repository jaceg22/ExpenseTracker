FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ExpenseTracker.Api/ExpenseTracker.Api.csproj ExpenseTracker.Api/
RUN dotnet restore ExpenseTracker.Api/ExpenseTracker.Api.csproj
COPY ExpenseTracker.Api/ ExpenseTracker.Api/
RUN dotnet publish ExpenseTracker.Api/ExpenseTracker.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "ExpenseTracker.Api.dll"]
