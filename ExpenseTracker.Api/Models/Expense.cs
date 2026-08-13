namespace ExpenseTracker.Api.Models;

public class Expense
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public Group? Group { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Category { get; set; }
    public int PaidByUserId { get; set; }
    public User? PaidBy { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ExpenseParticipant> Participants { get; set; } = new List<ExpenseParticipant>();
}
