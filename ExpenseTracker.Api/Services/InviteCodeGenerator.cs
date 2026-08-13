namespace ExpenseTracker.Api.Services;

public static class InviteCodeGenerator
{
    public static string Create() => Guid.NewGuid().ToString("N")[..12].ToLowerInvariant();
}
