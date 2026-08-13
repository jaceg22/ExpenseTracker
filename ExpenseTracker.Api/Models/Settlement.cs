namespace ExpenseTracker.Api.Models;

public class Settlement
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public Group? Group { get; set; }
    public int FromUserId { get; set; }
    public User? FromUser { get; set; }
    public int ToUserId { get; set; }
    public User? ToUser { get; set; }
    public decimal Amount { get; set; }
    public string? Note { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow;
}
