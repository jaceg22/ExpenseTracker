using ExpenseTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace ExpenseTracker.Api.Data;

public static class DbSchemaUpdater
{
    public static void Apply(AppDbContext db)
    {
        db.Database.EnsureCreated();
        EnsureInviteCodeColumn(db);
        EnsureGroupInvitesTable(db);
        BackfillMissingInviteCodes(db);
    }

    private static void EnsureInviteCodeColumn(AppDbContext db)
    {
        if (ColumnExists(db, "Groups", "InviteCode")) return;

        db.Database.ExecuteSqlRaw("ALTER TABLE Groups ADD COLUMN InviteCode TEXT NOT NULL DEFAULT ''");
    }

    private static void EnsureGroupInvitesTable(AppDbContext db)
    {
        db.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS GroupInvites (
                Id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                GroupId INTEGER NOT NULL,
                Email TEXT NOT NULL,
                CreatedByUserId INTEGER NOT NULL,
                CreatedAt TEXT NOT NULL,
                FOREIGN KEY (GroupId) REFERENCES Groups(Id) ON DELETE CASCADE,
                FOREIGN KEY (CreatedByUserId) REFERENCES Users(Id) ON DELETE RESTRICT
            )
            """);
    }

    private static void BackfillMissingInviteCodes(AppDbContext db)
    {
        var groups = db.Groups.Where(g => g.InviteCode == string.Empty).ToList();
        if (groups.Count == 0) return;

        foreach (var group in groups)
            group.InviteCode = InviteCodeGenerator.Create();

        db.SaveChanges();
    }

    private static bool ColumnExists(AppDbContext db, string table, string column)
    {
        var connection = db.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        if (!wasOpen) connection.Open();

        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = $"PRAGMA table_info({table})";
            using var reader = command.ExecuteReader();
            while (reader.Read())
            {
                if (string.Equals(reader.GetString(1), column, StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }
        finally
        {
            if (!wasOpen) connection.Close();
        }
    }
}
